from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^/?ws/lessons/(?P<lesson_id>\w+)/stream/$', consumers.LessonStreamConsumer.as_asgi()),
    re_path(r'^/?ws/roadmaps/(?P<roadmap_id>\w+)/progress/$', consumers.RoadmapConsumer.as_asgi()),
]
