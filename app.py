import arrow
from flask import Flask, render_template, request, jsonify
import requests
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
import os

from flask import make_response
from isodate import parse_duration

load_dotenv()

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
app = Flask(__name__)


@app.route('/', methods=['GET'])
def index():
    url_base = "https://www.youtube.com/watch?v=LamjAFnybo0"
    video_id = extract_video_id(url_base)
    infos = get_video_infos(video_id=video_id)

    return render_template('index.html', **infos)


@app.route('/get-video-info', methods=['POST'])
def get_video_info():  # HTMX
    video_url = request.form.get('video_url')
    if not video_url:
        return send_error("Please provide a YouTube URL.")

    video_id = extract_video_id(video_url)
    if not video_id:
        return send_error("Invalid YouTube URL provided.")

    infos = get_video_infos(video_id=video_id)
    if infos:
        return render_template('components/card.html', **infos)

    return send_error("No data found for this URL.")


def send_error(message):
    """ Helper function to send error messages with HTMX. """
    resp = make_response(message)
    resp.headers['HX-Retarget'] = '#form-error'
    resp.headers['HX-Trigger'] = 'errorTrigger'
    return resp


def get_video_infos(video_id) -> dict:
    youtube_api_url = f'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics'
    response = requests.get(youtube_api_url)
    infos = {}

    if response.status_code == 200:
        data = response.json()
        items = data.get('items')
        if not items:
            return {}
        video_info = items[0]
        snippet = video_info['snippet']
        content_details = video_info['contentDetails']
        statistics = video_info['statistics']
        channel_id = snippet.get('channelId')

        thumbnails = snippet.get('thumbnails', {})
        published_at = snippet.get('publishedAt', {})
        maxres_thumbnail = thumbnails.get('maxres', {}).get('url')
        high_thumbnail = thumbnails.get('high', {}).get('url')
        default_thumbnail = thumbnails.get('default', {}).get('url')

        duration_iso8601 = content_details.get('duration')
        video_duration = format_duration(duration_iso8601)

        infos["video_thumbnail_url"] = maxres_thumbnail or high_thumbnail or default_thumbnail
        infos["title"] = snippet.get('title')
        infos["channel_title"] = snippet.get('channelTitle')
        infos["view_count"] = statistics.get('viewCount')
        infos["channel_thumbnail_url"] = get_channel_thumbnail_url(channel_id)
        infos["video_duration"] = video_duration
        infos["published_at"] = arrow.get(published_at).humanize()

    return infos


def get_channel_thumbnail_url(channel_id) -> str:
    channel_data_url = f'https://www.googleapis.com/youtube/v3/channels?part=snippet&id={channel_id}&key={YOUTUBE_API_KEY}'
    response = requests.get(channel_data_url)
    if response.status_code == 200:
        data = response.json()
        items = data.get('items')
        if not items:
            return None
        channel_info = items[0]
        snippet = channel_info['snippet']
        thumbnails = snippet.get('thumbnails', {})
        high_thumbnail = thumbnails.get('high', {}).get('url')
        default_thumbnail = thumbnails.get('default', {}).get('url')
        return high_thumbnail if high_thumbnail else default_thumbnail


def format_duration(duration_iso8601):
    # Parse la durée ISO 8601 en un objet timedelta
    video_duration_timedelta = parse_duration(duration_iso8601)

    # Calcul des heures, minutes et secondes
    hours, remainder = divmod(video_duration_timedelta.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)

    # Formate la chaîne en fonction de la présence ou non des heures
    if hours > 0:
        return f'{int(hours)}:{int(minutes):02}:{int(seconds):02}'
    else:
        return f'{int(minutes)}:{int(seconds):02}'


def extract_video_id(url):
    # Extrait l'ID de la vidéo à partir de l'URL
    parsed_url = urlparse(url)
    video_id = parse_qs(parsed_url.query).get('v')
    if video_id:
        return video_id[0]
    return None


if __name__ == '__main__':
    app.run(debug=True)
