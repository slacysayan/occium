import yt_dlp
import os
import logging
import json

logger = logging.getLogger(__name__)

class VideoService:
    def __init__(self):
        self.download_path = "/tmp/videos"
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

    def fetch_metadata(self, url: str) -> dict:
        """Fetch video metadata using yt-dlp"""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'force_generic_extractor': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                # Ensure we return basic fields even if some are missing
                return {
                    "title": info.get('title', 'Unknown Title'),
                    "description": info.get('description', ''),
                    "thumbnail": info.get('thumbnail', ''),
                    "duration": info.get('duration', 0),
                    "view_count": info.get('view_count', 0),
                    "uploader": info.get('uploader', 'Unknown'),
                    "source_url": url
                }
        except Exception as e:
            logger.error(f"yt-dlp error: {e}")
            raise Exception(f"Failed to fetch metadata: {str(e)}")

    def download_video(self, url: str) -> str:
        """Download video to temp path and return file path"""
        ydl_opts = {
            'format': 'best[ext=mp4]',
            'outtmpl': f'{self.download_path}/%(id)s.%(ext)s',
            'quiet': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                return filename
        except Exception as e:
            logger.error(f"Download error: {e}")
            raise Exception(f"Failed to download video: {str(e)}")

    def cleanup(self, filepath: str):
        """Remove file after upload"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
