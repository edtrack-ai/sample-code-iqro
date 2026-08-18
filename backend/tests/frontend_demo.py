import time
import json

def simulate_frontend_view():
    print("\n" + "="*60)
    print(" FRONTEND STATE SIMULATION: GENERATING NEXT LESSONS")
    print("="*60 + "\n")

    # Initial State
    roadmap_state = {
        "id": 85,
        "topic": "Django REST Framework WebSockets",
        "total_lessons_count": 25,
        "generated_lessons_count": 5,
        "status": "generating",
        "lessons": [f"Lesson {i+1}" for i in range(5)]
    }

    def render_ui(state):
        percent = (state['generated_lessons_count'] / state['total_lessons_count']) * 100
        bar = "█" * int(percent // 2) + "░" * (50 - int(percent // 2))
        print(f"\r[STATUS: {state['status'].upper()}] [{bar}] {state['generated_lessons_count']}/{state['total_lessons_count']} Lessons", end="")

    print("Step 1: User clicks 'Continue Generation' button...")
    time.sleep(1)
    print(">> POST /api/roadmap/roadmaps/85/continue/ -> 202 Accepted")
    print(">> WS ws://.../progress/ -> CONNECTED\n")

    # Simulation of WebSocket messages arriving
    updates = [10, 15, 20, 25]
    for count in updates:
        time.sleep(1.5)
        # Mock payload from backend
        payload = {
            "event": "progress",
            "generated_lessons_count": count,
            "total_lessons_count": 25,
            "status": "generating" if count < 25 else "ready"
        }
        
        # Frontend logic: Update local state
        roadmap_state.update(payload)
        render_ui(roadmap_state)
        
    print("\n\n" + "-"*60)
    print("SUCCESS: All lessons generated. WebSocket closed automatically.")
    print("Frontend now enables 'Start Learning' for all 25 lessons.")
    print("-"*60 + "\n")

if __name__ == "__main__":
    simulate_frontend_view()
