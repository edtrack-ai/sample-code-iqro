from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from decimal import Decimal
import os
import logging
import base64
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

from apps.roadmaps.models import Roadmap, Lesson, Course, PromoCode, CoursePurchase, Flashcard
from apps.roadmaps.serializers import (
    CourseSerializer, 
    PromoCodeSerializer, 
    CoursePurchaseSerializer, 
    CoursePreviewRoadmapSerializer
)

class CourseListCreateView(APIView):
    """
    List all published courses or create a new course listing.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        courses = Course.objects.filter(is_published=True).order_by('-created_at')
        serializer = CourseSerializer(courses, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = CourseSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            roadmap = serializer.validated_data['roadmap']
            
            lang = request.headers.get('Accept-Language', 'uz').lower()
            def get_detail(key):
                translations = {
                    'own_roadmap': {
                        'uz': "Ushbu roadmap sizga tegishli emas.",
                        'ru': "Эта дорожная карта вам не принадлежит.",
                        'en': "You do not own this roadmap."
                    },
                    'resell_forbidden': {
                        'uz': "Sotib olingan darsliklarni qayta sotuvga qo'yish taqiqlanadi!",
                        'ru': "Запрещено перепродавать купленные учебники!",
                        'en': "You cannot publish a purchased course roadmap for sale."
                    },
                    'incomplete_roadmap': {
                        'uz': "Roadmap generatsiyasi hali to'liq tugallanmagan!",
                        'ru': "Генерация дорожной карты еще не полностью завершена!",
                        'en': "Roadmap generation is not fully completed yet!"
                    },
                    'incomplete_lessons': {
                        'uz': "Darslar yoki ularning testlari to'liq generatsiya qilinmagan!",
                        'ru': "Уроки или тесты сгенерированы не полностью!",
                        'en': "Lessons or their quizzes are not fully generated!"
                    }
                }
                return translations.get(key, {}).get(lang, translations.get(key, {}).get('en', 'Error'))

            # Verify request.user owns the roadmap
            if roadmap.user != request.user:
                return Response({'detail': get_detail('own_roadmap')}, status=status.HTTP_403_FORBIDDEN)
                
            # Verify the roadmap was not copied from a course purchase
            if roadmap.purchase_record.exists():
                return Response({'detail': get_detail('resell_forbidden')}, status=status.HTTP_400_BAD_REQUEST)
                
            # Verify the roadmap is fully generated (lessons and quizzes complete)
            if roadmap.status != 'ready' or not roadmap.total_lessons_count or roadmap.total_lessons_count != roadmap.generated_lessons_count:
                return Response({'detail': get_detail('incomplete_roadmap')}, status=status.HTTP_400_BAD_REQUEST)
                
            lessons = roadmap.lessons.all()
            if not lessons or any(not l.content or not l.content.strip() or l.quiz is None for l in lessons):
                return Response({'detail': get_detail('incomplete_lessons')}, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save(creator=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CourseDetailView(APIView):
    """
    Get course preview details (with redacted non-preview lessons).
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        course_data = CourseSerializer(course, context={'request': request}).data
        
        # Serialize the roadmap structure securely
        roadmap_serializer = CoursePreviewRoadmapSerializer(
            course.roadmap, 
            context={'request': request, 'course': course}
        )
        course_data['roadmap_details'] = roadmap_serializer.data
        return Response(course_data)

    def delete(self, request, course_id):
        if not request.user.is_authenticated:
            return Response({'detail': "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        course = get_object_or_404(Course, id=course_id)
        if course.creator != request.user:
            return Response({'detail': "You do not own this course listing."}, status=status.HTTP_403_FORBIDDEN)
        course.delete()
        return Response({'detail': "Course listing deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def put(self, request, course_id):
        if not request.user.is_authenticated:
            return Response({'detail': "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        course = get_object_or_404(Course, id=course_id)
        if course.creator != request.user:
            return Response({'detail': "You do not own this course listing."}, status=status.HTTP_403_FORBIDDEN)
            
        title = request.data.get('title')
        description = request.data.get('description')
        price = request.data.get('price')
        discount_percent = request.data.get('discount_percent')
        banner_url = request.data.get('banner_url')
        
        if title is not None:
            course.title = title
        if description is not None:
            course.description = description
        if price is not None:
            try:
                price_val = Decimal(str(price))
                if price_val < Decimal('4.99'):
                    lang = request.headers.get('Accept-Language', 'uz').lower()
                    translations = {
                        'uz': "Kurs narxi kamida 4.99$ bo'lishi kerak.",
                        'ru': "Цена курса должна быть не менее 4.99$.",
                        'en': "Price must be at least 4.99 USD."
                    }
                    msg = translations.get(lang, translations.get('en', "Price must be at least 4.99 USD."))
                    return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)
                course.price = price_val
            except Exception:
                return Response({'detail': "Invalid price format."}, status=status.HTTP_400_BAD_REQUEST)
        if discount_percent is not None:
            try:
                dp = int(discount_percent)
                if not (0 <= dp <= 100):
                    raise ValueError()
                course.discount_percent = dp
            except ValueError:
                return Response({'detail': "Discount percent must be between 0 and 100."}, status=status.HTTP_400_BAD_REQUEST)
        if banner_url is not None:
            course.banner_url = banner_url
            
        course.save()
        serializer = CourseSerializer(course, context={'request': request})
        return Response(serializer.data)


class PromoCodeValidateView(APIView):
    """
    Validate a promo code for a course and return the discounted price.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        code_str = request.data.get('code', '').strip()
        course = get_object_or_404(Course, id=course_id)
        
        if not code_str:
            return Response({'detail': "Coupon code is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        promo = PromoCode.objects.filter(course=course, code=code_str, is_active=True).first()
        if not promo:
            return Response({'detail': "Invalid or inactive promo code."}, status=status.HTTP_404_NOT_FOUND)
            
        if promo.valid_until and promo.valid_until < timezone.now():
            return Response({'detail': "This promo code has expired."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Apply course direct discount first
        base_price = course.price
        if course.discount_percent > 0:
            direct_discount = (course.price * Decimal(course.discount_percent)) / Decimal(100)
            base_price = max(Decimal(0.00), course.price - direct_discount)

        discount_percent = promo.discount_percent
        discount_amount = (base_price * Decimal(discount_percent)) / Decimal(100)
        final_price = max(Decimal(0.00), base_price - discount_amount)
        
        return Response({
            'valid': True,
            'code': promo.code,
            'discount_percent': discount_percent,
            'discount_amount': str(discount_amount),
            'final_price': str(final_price),
            'promo_id': promo.id
        })


class CoursePurchaseView(APIView):
    """
    Processes course purchases (ATMOS Mock Payment).
    Copies course/roadmap and distributes earnings to creator.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        user = request.user
        
        # Verify user doesn't already own the course
        if course.creator == user:
            return Response({'detail': "You are the creator of this course."}, status=status.HTTP_400_BAD_REQUEST)
        if CoursePurchase.objects.filter(user=user, course=course).exists():
            return Response({'detail': "You have already purchased this course."}, status=status.HTTP_400_BAD_REQUEST)
            
        promo_id = request.data.get('promo_id')
        promo = None
        
        # Apply course direct discount first
        base_price = course.price
        if course.discount_percent > 0:
            direct_discount = (course.price * Decimal(course.discount_percent)) / Decimal(100)
            base_price = max(Decimal(0.00), course.price - direct_discount)
            
        final_price = base_price
        
        if promo_id:
            promo = PromoCode.objects.filter(id=promo_id, course=course, is_active=True).first()
            if promo:
                if not (promo.valid_until and promo.valid_until < timezone.now()):
                    discount = (base_price * Decimal(promo.discount_percent)) / Decimal(100)
                    final_price = max(Decimal(0.00), base_price - discount)

        # Split commission (20% commission, 80% to creator)
        commission = (final_price * Decimal(20)) / Decimal(100)
        creator_earnings = final_price - commission

        # Perform atomic purchase & copy operations
        with transaction.atomic():
            # 1. Duplicate Roadmap and Lessons
            copied_roadmap = self._duplicate_roadmap(course.roadmap, user)
            
            # 2. Record purchase
            purchase = CoursePurchase.objects.create(
                user=user,
                course=course,
                amount_paid=final_price,
                commission_paid=commission,
                creator_earnings=creator_earnings,
                copied_roadmap=copied_roadmap,
                promo_code_used=promo
            )
            
            # 3. Add earnings to creator balance
            creator = course.creator
            creator.creator_balance += creator_earnings
            creator.save(update_fields=['creator_balance'])

        return Response({
            'detail': "Purchase successful. Course has been added to your dashboard.",
            'purchase_id': purchase.id,
            'roadmap_id': copied_roadmap.id
        }, status=status.HTTP_200_OK)

    def _duplicate_roadmap(self, original_roadmap, target_user):
        from apps.roadmaps.models import Roadmap, Lesson, Flashcard
        
        new_roadmap = Roadmap.objects.create(
            user=target_user,
            topic=original_roadmap.topic,
            selected_mode=original_roadmap.selected_mode,
            total_estimated_hours=original_roadmap.total_estimated_hours,
            difficulty=original_roadmap.difficulty,
            total_lessons_count=original_roadmap.total_lessons_count,
            generated_lessons_count=original_roadmap.generated_lessons_count,
            status='ready'
        )
        
        for source in original_roadmap.sources.all():
            new_roadmap.sources.add(source)
            
        lesson_mapping = {}
        for lesson in original_roadmap.lessons.all():
            new_lesson = Lesson.objects.create(
                roadmap=new_roadmap,
                week_number=lesson.week_number,
                week_title=lesson.week_title,
                day_number=lesson.day_number,
                order_in_day=lesson.order_in_day,
                title=lesson.title,
                mode=lesson.mode,
                duration=lesson.duration,
                description=lesson.description,
                content=lesson.content,
                playground_metadata=lesson.playground_metadata,
                playground_code=lesson.playground_code,
                playground_status=lesson.playground_status,
                has_playground=lesson.has_playground,
                quiz=lesson.quiz,
                is_unlocked=True, # All purchased lessons are unlocked by default
                is_completed=False,
                score=None
            )
            lesson_mapping[lesson.id] = new_lesson
            
        for flashcard in Flashcard.objects.filter(lesson__roadmap=original_roadmap):
            new_lesson = lesson_mapping.get(flashcard.lesson_id)
            if new_lesson:
                Flashcard.objects.create(
                    user=target_user,
                    lesson=new_lesson,
                    type=flashcard.type,
                    front_content=flashcard.front_content,
                    back_content=flashcard.back_content,
                    phonetic=flashcard.phonetic,
                    mastery_level=0
                )
                
        return new_roadmap


class CourseEditView(APIView):
    """
    Allow creators to update lesson details, contents, and preview toggles.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Verify the request.user owns the roadmap containing this lesson
        if lesson.roadmap.user != request.user:
            return Response({'detail': "You do not own this course."}, status=status.HTTP_403_FORBIDDEN)
            
        content = request.data.get('content')
        title = request.data.get('title')
        description = request.data.get('description')
        is_preview = request.data.get('is_preview')
        quiz = request.data.get('quiz')
        
        if content is not None:
            lesson.content = content
        if title is not None:
            lesson.title = title
        if description is not None:
            lesson.description = description
        if is_preview is not None:
            # Check 10% preview limit
            preview_count = lesson.roadmap.lessons.filter(is_preview=True).exclude(id=lesson.id).count()
            if is_preview:
                preview_count += 1
            total_count = lesson.roadmap.lessons.count()
            limit = max(1, int(total_count * 0.1))
            if preview_count > limit:
                return Response({
                    'detail': f"Limit exceeded. You can mark at most {limit} lessons as preview."
                }, status=status.HTTP_400_BAD_REQUEST)
            lesson.is_preview = is_preview
        if quiz is not None:
            lesson.quiz = quiz
            
        lesson.save()
        return Response({'detail': "Lesson updated successfully."})


def wrap_text(text, max_chars=18):
    words = text.split()
    lines = []
    current_line = []
    current_len = 0
    for word in words:
        if current_len + len(word) + (1 if current_line else 0) <= max_chars:
            current_line.append(word)
            current_len += len(word) + (1 if current_line else 0)
        else:
            lines.append(" ".join(current_line))
            current_line = [word]
            current_len = len(word)
    if current_line:
        lines.append(" ".join(current_line))
    return lines


def get_topic_svg_graphic(topic, title):
    topic_lower = (topic + " " + title).lower()
    if "sql" in topic_lower or "database" in topic_lower or "db" in topic_lower:
        return (
            '<g transform="translate(580, 160)" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" opacity="0.25">'
            '<path d="M 0,20 C 0,5 90,5 90,20 C 90,35 0,35 0,20 Z" />'
            '<path d="M 0,20 L 0,55 C 0,70 90,70 90,55 L 90,20" />'
            '<path d="M 0,55 L 0,90 C 0,105 90,105 90,90 L 90,55" />'
            '<line x1="20" y1="20" x2="70" y2="20" stroke-dasharray="3 5" />'
            '<line x1="20" y1="55" x2="70" y2="55" stroke-dasharray="3 5" />'
            '</g>'
        )
    elif "linear algebra" in topic_lower or "algebra" in topic_lower or "vector" in topic_lower or "matrix" in topic_lower or "math" in topic_lower:
        return (
            '<g transform="translate(580, 160)" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">'
            '<line x1="-30" y1="80" x2="90" y2="80" />'
            '<line x1="0" y1="110" x2="0" y2="-10" />'
            '<line x1="-30" y1="110" x2="70" y2="10" />'
            '<path d="M 0,80 L 60,20" stroke-width="6" />'
            '<polygon points="60,20 50,30 55,35" fill="white" />'
            '</g>'
        )
    elif "ai" in topic_lower or "machine learning" in topic_lower or "neural" in topic_lower or "deep learning" in topic_lower:
        return (
            '<g transform="translate(560, 160)" fill="white" stroke="white" stroke-width="3" opacity="0.25">'
            '<circle cx="0" cy="20" r="10" />'
            '<circle cx="0" cy="80" r="10" />'
            '<circle cx="60" cy="0" r="10" />'
            '<circle cx="60" cy="50" r="10" />'
            '<circle cx="60" cy="100" r="10" />'
            '<circle cx="120" cy="50" r="10" />'
            '<line x1="0" y1="20" x2="60" y2="0" stroke-width="2" />'
            '<line x1="0" y1="20" x2="60" y2="50" stroke-width="2" />'
            '<line x1="0" y1="80" x2="60" y2="50" stroke-width="2" />'
            '<line x1="0" y1="80" x2="60" y2="100" stroke-width="2" />'
            '<line x1="60" y1="0" x2="120" y2="50" stroke-width="2" />'
            '<line x1="60" y1="50" x2="120" y2="50" stroke-width="2" />'
            '<line x1="60" y1="100" x2="120" y2="50" stroke-width="2" />'
            '</g>'
        )
    elif "python" in topic_lower or "programming" in topic_lower or "coding" in topic_lower or "javascript" in topic_lower or "html" in topic_lower:
        return (
            '<g transform="translate(580, 160)" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">'
            '<path d="M 25,10 L 5,30 L 25,50" />'
            '<path d="M 60,10 L 80,30 L 60,50" />'
            '<line x1="55" y1="5" x2="30" y2="55" />'
            '</g>'
        )
    return (
        '<g transform="translate(560, 160)" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">'
        '<path d="M 0,60 C 20,45 45,45 65,60 C 85,45 110,45 130,60" />'
        '<path d="M 0,15 L 0,60" />'
        '<path d="M 65,20 L 65,65" />'
        '<path d="M 130,15 L 130,60" />'
        '<path d="M 0,15 C 20,0 45,0 65,15 C 85,0 110,0 130,15" />'
        '<circle cx="30" cy="-25" r="2" fill="white" stroke="none" />'
        '<circle cx="100" cy="-20" r="3" fill="white" stroke="none" />'
        '</g>'
    )


class CourseGenerateBannerView(APIView):
    """
    Generates a minimalistic SVG/CSS-gradient banner.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        title = request.data.get('title', 'Learning Path')
        topic = request.data.get('topic', 'General')
        
        # 1. Try to generate a real AI banner using Gemini Image Generation model (gemini-3.1-flash-image)
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                prompt = (
                    f"A minimalist, professional and modern course cover banner for '{title}' (Topic: {topic}). "
                    f"Clean flat illustration, vector graphic style, premium tech company aesthetic, elegant academic learning imagery. "
                    f"No realistic human faces, no complex photos. High quality, 16:9 ratio, abstract design elements."
                )
                interaction = client.interactions.create(
                    model="gemini-3.1-flash-image",
                    input=prompt,
                )
                if interaction.output_image and interaction.output_image.data:
                    data_uri = f"data:image/png;base64,{interaction.output_image.data}"
                    return Response({'banner_url': data_uri})
            except Exception as e:
                logger.warning(f"Gemini image generation failed: {e}. Falling back to default SVG gradient banner.")
        
        # 2. Fallback: generate a gorgeous, clean SVG/CSS gradient banner with topic visual and wrapped text
        colors = [
            ("#1A3A2B", "#0C1F15"),  # Emerald dark
            ("#0F172A", "#1E293B"),  # Slate slate
            ("#311042", "#581C87"),  # Deep violet
            ("#064E3B", "#047857"),  # Rich teal
            ("#1F2937", "#111827"),  # Charcoal black
        ]
        color_idx = abs(hash(topic)) % len(colors)
        start_col, end_col = colors[color_idx]
        
        # Determine visual graphic vector dynamically based on topic
        graphic_vector = get_topic_svg_graphic(topic, title)
        
        # Word wrap calculations
        lines = wrap_text(title, max_chars=18)
        font_size = 40 if len(lines) <= 1 else (34 if len(lines) <= 2 else 28)
        
        # Build text span tags
        tspan_tags = ""
        for i, line in enumerate(lines[:3]): # Max 3 lines to fit beautifully
            dy = 0 if i == 0 else (font_size + 10)
            tspan_tags += f'<tspan x="0" dy="{dy}">{line}</tspan>'
            
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">'
            f'<defs>'
            f'<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">'
            f'<stop offset="0%" style="stop-color:{start_col};stop-opacity:1" />'
            f'<stop offset="100%" style="stop-color:{end_col};stop-opacity:1" />'
            f'</linearGradient>'
            f'</defs>'
            f'<rect width="100%" height="100%" fill="url(#grad)" />'
            f'<circle cx="150" cy="150" r="120" fill="white" opacity="0.04" />'
            f'<circle cx="680" cy="220" r="200" fill="white" opacity="0.02" />'
            f'{graphic_vector}'
            f'<g transform="translate(60, 160)">'
            f'<text x="0" y="0" fill="white" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" letter-spacing="2.5" opacity="0.6" text-transform="uppercase">{topic}</text>'
            f'<text x="0" y="55" fill="white" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="{font_size}" font-weight="900" letter-spacing="-0.5">'
            f'{tspan_tags}'
            f'</text>'
            f'</g>'
            f'</svg>'
        )
        encoded_svg = base64.b64encode(svg.encode('utf-8')).decode('utf-8')
        data_uri = f"data:image/svg+xml;base64,{encoded_svg}"
        
        return Response({'banner_url': data_uri})


class CreatorAnalyticsView(APIView):
    """
    Returns marketplace analytics, active listings, and sales log for the logged-in creator.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        courses = Course.objects.filter(creator=user).order_by('-created_at')
        purchases = CoursePurchase.objects.filter(course__creator=user).order_by('-created_at')

        # Total Stats
        total_earnings = float(user.creator_balance)
        total_courses_count = courses.count()
        total_sales_count = purchases.count()

        # Active Course Listings Details
        courses_data = []
        for course in courses:
            course_purchases = purchases.filter(course=course)
            course_revenue = sum(p.creator_earnings for p in course_purchases)
            promos = PromoCode.objects.filter(course=course, is_active=True)
            
            courses_data.append({
                'id': course.id,
                'title': course.title,
                'price': float(course.price),
                'banner_url': course.banner_url,
                'created_at': course.created_at.isoformat(),
                'sales_count': course_purchases.count(),
                'total_revenue': float(course_revenue),
                'promos': [{
                    'id': p.id,
                    'code': p.code,
                    'discount_percent': p.discount_percent,
                    'is_active': p.is_active
                } for p in promos]
            })

        # Detailed Sales Log (sales log by day/hour)
        sales_log = []
        for p in purchases:
            sales_log.append({
                'id': p.id,
                'course_title': p.course.title,
                'purchaser_username': p.user.username,
                'amount_paid': float(p.amount_paid),
                'creator_earnings': float(p.creator_earnings),
                'promo_used': p.promo_code_used.code if p.promo_code_used else None,
                'created_at': p.created_at.isoformat()
            })

        return Response({
            'total_earnings': total_earnings,
            'total_courses_count': total_courses_count,
            'total_sales_count': total_sales_count,
            'courses': courses_data,
            'sales_log': sales_log
        })


class CoursePromoCodeView(APIView):
    """
    Manage promo codes for a course.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        if course.creator != request.user:
            return Response({'detail': "You do not own this course."}, status=status.HTTP_403_FORBIDDEN)

        code_str = request.data.get('code', '').strip().upper()
        discount_percent = request.data.get('discount_percent')

        if not code_str or discount_percent is None:
            return Response({'detail': "Code and discount_percent are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount_percent = int(discount_percent)
            if not (1 <= discount_percent <= 100):
                raise ValueError()
        except ValueError:
            return Response({'detail': "Discount percent must be an integer between 1 and 100."}, status=status.HTTP_400_BAD_REQUEST)

        # Create or update active status
        promo, created = PromoCode.objects.update_or_create(
            course=course,
            code=code_str,
            defaults={'discount_percent': discount_percent, 'is_active': True}
        )

        return Response({
            'id': promo.id,
            'code': promo.code,
            'discount_percent': promo.discount_percent,
            'is_active': promo.is_active,
            'detail': "Promo code created successfully." if created else "Promo code updated successfully."
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, course_id):
        # Allow deactivating/deleting promo code
        promo_id = request.data.get('promo_id')
        if not promo_id:
            return Response({'detail': "Promo ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        promo = get_object_or_404(PromoCode, id=promo_id, course__id=course_id)
        if promo.course.creator != request.user:
            return Response({'detail': "You do not own this course."}, status=status.HTTP_403_FORBIDDEN)

        promo.delete()
        return Response({'detail': "Promo code deleted successfully."}, status=status.HTTP_200_OK)


class UserPurchaseHistoryView(APIView):
    """
    List purchase history for the logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchases = CoursePurchase.objects.filter(user=request.user).order_by('-created_at')
        serializer = CoursePurchaseSerializer(purchases, many=True, context={'request': request})
        return Response(serializer.data)


class CreatorWithdrawView(APIView):
    """
    Simulates withdrawing balance from creator balance to card.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount')
        lang = request.headers.get('Accept-Language', 'uz').lower()

        def get_detail(key, **kwargs):
            translations = {
                'invalid_amount': {
                    'uz': "Yechib olinadigan pul miqdori noto'g'ri ko'rsatilgan.",
                    'ru': "Некорректная сумма для вывода.",
                    'en': "Invalid withdrawal amount."
                },
                'insufficient_funds': {
                    'uz': "Balansda yetarli mablag' mavjud emas.",
                    'ru': "Недостаточно средств на балансе.",
                    'en': "Insufficient creator balance."
                },
                'success': {
                    'uz': "{amount}$ miqdoridagi daromad muvaffaqiyatli yechib olindi (Mock).",
                    'ru': "Вывод {amount}$ успешно симулирован!",
                    'en': "Withdrawal of {amount}$ simulated successfully!"
                }
            }
            tmpl = translations.get(key, {}).get(lang, translations.get(key, {}).get('en', 'Error'))
            return tmpl.format(**kwargs)

        try:
            val = Decimal(str(amount))
            if val <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'detail': get_detail('invalid_amount')}, status=status.HTTP_400_BAD_REQUEST)

        if user.creator_balance < val:
            return Response({'detail': get_detail('insufficient_funds')}, status=status.HTTP_400_BAD_REQUEST)

        # Subtract balance (simulate withdrawal)
        user.creator_balance -= val
        user.save(update_fields=['creator_balance'])

        return Response({
            'detail': get_detail('success', amount=str(val)),
            'new_balance': float(user.creator_balance)
        }, status=status.HTTP_200_OK)


class GenerateFlashcardImagesView(APIView):
    """
    Generates images using Gemini image generation model for Flashcards.
    Allows either single flashcard image generation or bulk generation for all flashcards in a lesson.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lesson_id = request.data.get('lesson_id')
        flashcard_id = request.data.get('flashcard_id')
        
        lang = request.headers.get('Accept-Language', 'uz').lower()
        def get_msg(key, **kwargs):
            messages = {
                'lesson_required': {
                    'uz': "Dars ID si ko'rsatilmadi.",
                    'ru': "ID урока не указан.",
                    'en': "Lesson ID is required."
                },
                'service_unavailable': {
                    'uz': "Xizmatda vaqtincha xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
                    'ru': "Сервис временно недоступен. Пожалуйста, попробуйте позже.",
                    'en': "Service temporarily unavailable. Please try again later."
                },
                'single_success': {
                    'uz': "Kartochka rasmi muvaffaqiyatli yaratildi.",
                    'ru': "Изображение для карточки успешно сгенерировано.",
                    'en': "Flashcard image generated successfully."
                },
                'single_failed': {
                    'uz': "Rasm yaratishda xatolik yuz berdi. Qayta urinib ko'ring.",
                    'ru': "Ошибка при генерации изображения. Попробуйте снова.",
                    'en': "Image generation failed. Please try again."
                },
                'no_flashcards': {
                    'uz': "Ushbu dars uchun kartochkalar topilmadi.",
                    'ru': "Карточки для этого урока не найдены.",
                    'en': "No flashcards found for this lesson."
                },
                'bulk_result': {
                    'uz': f"Rasm yaratish yakunlandi: {kwargs.get('succeeded', 0)} ta muvaffaqiyatli, {kwargs.get('failed', 0)} ta xato.",
                    'ru': f"Генерация изображений завершена: {kwargs.get('succeeded', 0)} успешно, {kwargs.get('failed', 0)} ошибок.",
                    'en': f"Processed image generation: {kwargs.get('succeeded', 0)} succeeded, {kwargs.get('failed', 0)} failed."
                }
            }
            msg_dict = messages.get(key, {})
            return msg_dict.get(lang, msg_dict.get('en', ''))

        if not lesson_id:
            return Response({'detail': get_msg('lesson_required')}, status=status.HTTP_400_BAD_REQUEST)
            
        lesson = get_object_or_404(Lesson, id=lesson_id, roadmap__user=request.user)
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.error("Configuration Error: GEMINI_API_KEY is missing from environment variables.")
            return Response({'detail': get_msg('service_unavailable')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        def generate_image_for_word(word_to_illustrate):
            clean_word = (word_to_illustrate or "").strip()
            if not clean_word:
                clean_word = "object"
                
            prompt = (
                f"A clean, simple visual flashcard style illustration of a single object: '{clean_word}'. "
                f"Highly recognizable, minimalist design on a clean solid white background, "
                f"educational clip art vector style, perfect for vocabulary building. 1:1 square ratio."
            )
            
            client = genai.Client(api_key=api_key)
            
            # 1. Try Gemini 3.1 Flash Image model via Google GenAI SDK
            try:
                interaction = client.interactions.create(
                    model="gemini-3.1-flash-image",
                    input=prompt,
                )
                if hasattr(interaction, 'output_image') and interaction.output_image and hasattr(interaction.output_image, 'data'):
                    return f"data:image/png;base64,{interaction.output_image.data}"
            except Exception as e:
                logger.warning(f"Gemini 3.1 Flash Image failed for '{clean_word}': {e}")
                
            # 2. Try Imagen 3.0 via Google GenAI SDK
            try:
                res = client.models.generate_images(
                    model='imagen-3.0-generate-002',
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/png",
                        aspect_ratio="1:1"
                    )
                )
                if res.generated_images:
                    img_bytes = res.generated_images[0].image.image_bytes
                    encoded = base64.b64encode(img_bytes).decode('utf-8')
                    return f"data:image/png;base64,{encoded}"
            except Exception as e2:
                logger.warning(f"Imagen 3.0 failed for '{clean_word}': {e2}")

            raise Exception(f"Gemini AI flashcard image generation failed for '{clean_word}'.")

        # Single flashcard image generation
        if flashcard_id:
            flashcard = get_object_or_404(Flashcard, id=flashcard_id, lesson=lesson, user=request.user)
            # Use back_content (which is the native translation/word) for image prompt
            word_to_illustrate = flashcard.back_content
            try:
                img_data_uri = generate_image_for_word(word_to_illustrate)
                flashcard.image_url = img_data_uri
                flashcard.save(update_fields=['image_url'])
                from apps.roadmaps.serializers import FlashcardSerializer
                return Response({
                    'detail': get_msg('single_success'),
                    'flashcard': FlashcardSerializer(flashcard).data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Failed to generate image for flashcard {flashcard_id}: {e}", exc_info=True)
                return Response({'detail': get_msg('single_failed')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Bulk generation for all flashcards of the lesson
        flashcards = Flashcard.objects.filter(lesson=lesson, user=request.user)
        if not flashcards.exists():
            return Response({'detail': get_msg('no_flashcards')}, status=status.HTTP_400_BAD_REQUEST)
            
        success_count = 0
        failed_count = 0
        for flashcard in flashcards:
            if not flashcard.image_url:
                try:
                    img_data_uri = generate_image_for_word(flashcard.back_content)
                    flashcard.image_url = img_data_uri
                    flashcard.save(update_fields=['image_url'])
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to generate image for flashcard {flashcard.id}: {e}")
                    failed_count += 1
                    
        from apps.roadmaps.serializers import FlashcardSerializer
        updated_flashcards = Flashcard.objects.filter(lesson=lesson, user=request.user)
        return Response({
            'detail': get_msg('bulk_result', succeeded=success_count, failed=failed_count),
            'flashcards': FlashcardSerializer(updated_flashcards, many=True).data
        }, status=status.HTTP_200_OK)
