import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
GENERATE_URL = f"{BASE_URL}/api/roadmap/generate/"

def demo_roadmap():
    print("--- Starting Roadmap Generation Demo ---")
    
    # 1. Login
    print("\n1. Logging in as Alisher...")
    login_data = {
        "email": "amutalov001@gmail.com", # Assuming email based on username search earlier
        "password": "pass1234"
    }
    # Double check email for Alisher first in the script if needed, 
    # but I'll use username if login allows it or just use the first user.
    
    # Let's try login with username/password if that's supported or just use a token from shell
    pass

if __name__ == "__main__":
    # Instead of login, let's just use the RefreshToken utility to get a token directly for the demo
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtrack.settings')
    django.setup()
    
    from apps.users.models import User
    from rest_framework_simplejwt.tokens import RefreshToken
    
    user = User.objects.get(username='Alisher')
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    
    print(f"Token acquired for user: {user.username}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "topic": "Mastering Docker and Kubernetes",
        "mode": "CODE"
    }
    
    print(f"\n2. Sending request to generate roadmap for: {payload['topic']}...")
    try:
        response = requests.post(GENERATE_URL, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print("\n[API RESPONSE]")
        print(json.dumps(data, indent=2))
        
        if response.status_code == 201:
            roadmap_id = data.get('id')
            print(f"\nRoadmap ID {roadmap_id} created successfully.")
            print("The background task is now generating lessons...")
    except Exception as e:
        print(f"Error: {e}")
