from django.db import models
from django.conf import settings

class Roadmap(models.Model):
    STATUS_CHOICES = (
        ('generating', 'Generating'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    )
    OWNER_PATH = 'user'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roadmaps')
    topic = models.TextField()
    selected_mode = models.CharField(max_length=15, blank=True, null=True, help_text="User selected mode for the entire roadmap")
    total_estimated_hours = models.FloatField(null=True, blank=True)
    difficulty = models.CharField(max_length=50, blank=True)
    total_lessons_count = models.PositiveIntegerField(default=0, help_text="Total lessons planned by AI")
    generated_lessons_count = models.PositiveIntegerField(default=0, help_text="Lessons created so far")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generating')
    is_hidden = models.BooleanField(default=False, help_text="Soft delete flag to hide roadmap from user view")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_error = models.TextField(blank=True, null=True, help_text="Last error message or traceback")
    sources = models.ManyToManyField('RoadmapSource', blank=True, related_name='roadmaps')

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.topic[:50]}"

class Lesson(models.Model):
    MODE_CHOICES = (
        ('MATH', 'Mathematics'),
        ('LANGUAGE', 'Language'),
        ('CODE', 'Programming'),
        ('GENERAL', 'General'),
    )
    OWNER_PATH = 'roadmap__user'

    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name='lessons')
    week_number = models.PositiveIntegerField()
    week_title = models.TextField(blank=True)
    day_number = models.PositiveIntegerField()
    order_in_day = models.PositiveIntegerField()
    title = models.TextField()
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='GENERAL')
    duration = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True, help_text="High-level summary of the lesson")
    content = models.TextField(help_text="Markdown content of the lesson", blank=True)
    PLAYGROUND_STATUS_CHOICES = (
        ('not_started', 'Not Started'),
        ('generating', 'Generating'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    )
    playground_metadata = models.JSONField(null=True, blank=True, help_text="Config for the interactive playground")
    playground_code = models.TextField(null=True, blank=True, help_text="Raw HTML/JS/CSS for the interactive simulation")
    playground_status = models.CharField(max_length=20, choices=PLAYGROUND_STATUS_CHOICES, default='not_started')
    has_playground = models.BooleanField(default=False)
    quiz = models.JSONField(null=True, blank=True, help_text="Config for the assessment quiz")
    is_unlocked = models.BooleanField(default=False)
    is_preview = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    score = models.IntegerField(null=True, blank=True)
    last_error = models.TextField(blank=True, null=True, help_text="Last error message or traceback")

    class Meta:
        ordering = ['week_number', 'day_number', 'order_in_day']
        unique_together = ('roadmap', 'week_number', 'day_number', 'order_in_day')
        indexes = [
            models.Index(fields=['roadmap', 'week_number', 'day_number']),
        ]

    def __str__(self):
        return f"W{self.week_number}D{self.day_number}.{self.order_in_day} - {self.title} ({self.mode})"

class Flashcard(models.Model):
    TYPE_CHOICES = (
        ('IMAGE_TO_TEXT', 'Image to Text'),
        ('TEXT_TO_TRANSLATION', 'Text to Translation'),
    )
    OWNER_PATH = 'user'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='flashcards')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='flashcards')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    front_content = models.TextField(help_text="URL for image or Text in target language")
    back_content = models.TextField(help_text="Text in target language or Native translation")
    phonetic = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.TextField(blank=True, null=True, help_text="Generated image Data URI or URL for visual learning")
    mastery_level = models.IntegerField(default=0, help_text="Spaced repetition tracking level")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson', 'front_content')
        indexes = [
            models.Index(fields=['user', 'mastery_level']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.front_content[:20]}..."

class UserTaskResult(models.Model):
    OWNER_PATH = 'user'
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='task_results')
    task_index = models.PositiveIntegerField()
    is_correct = models.BooleanField(default=False)
    score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'lesson', 'task_index')

class LessonInteraction(models.Model):
    OWNER_PATH = 'user'
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='interactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    selected_text = models.TextField(blank=True, help_text="Context highlight from the lesson")
    user_msg = models.TextField(help_text="User's question")
    ai_msg = models.TextField(help_text="AI's response")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Interaction on {self.lesson} by {self.user.username}"

class LessonInteractionAttachment(models.Model):
    interaction = models.ForeignKey(LessonInteraction, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='chat_attachments/%Y/%m/%d/')
    original_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50) # e.g. 'image/png', 'application/pdf'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment {self.original_name} for Interaction {self.interaction_id}"

class Review(models.Model):
    OWNER_PATH = 'user'
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Review by {self.user.username} for {self.roadmap.topic}"

class RoadmapSource(models.Model):
    SOURCE_TYPE_CHOICES = (
        ('FILE', 'File (PDF)'),
        ('URL', 'Website URL'),
        ('TEXT', 'Raw Text'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roadmap_sources')
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPE_CHOICES)
    file = models.FileField(upload_to='roadmap_sources/%Y/%m/%d/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=1000, null=True, blank=True)
    text_content = models.TextField(blank=True, help_text="Raw text or clean parsed content")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.source_type == 'FILE':
            return f"File: {self.file_name or self.file.name}"
        elif self.source_type == 'URL':
            return f"URL: {self.url}"
        return f"Text: {self.text_content[:20]}..."

class Course(models.Model):
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name='marketplace_courses')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_courses')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.PositiveIntegerField(default=0, help_text="Direct discount percentage on the course")
    banner_url = models.TextField(blank=True, help_text="Optional URL or data URI for the course banner")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class PromoCode(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='promo_codes')
    code = models.CharField(max_length=50)
    discount_percent = models.PositiveIntegerField() # e.g. 10 to 100
    is_active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('course', 'code')

    def __str__(self):
        return f"{self.code} (-{self.discount_percent}%)"

class CoursePurchase(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchased_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='purchases')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    commission_paid = models.DecimalField(max_digits=10, decimal_places=2)
    creator_earnings = models.DecimalField(max_digits=10, decimal_places=2)
    copied_roadmap = models.ForeignKey(Roadmap, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_record')
    promo_code_used = models.ForeignKey(PromoCode, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} bought {self.course.title}"
