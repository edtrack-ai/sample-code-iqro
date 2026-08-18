from django.urls import path
from .views import roadmap_views, lesson_views, interaction_views, marketplace_views

urlpatterns = [
    # Roadmap Views
    path('roadmaps/', roadmap_views.RoadmapListView.as_view(), name='roadmap_list'),
    path('roadmaps/<int:pk>/', roadmap_views.RoadmapDetailView.as_view(), name='roadmap_detail'),
    path('roadmaps/<int:pk>/delete/', roadmap_views.RoadmapDeleteView.as_view(), name='roadmap_delete'),
    path('generate/', roadmap_views.RoadmapGenerateView.as_view(), name='generate_roadmap'),
    path('roadmaps/<int:roadmap_id>/continue/', roadmap_views.RoadmapContinueView.as_view(), name='continue_roadmap'),
    path('sources/upload/', roadmap_views.RoadmapSourceUploadView.as_view(), name='source_upload'),
    path('sources/', roadmap_views.RoadmapSourceListView.as_view(), name='source_list'),
    
    # Lesson Views
    path('lessons/<int:lesson_id>/unlock/', lesson_views.LessonUnlockView.as_view(), name='unlock_lesson'),
    path('lessons/<int:lesson_id>/set-mode/', lesson_views.LessonSetModeView.as_view(), name='set_lesson_mode'),
    path('lessons/<int:lesson_id>/stream/', lesson_views.LessonContentStreamView.as_view(), name='lesson_content_stream'),
    
    # Interaction Views
    path('lessons/<int:lesson_id>/chat/stream/', interaction_views.LessonChatStreamView.as_view(), name='lesson_chat_stream'),
    path('lessons/<int:lesson_id>/chat/multimodal/', interaction_views.MultimodalChatAPIView.as_view(), name='lesson_chat_multimodal'),
    path('lessons/<int:lesson_id>/submit-task/', interaction_views.TaskResultSubmitView.as_view(), name='submit_task_result'),
    path('lessons/<int:lesson_id>/quiz/generate/', interaction_views.QuizGenerateView.as_view(), name='generate_quiz'),
    path('lessons/<int:lesson_id>/generate-playground/', interaction_views.LessonPlaygroundGenerateView.as_view(), name='generate_playground'),
    path('v1/internal/lessons/<int:lesson_id>/playground/', interaction_views.LessonPlaygroundGenerateView.as_view(), name='internal_generate_playground'),
    path('lessons/<int:lesson_id>/quiz/submit/', interaction_views.TaskResultSubmitView.as_view(), name='submit_quiz'), # Reused TaskResultSubmitView
    path('lessons/<int:lesson_id>/history/', interaction_views.LessonChatHistoryView.as_view(), name='lesson_history'),
    path('flashcards/review/', interaction_views.FlashcardListView.as_view(), name='flashcard_review'),

    # Marketplace Views
    path('courses/', marketplace_views.CourseListCreateView.as_view(), name='course_list_create'),
    path('courses/creator-analytics/', marketplace_views.CreatorAnalyticsView.as_view(), name='creator_analytics'),
    path('courses/<int:course_id>/', marketplace_views.CourseDetailView.as_view(), name='course_detail'),
    path('courses/<int:course_id>/promo-codes/', marketplace_views.CoursePromoCodeView.as_view(), name='course_promo_codes'),
    path('courses/<int:course_id>/validate-promo/', marketplace_views.PromoCodeValidateView.as_view(), name='course_validate_promo'),
    path('courses/<int:course_id>/purchase/', marketplace_views.CoursePurchaseView.as_view(), name='course_purchase'),
    path('courses/lessons/<int:lesson_id>/edit/', marketplace_views.CourseEditView.as_view(), name='course_edit_lesson'),
    path('courses/generate-banner/', marketplace_views.CourseGenerateBannerView.as_view(), name='course_generate_banner'),
    path('courses/purchase-history/', marketplace_views.UserPurchaseHistoryView.as_view(), name='user_purchase_history'),
    path('courses/withdraw/', marketplace_views.CreatorWithdrawView.as_view(), name='creator_withdraw'),
    path('courses/flashcards/generate-image/', marketplace_views.GenerateFlashcardImagesView.as_view(), name='generate_flashcard_image'),
]
