from django.contrib import admin
from .models import Roadmap, Lesson, LessonInteraction, Review

@admin.register(Roadmap)
class RoadmapAdmin(admin.ModelAdmin):
    list_display = ('id', 'topic', 'user', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('topic', 'user__username', 'user__email')

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('id', 'roadmap', 'week_number', 'day_number', 'order_in_day', 'title', 'is_unlocked')
    list_filter = ('is_unlocked', 'week_number', 'day_number')
    search_fields = ('title', 'roadmap__topic')

@admin.register(LessonInteraction)
class LessonInteractionAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'user', 'created_at')
    search_fields = ('user_msg', 'ai_msg', 'lesson__title')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'roadmap', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
