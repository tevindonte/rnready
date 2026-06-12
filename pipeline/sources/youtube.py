from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi

_api = YouTubeTranscriptApi()


def extract_video_id(value: str) -> str:
    """Accepts a full YouTube URL or bare video ID; returns the ID."""
    value = value.strip()
    if "youtube.com" in value or "youtu.be" in value:
        parsed = urlparse(value)
        if "youtu.be" in value:
            video_id = parsed.path.lstrip("/").split("/")[0]
            return video_id.split("?")[0]
        ids = parse_qs(parsed.query).get("v", [])
        if ids:
            return ids[0]
    return value


def fetch_youtube_transcript(value: str) -> str:
    video_id = extract_video_id(value)
    transcript = _api.fetch(video_id, languages=["en"])
    return " ".join(snippet.text for snippet in transcript.snippets)
