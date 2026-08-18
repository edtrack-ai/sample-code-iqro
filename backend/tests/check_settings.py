import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtrack.settings')
django.setup()

print(f"DEBUG: {settings.DEBUG}")
print(f"SECRET_KEY starts with: {settings.SECRET_KEY[:10]}...")
print(f"DATABASES: {settings.DATABASES['default']['ENGINE']}")
print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
