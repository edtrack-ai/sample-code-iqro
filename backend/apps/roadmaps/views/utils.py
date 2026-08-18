from apps.roadmaps.models import UserTaskResult

def _unlock_next_lesson(lesson):
    from django.db.models import Q
    from apps.roadmaps.models import Lesson
    
    # Next lesson is either:
    # 1. Same week, same day, higher order_in_day
    # 2. Same week, higher day_number
    # 3. Higher week_number
    next_lesson = Lesson.objects.filter(
        roadmap=lesson.roadmap
    ).filter(
        Q(week_number=lesson.week_number, day_number=lesson.day_number, order_in_day__gt=lesson.order_in_day) |
        Q(week_number=lesson.week_number, day_number__gt=lesson.day_number) |
        Q(week_number__gt=lesson.week_number)
    ).order_by('week_number', 'day_number', 'order_in_day').first()
    
    if next_lesson and not next_lesson.is_unlocked:
        next_lesson.is_unlocked = True
        next_lesson.save(update_fields=['is_unlocked'])

def update_lesson_completion(user, lesson):
    """
    Helper to update lesson completion status based on task and quiz results.
    Completion rule: 
    - At least 2 regular tasks with avg score >= 85%
    - OR a final quiz (index 999) with score >= 80%
    """
    completed_now = False
    
    # 1. Check if final quiz exists and passed
    quiz_result = UserTaskResult.objects.filter(user=user, lesson=lesson, task_index=999).first()
    if quiz_result and quiz_result.score >= 80.0:
        lesson.is_completed = True
        lesson.score = int(quiz_result.score)
        lesson.save()
        completed_now = True

    # 2. Otherwise check regular tasks
    if not completed_now:
        all_results = UserTaskResult.objects.filter(user=user, lesson=lesson).exclude(task_index=999)
        if all_results.count() >= 2:
            avg_score = sum(r.score for r in all_results) / all_results.count()
            if avg_score >= 85.0:
                lesson.is_completed = True
                lesson.score = int(avg_score)
                lesson.save()
                completed_now = True
                
    if completed_now:
        _unlock_next_lesson(lesson)
