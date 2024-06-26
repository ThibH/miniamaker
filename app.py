import base64
import os
from urllib.parse import parse_qs
from urllib.parse import urlparse

import arrow
import requests
from dotenv import load_dotenv
from flask import Flask
from flask import Response
from flask import render_template
from flask import request
from isodate import parse_duration

load_dotenv()

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
app = Flask(__name__)


def get_video_id_from_request() -> str:
    """Extract the video ID from the request parameters or use a default."""
    if video_url := request.args.get('video_url'):
        return extract_video_id(video_url)
    return "LamjAFnybo0"


@app.route('/', methods=['GET'])
def index() -> str:
    """Render the main page."""
    video_id = get_video_id_from_request()
    language = request.args.get('language', "en").lower()
    infos = fetch_video_info(video_id, language)

    return render_template('index.html', **infos)


@app.route('/get-video-info', methods=['POST'])
def get_video_info() -> Response | str:
    """Endpoint to get video information from YouTube API."""
    video_url = request.form.get('video_url')
    language = request.form.get('language')
    if not video_url:
        return "No video URL provided."

    video_id = extract_video_id(video_url)
    if not video_id:
        return "Invalid video URL."

    infos = fetch_video_info(video_id, language)
    if infos:
        return render_template('components/card.html', **infos)

    # TODO: Handle error when url is not a valid YouTube video URL
    return "Error fetching video information."


def fetch_video_info(video_id: str, language: str) -> dict:
    """Fetch video details from YouTube API."""
    youtube_api_url = f'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics'
    response = requests.get(youtube_api_url)
    if response.status_code != 200:
        return {}

    if data := response.json().get('items', []):
        return parse_video_info(data[0], language)


def parse_video_info(video_info: dict, language: str) -> dict:
    """Parse video information from the API response."""
    snippet = video_info['snippet']
    content_details = video_info['contentDetails']
    statistics = video_info['statistics']
    view_count = f"{int(statistics.get('viewCount', 0)):,}"
    image = image_to_base64(select_thumbnail(snippet.get('thumbnails', {})))

    return {
        "video_thumbnail_url": image,
        "title": snippet.get('title', "Title not found"),
        "channel_title": snippet.get('channelTitle', "Channel not found"),
        "view_count": view_count,
        "channel_thumbnail_url": get_channel_thumbnail_url(snippet.get('channelId')),
        "video_duration": format_duration(content_details.get('duration')),
        "published_at": arrow.get(snippet.get('publishedAt')).humanize(locale=language)
    }


def select_thumbnail(thumbnails: dict) -> str:
    """Select the best available thumbnail."""
    return thumbnails.get('maxres', {}).get('url') or \
        thumbnails.get('high', {}).get('url') or \
        thumbnails.get('default', {}).get('url')


def get_channel_thumbnail_url(channel_id: str) -> str:
    """Fetch channel thumbnail from YouTube API."""
    channel_data_url = f'https://www.googleapis.com/youtube/v3/channels?part=snippet&id={channel_id}&key={YOUTUBE_API_KEY}'
    response = requests.get(channel_data_url)
    if response.status_code != 200:
        return ""

    channel_info = response.json().get('items', [{}])[0]
    thumbnails = channel_info.get('snippet', {}).get('thumbnails', {})
    return thumbnails.get('high', {}).get('url') or thumbnails.get('default', {}).get('url')


def format_duration(duration_iso8601: str) -> str:
    """Convert ISO8601 duration to a human-readable format."""
    duration = parse_duration(duration_iso8601)
    hours, remainder = divmod(duration.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f'{int(hours)}:{int(minutes):02}:{int(seconds):02}'
    return f'{int(minutes)}:{int(seconds):02}'


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from URL."""
    parsed_url = urlparse(url)
    video_id = parse_qs(parsed_url.query).get('v')
    return video_id[0] if video_id else None


def image_to_base64(url):
    response = requests.get(url)
    return base64.b64encode(response.content).decode('utf-8')


if __name__ == '__main__':
    app.run(host='0.0.0.0')
