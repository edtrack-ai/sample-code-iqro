import requests
import json

BASE_URL = "http://127.0.0.1:8000"
# We need an auth token. I'll pick one from the DB if possible, 
# but for now I'll just check if the endpoint exists.

def check_endpoints():
    print(f"Checking endpoints at {BASE_URL}...")
    
    # 1. Check if the old SSE endpoint is 404 (as expected after shift to REST)
    resp = requests.post(f"{BASE_URL}/roadmap/generate/stream/", json={"topic": "test"})
    print(f"OLD SSE Endpoint (/roadmap/generate/stream/): {resp.status_code}")

    # 2. Check the standard generate endpoint
    resp = requests.post(f"{BASE_URL}/roadmap/generate/", json={"topic": "test"})
    print(f"Standard Generate Endpoint (/roadmap/generate/): {resp.status_code}")

if __name__ == "__main__":
    check_endpoints()
