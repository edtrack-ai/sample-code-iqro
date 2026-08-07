import os
import json
import logging
import tempfile
from google import genai
from google.genai import types
from django.conf import settings
from django.utils import timezone
from apps.roadmaps.models import Lesson, Roadmap, RoadmapSource
from apps.roadmaps.services.deepseek import RoadmapSchema, LessonContentSchema, GenerateRoadmapResponseSchema

logger = logging.getLogger(__name__)

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    return genai.Client(api_key=api_key) if api_key else genai.Client()

def generate_roadmap_with_sources(topic: str, sources: list) -> tuple[dict, int]:
    """
    Generates a structured roadmap using Gemini, utilizing custom sources (PDF, Web, Text).
    Returns (roadmap_dict, tokens_used).
    """
    client = get_gemini_client()
    
    contents = []
    gemini_files = []
    local_paths = []
    
    # 1. Process sources
    sources_text = ""
    for idx, src in enumerate(sources):
        if src.source_type == 'FILE' and src.file:
            suffix = os.path.splitext(src.file_name)[1]
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            for chunk in src.file.chunks():
                temp_file.write(chunk)
            temp_file.close()
            local_paths.append(temp_file.name)
            
            try:
                g_file = client.files.upload(
                    file=temp_file.name,
                    config={'mime_type': 'application/pdf'}
                )
                gemini_files.append(g_file)
                contents.append(g_file)
            except Exception as e:
                logger.error(f"Failed to upload PDF source {src.file_name} to Gemini: {e}")
                
        elif src.source_type == 'URL':
            sources_text += f"\n\nSource Website URL ({src.url}):\n{src.text_content}\n"
        elif src.source_type == 'TEXT':
            sources_text += f"\n\nSource Raw Text:\n{src.text_content}\n"

    if sources_text:
        contents.append(sources_text)

    # 2. Base topic instructions with steering
    if topic:
        prompt = (
            f"User Prompt/Instruction: '{topic}'\n\n"
            "INSTRUCTIONS:\n"
            "1. Construct a comprehensive learning roadmap based strictly on the attached source materials (PDF, website URLs, text).\n"
            "2. Treat the 'User Prompt/Instruction' as a steering command to guide how you extract and structure the roadmap from the sources "
            "(e.g., focusing on a specific area, adjusting the difficulty, or formatting as requested).\n"
            "3. Do NOT generate topics outside of the provided source materials unless they are directly related and requested by the user prompt.\n"
            "4. In the 'topic' field of the 'roadmap' object in the JSON response, generate a concise, professional, and descriptive title for this roadmap based on the core subject of the source materials. "
            "Examples of good titles: 'Linear Algebra for Machine Learning', 'Advanced Python Programming', 'Modern React & Next.js'. "
            "Do NOT use generic names like 'Roadmap', 'Untitled', or placeholder names like 'Roadmap from text'."
        )
    else:
        prompt = (
            "INSTRUCTIONS:\n"
            "1. Construct a comprehensive learning roadmap based strictly on the attached source materials (PDF, website URLs, text).\n"
            "2. In the 'topic' field of the 'roadmap' object in the JSON response, generate a concise, professional, and descriptive title for this roadmap summarizing the core subject/concepts of the source materials. "
            "Examples of good titles:\n"
            "   - If the source is a basic Python book: 'Python Beginner Course'\n"
            "   - If the source is about vectors/matrices: 'Linear Algebra Basics'\n"
            "   - If the source is about web development: 'React & Frontend Essentials'\n"
            "Do NOT use generic names like 'Roadmap', 'Untitled', or placeholder file names (e.g., do NOT use 'Roadmap from Python_course.pdf')."
        )
    contents.append(prompt)

    # 3. System prompt
    system_instruction = (
        "You are an expert curriculum designer. Your task is to generate a highly detailed learning roadmap "
        "consisting of modules and lessons based strictly on the provided source materials (PDF textbooks, website text, or notes). "
        "You must extract the actual educational content, chapters, and concepts from the source materials and structure them into modules. "
        "Do NOT generate general modules about 'planning', 'time management', or 'how to use this roadmap' unless they are explicitly written in the source material. "
        "Use the user's prompt to steer and focus the extraction. "
        "Provide your output as a JSON object matching the GenerateRoadmapResponseSchema configuration."
    )

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=GenerateRoadmapResponseSchema,
                temperature=0.2
            )
        )
        
        # Parse output
        roadmap_data = json.loads(response.text)
        total_tokens = getattr(response.usage_metadata, 'total_token_count', 0) or 500
        return roadmap_data, total_tokens

    except Exception as e:
        logger.exception("Error generating roadmap with Gemini")
        return {"error": str(e)}, 0
    finally:
        # Cleanup
        for g_file in gemini_files:
            try:
                client.files.delete(name=g_file.name)
            except Exception as e:
                logger.error(f"Failed to delete file from Gemini: {e}")
        for path in local_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass


