import os
import tempfile
from google import genai
from google.genai import types
from django.db import transaction
from apps.users.models import CreditBalance, CreditTransactionLog
from apps.roadmaps.models import LessonInteraction, LessonInteractionAttachment

import logging
logger = logging.getLogger(__name__)

class GeminiChatService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else genai.Client()
            
        self.base_system_prompt = (
            "You are the Iqro AI Assistant. You have full vision and hearing capabilities. "
            "Analyze any uploaded diagrams, handwritten notes, educational PDFs, or lecture audios "
            "to provide high-quality tutoring. Explain complex concepts step-by-step. "
            "If an audio is provided, summarize the key takeaways. "
            "If the user asks questions outside the context of the lesson, politely refuse and steer them back."
        )

    def process_multimodal_chat(self, user, lesson, message: str, selected_text: str = "", uploaded_files_list=None):
        balance_obj = CreditBalance.objects.filter(user=user).first()
        if not balance_obj or balance_obj.balance <= 0.1:
            return {
                "error": "Insufficient credits. Minimum 0.1 credits required.",
                "ai_response": None
            }

        context_prompt = f"{self.base_system_prompt}\n\nLesson Context:\n{lesson.content}"
        
        gemini_uploaded_files = []
        local_temp_files = []

        try:
            contents = []
            file_meta = []
            
            if uploaded_files_list:
                for f in uploaded_files_list:
                    mime_type = getattr(f, 'content_type', 'application/octet-stream')
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.name)[1])
                    for chunk in f.chunks():
                        temp_file.write(chunk)
                    temp_file.close()
                    local_temp_files.append(temp_file.name)
                    
                    gemini_file = self.client.files.upload(
                        file=temp_file.name,
                        config={'mime_type': mime_type}
                    )
                    gemini_uploaded_files.append(gemini_file)
                    contents.append(gemini_file)
                    file_meta.append((f, mime_type))

            full_prompt = message
            if selected_text:
                full_prompt = f"Selected Text from Lesson: \"{selected_text}\"\nUser Question: {message}"
                
            contents.append(full_prompt)

            response = self.client.models.generate_content(
                model='gemini-3.1-flash-lite',
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=context_prompt
                )
            )
            
            ai_text_response = response.text
            
            total_tokens = getattr(response.usage_metadata, 'total_token_count', 0)
            if total_tokens == 0:
                logger.warning("Empty token count returned by Gemini. Defaulting to 10 for safety/logging.")
                total_tokens = 10
            
            deduction_amount = float(total_tokens) / 1000.0

            from decimal import Decimal
            attached_data = []

            with transaction.atomic():
                locked_balance = CreditBalance.objects.select_for_update().get(user=user)
                deduction_decimal = Decimal(str(deduction_amount))
                locked_balance.balance -= deduction_decimal
                locked_balance.save()
                
                CreditTransactionLog.objects.create(
                    user=user,
                    amount=-deduction_decimal,
                    description=f"Gemini Multimodal Chat ({total_tokens} tokens)"
                )
                
                interaction = LessonInteraction.objects.create(
                    user=user,
                    lesson=lesson,
                    selected_text=selected_text,
                    user_msg=message,
                    ai_msg=ai_text_response
                )
                
                # Save physical files to interaction attachments
                for f_obj, m_type in file_meta:
                    attachment = LessonInteractionAttachment.objects.create(
                        interaction=interaction,
                        file=f_obj,
                        original_name=f_obj.name,
                        file_type=m_type
                    )
                    attached_data.append({
                        "id": attachment.id,
                        "url": attachment.file.url,
                        "name": attachment.original_name,
                        "type": attachment.file_type
                    })
                
                new_balance = locked_balance.balance

            return {
                "interaction_id": interaction.id,
                "ai_response": ai_text_response,
                "usage_details": {
                    "tokens": total_tokens,
                    "credits_spent": float(deduction_decimal)
                },
                "new_balance": float(new_balance),
                "attachments": attached_data
            }

        except Exception as e:
            logger.exception("Error processing Gemini multimodal chat")
            return {
                "error": str(e),
                "ai_response": None
            }

        finally:
            for g_file in gemini_uploaded_files:
                try:
                    self.client.files.delete(name=g_file.name)
                except Exception as e:
                    logger.error(f"Failed to delete file from Gemini API: {e}")
                    
            for local_path in local_temp_files:
                try:
                    if os.path.exists(local_path):
                        os.remove(local_path)
                except Exception as e:
                    logger.error(f"Failed to delete local temp file: {local_path} - {e}")
