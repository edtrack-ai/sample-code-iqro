from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch
from apps.roadmaps.models import Roadmap, Lesson
from apps.roadmaps.tasks import generate_roadmap_task
from apps.users.models import CreditBalance

User = get_user_model()

class RoadmapTaskTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser@example.com', password='password123')
        # Ensure user has credits
        CreditBalance.objects.update_or_create(user=self.user, defaults={'balance': 10})
        
        self.roadmap = Roadmap.objects.create(
            user=self.user,
            topic='Python Basics',
            status='generating'
        )

    @patch('apps.roadmaps.tasks.generate_roadmap_json')
    def test_generate_roadmap_task_success(self, mock_generate_json):
        # Mock the DeepSeek API response (Step 1: Metadata Only)
        mock_generate_json.return_value = ({
            "roadmap": {
                "topic": "Python Basics",
                "total_estimated_hours": 3.0,
                "difficulty": "Beginner",
                "weeks": [
                    {
                        "week_number": 1,
                        "title": "Introduction to Python",
                        "lessons": [
                            {
                                "day": 1,
                                "title": "Variables",
                                "duration": "1 hour",
                                "description": "Learn about variables."
                            }
                        ]
                    }
                ]
            }
        }, 1000)

        # Run the task
        generate_roadmap_task(self.roadmap.id)

        # Refresh from DB
        self.roadmap.refresh_from_db()

        # Assertions
        self.assertEqual(self.roadmap.status, 'ready')
        lessons = Lesson.objects.filter(roadmap=self.roadmap)
        self.assertEqual(lessons.count(), 1)

        lesson1 = lessons.get(title="Variables")
        self.assertEqual(lesson1.week_number, 1)
        self.assertEqual(lesson1.description, "Learn about variables.")
        self.assertEqual(lesson1.content, "") # Content is empty in step 1

    @patch('apps.roadmaps.tasks.generate_roadmap_json')
    def test_generate_roadmap_task_failure(self, mock_generate_json):
        # Mock an error
        mock_generate_json.side_effect = Exception("API Down")

        # Run the task
        generate_roadmap_task(self.roadmap.id)

        # Refresh from DB
        self.roadmap.refresh_from_db()

        # Assertions
        self.assertEqual(self.roadmap.status, 'failed')

    @patch('apps.roadmaps.tasks.generate_lesson_content_json')
    def test_generate_lesson_content_task_success(self, mock_generate_content):
        # Create a lesson needing content
        lesson = Lesson.objects.create(
            roadmap=self.roadmap,
            week_number=1,
            day_number=1,
            order_in_day=1,
            title="Variables",
            description="Learn variables"
        )

        # Mock the content generation response
        mock_generate_content.return_value = ({
            "lesson": {
                "title": "Variables Deep Dive",
                "content_markdown": "# Variables\nDetailed content here.",
                "playground": {"type": "code_editor", "initial_code": "x = 10", "metadata": {}},
                "quiz": {"questions": [{"question": "What is x?", "options": ["10", "20"], "correct_index": 0, "explanation": "It is 10"}]}
            }
        }, 1200)

        # Run the task
        from apps.roadmaps.tasks import generate_lesson_content_task
        generate_lesson_content_task(lesson.id)

        # Refresh from DB
        lesson.refresh_from_db()

        # Assertions
        self.assertTrue(lesson.is_unlocked)
        self.assertIn("# Variables", lesson.content)
        self.assertEqual(lesson.playground['type'], 'code_editor')
        self.assertEqual(len(lesson.quiz['questions']), 1)