def stream_lesson_content_with_sources(user, lesson_id: int, roadmap_topic: str, week_title: str, lesson_title: str, lesson_description: str, lesson_mode: str, sources: list):
    """
    Streams lesson content from Gemini using source materials as base context.
    Yields (event_type, payload) tuples.
    """
    client = get_gemini_client()
    
    contents = []
    gemini_files = []
    local_paths = []
    
    # 1. Process sources
    sources_text = ""
    for src in sources:
        if src.source_type == 'FILE' and src.file:
            suffix = os.path.splitext(src.file_name)[1]
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            for chunk in src.file.chunks():
                temp_file.write(chunk)
            temp_file.close()
            local_paths.append(temp_file.name)
            
            try:
                g_file = client.files.upload(
                    file=temp_file.name,
                    config={'mime_type': 'application/pdf'}
                )
                gemini_files.append(g_file)
                contents.append(g_file)
            except Exception as e:
                logger.error(f"Failed to upload PDF source {src.file_name} to Gemini: {e}")
        elif src.source_type == 'URL':
            sources_text += f"\n\nSource Website URL ({src.url}):\n{src.text_content}\n"
        elif src.source_type == 'TEXT':
            sources_text += f"\n\nSource Raw Text:\n{src.text_content}\n"

    if sources_text:
        contents.append(sources_text)

    # 2. Define standard system instructions
    system_instruction = (
        f"You are the Iqro AI {lesson_mode} Specialist. Write detailed lesson content in Markdown "
        "based strictly on the provided source materials (PDF, web pages, or notes). Include clear headings, explanations, "
        "practical examples, and exercises. IMPORTANT: Maintain strict alignment with the source material and respond "
        "exclusively in the same language as the roadmap topic or source material. "
        "Do NOT write any raw HTML tags (such as <details>, <summary>, <p>, <div>, etc.) under any circumstances. "
        "If you write exercises, write the questions and provide the answers clearly using standard Markdown syntax (such as blockquotes like '> **Javob:**' or list formatting)."
    )

    prompt = f"""
    Roadmap Topic: {roadmap_topic}
    Lesson Title: {lesson_title}
    Lesson Description: {lesson_description}
    Mode: {lesson_mode}
    
    Generate the lesson content in markdown format. Do not return JSON. Write the lesson contents directly as a markdown body.
    """
    contents.append(prompt)

    try:
        response_stream = client.models.generate_content_stream(
            model='gemini-3.1-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
        )

        accumulated_content = ""
        for chunk in response_stream:
            text = chunk.text
            if text:
                accumulated_content += text
                yield 'chunk', {'content': text}
                
        # PERSIST CONTENT TO DB
        if accumulated_content:
            Lesson.objects.filter(id=lesson_id).update(
                content=accumulated_content,
                is_unlocked=True
            )
            
            # Trigger metadata extraction and playground generation
            from apps.roadmaps.tasks import generate_lesson_metadata_task, generate_playground_task
            lesson_obj = Lesson.objects.get(id=lesson_id)
            # if lesson_obj.playground_status == 'not_started':
            #     generate_playground_task.delay(lesson_id)
            generate_lesson_metadata_task.delay(lesson_id)

        # Deduct credits (estimate based on character count)
        total_tokens = int(len(accumulated_content) / 4) + 100
        
        from apps.users.utils import deduct_credits_by_tokens
        deduct_credits_by_tokens(
            user=user,
            total_tokens=total_tokens,
            description=f"Lesson: {lesson_title}"
        )
        
        yield 'done', {}

    except Exception as e:
        logger.exception("Error streaming lesson content with Gemini")
        yield 'error', {'detail': str(e)}
        
    finally:
        # Cleanup
        for g_file in gemini_files:
            try:
                client.files.delete(name=g_file.name)
            except Exception as e:
                logger.error(f"Failed to delete file from Gemini: {e}")
        for path in local_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass
