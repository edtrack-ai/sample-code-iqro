import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def test_stream_spacing():
    system_prompt = (
        "You are the EdTrack AI LANGUAGE Specialist. Answer the user request by providing: "
        "1. Full Lesson Content in Markdown. "
        "2. A structured JSON metadata block at the very end wrapped in <META> tags. "
        "IMPORTANT: Use the same language as the user."
    )

    prompt = """
    Mode: LANGUAGE
    Roadmap: ingliz tilini o'rganmoqchiman
    Lesson: O'zim haqimda gapirish: ism, millat, kasb
    
    Structure:
    - Detailed Content (Markdown)
    - Assignments (2-5 tasks)
    - Metadata for the Playground in JSON format inside <META>...</META>
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4000,
        "stream": True,
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, stream=True, timeout=120)
        response.raise_for_status()

        full_text = ""
        print("--- Receiving Stream ---")
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    if "[DONE]" in decoded_line:
                        break
                    try:
                        chunk = json.loads(decoded_line[6:])
                        if chunk['choices']:
                            delta = chunk['choices'][0]['delta'].get('content', '')
                            full_text += delta
                            # Print directly to see spaces
                            # Use repr to see exact characters
                            print(delta, end="", flush=True)
                    except:
                        continue
        
        print("\n\n--- Full Text Repr ---")
        # Print a slice to see if spaces are there
        print(repr(full_text[:500]))
        
        with open("debug_ai_output.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_stream_spacing()
