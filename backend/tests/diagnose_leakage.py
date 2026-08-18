import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtrack.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.roadmaps.models import Roadmap, Lesson, LessonInteraction
from apps.users.models import CreditBalance

User = get_user_model()

print("--- User Data Integrity Audit ---")
users = User.objects.all()

for u in users:
    balance = "N/A"
    if hasattr(u, 'credit_balance'):
        balance = u.credit_balance.balance
    
    roadmap_count = Roadmap.objects.filter(user=u).count()
    interaction_count = LessonInteraction.objects.filter(user=u).count()
    
    print(f"User Email: {u.email}")
    print(f"  - ID: {u.id}")
    print(f"  - Balance: {balance}")
    print(f"  - Roadmaps Owned: {roadmap_count}")
    print(f"  - Interactions Owned: {interaction_count}")
    
    if roadmap_count > 0:
        first_roadmap = Roadmap.objects.filter(user=u).first()
        print(f"  - Sample Roadmap: {first_roadmap.topic} (ID: {first_roadmap.id})")
    print("-" * 30)

print("\n--- Cross-User Lesson Interaction Check ---")
# Check if any interaction belongs to a user who doesn't own the lesson
for interaction in LessonInteraction.objects.all()[:50]:
    lesson_owner = interaction.lesson.roadmap.user
    if interaction.user != lesson_owner:
        print(f"ALARM: Interaction {interaction.id} belongs to User {interaction.user.email} but Lesson belongs to {lesson_owner.email}")
    else:
        # print(f"OK: Interaction {interaction.id} consistent.")
        pass

print("\n--- Done ---")
