from rest_framework import serializers
from .models import Roadmap, Lesson, LessonInteraction, LessonInteractionAttachment, UserTaskResult, Flashcard, RoadmapSource, Course, PromoCode, CoursePurchase

class PlaygroundConfigSerializer(serializers.Serializer):
    type = serializers.CharField()
    initial_code = serializers.CharField(required=False, allow_blank=True)
    html_bundle = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.DictField(required=False)

class QuizQuestionSerializer(serializers.Serializer):
    question = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())
    correct_index = serializers.IntegerField()
    explanation = serializers.CharField()

class QuizConfigSerializer(serializers.Serializer):
    questions = QuizQuestionSerializer(many=True)

class UserTaskResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTaskResult
        fields = ['id', 'user', 'lesson', 'task_index', 'is_correct', 'score', 'created_at']

class FlashcardSerializer(serializers.ModelSerializer):
    roadmap_id = serializers.IntegerField(source='lesson.roadmap.id', read_only=True)
    roadmap_title = serializers.CharField(source='lesson.roadmap.topic', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = Flashcard
        fields = [
            'id', 'lesson', 'lesson_title', 'roadmap_id', 'roadmap_title',
            'type', 'front_content', 'back_content', 'phonetic', 'mastery_level', 'image_url'
        ]

class LessonInteractionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonInteractionAttachment
        fields = ['id', 'file', 'original_name', 'file_type', 'created_at']

class LessonInteractionSerializer(serializers.ModelSerializer):
    attachments = LessonInteractionAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = LessonInteraction
        fields = ['id', 'user', 'selected_text', 'user_msg', 'ai_msg', 'created_at', 'attachments']

class LessonSerializer(serializers.ModelSerializer):
    playground_metadata = serializers.JSONField(required=False)
    quiz = serializers.JSONField(required=False)
    interactions = LessonInteractionSerializer(many=True, read_only=True)
    last_quiz_score = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'week_number', 'week_title', 'day_number', 'order_in_day', 
            'title', 'mode', 'duration', 'description', 'content', 
            'playground_metadata', 'playground_code', 'has_playground', 'playground_status',
            'quiz', 'is_unlocked', 'is_preview', 'is_completed', 'score', 
            'interactions', 'last_quiz_score', 'last_error'
        ]

    def get_last_quiz_score(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            last_result = UserTaskResult.objects.filter(
                user=request.user, 
                lesson=obj, 
                task_index=999
            ).order_by('-created_at').first()
            return last_result.score if last_result else None
        return None

class RoadmapSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapSource
        fields = ['id', 'user', 'source_type', 'file', 'file_name', 'url', 'text_content', 'created_at']
        read_only_fields = ['user', 'created_at']

class RoadmapListSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    sources = RoadmapSourceSerializer(many=True, read_only=True)
    is_purchased = serializers.SerializerMethodField()
    is_fully_generated = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            'id', 'topic', 'total_estimated_hours', 'difficulty', 
            'status', 'created_at', 'lessons', 'total_lessons_count', 'generated_lessons_count',
            'last_error', 'sources', 'is_purchased', 'is_fully_generated'
        ]

    def get_is_purchased(self, obj):
        return obj.purchase_record.exists()

    def get_is_fully_generated(self, obj):
        if obj.status != 'ready':
            return False
        if not obj.total_lessons_count or obj.total_lessons_count != obj.generated_lessons_count:
            return False
        
        # Prefetch cache or list lessons
        lessons = obj.lessons.all()
        if not lessons:
            return False
            
        for lesson in lessons:
            if not lesson.content or not lesson.content.strip():
                return False
            if lesson.quiz is None:
                return False
                
        return True

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Prevent frontend from instantly dismissing generation due to 0 == 0 check
        if data.get('total_lessons_count') == 0 and data.get('status') == 'generating':
            data['total_lessons_count'] = None
        return data


class RoadmapDetailSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    sources = RoadmapSourceSerializer(many=True, read_only=True)

    class Meta:
        model = Roadmap
        fields = [
            'id', 'topic', 'total_estimated_hours', 'difficulty', 
            'status', 'created_at', 'lessons', 'total_lessons_count', 'generated_lessons_count',
            'last_error', 'sources'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Prevent frontend from instantly dismissing generation due to 0 == 0 check
        if data.get('total_lessons_count') == 0 and data.get('status') == 'generating':
            data['total_lessons_count'] = None
        return data


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ['id', 'course', 'code', 'discount_percent', 'is_active', 'valid_until']


class CourseSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_full_name = serializers.SerializerMethodField()
    roadmap_topic = serializers.CharField(source='roadmap.topic', read_only=True)
    lessons_count = serializers.IntegerField(source='roadmap.lessons.count', read_only=True)
    is_owned = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'roadmap', 'creator', 'creator_username', 'creator_full_name', 'roadmap_topic',
            'title', 'description', 'price', 'discount_percent', 'banner_url', 'is_published',
            'created_at', 'updated_at', 'lessons_count', 'is_owned'
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at']

    def get_creator_full_name(self, obj):
        if obj.creator:
            full = f"{obj.creator.first_name} {obj.creator.last_name}".strip()
            return full if full else obj.creator.username
        return "Noma'lum"

    def get_is_owned(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.creator == request.user or CoursePurchase.objects.filter(user=request.user, course=obj).exists()
        return False

    def validate_price(self, value):
        request = self.context.get('request')
        lang = 'uz'
        if request:
            lang = request.headers.get('Accept-Language', 'uz').lower()
            
        if value < 4.99:
            translations = {
                'uz': "Kurs narxi kamida 4.99$ bo'lishi kerak.",
                'ru': "Цена курса должна быть не менее 4.99$.",
                'en': "Price must be at least $4.99."
            }
            msg = translations.get(lang, translations.get('en', "Price must be at least $4.99."))
            raise serializers.ValidationError(msg)
        return value

    def validate(self, attrs):
        roadmap = attrs.get('roadmap') or (self.instance.roadmap if self.instance else None)
        if roadmap:
            preview_count = roadmap.lessons.filter(is_preview=True).count()
            total_count = roadmap.lessons.count()
            if total_count > 0:
                limit = max(1, int(total_count * 0.1))
                if preview_count > limit:
                    raise serializers.ValidationError(
                        f"At most 10% of lessons can be marked as preview. Your limit: {limit} lessons. Current preview lessons: {preview_count}."
                    )
        return attrs


class CoursePurchaseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    buyer_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CoursePurchase
        fields = [
            'id', 'user', 'buyer_username', 'course', 'course_title',
            'amount_paid', 'commission_paid', 'creator_earnings',
            'copied_roadmap', 'promo_code_used', 'created_at'
        ]
        read_only_fields = ['user', 'amount_paid', 'commission_paid', 'creator_earnings', 'copied_roadmap', 'created_at']


class CoursePreviewLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id', 'week_number', 'week_title', 'day_number', 'order_in_day', 
            'title', 'mode', 'duration', 'description', 'is_preview'
        ]


class CoursePreviewRoadmapSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = ['id', 'topic', 'total_estimated_hours', 'difficulty', 'total_lessons_count', 'lessons']

    def get_lessons(self, obj):
        request = self.context.get('request')
        course = self.context.get('course')
        
        is_owner = False
        if request and request.user.is_authenticated and course:
            is_owner = course.creator == request.user or CoursePurchase.objects.filter(user=request.user, course=course).exists()
            
        if is_owner:
            return LessonSerializer(obj.lessons.all(), many=True, context=self.context).data
        else:
            lessons = obj.lessons.all()
            data = []
            for lesson in lessons:
                if lesson.is_preview:
                    serialized = LessonSerializer(lesson, context=self.context).data
                else:
                    serialized = CoursePreviewLessonSerializer(lesson, context=self.context).data
                    serialized['content'] = ""
                    serialized['playground_code'] = None
                    serialized['playground_metadata'] = None
                    serialized['quiz'] = None
                    serialized['is_unlocked'] = False
                data.append(serialized)
            return data
