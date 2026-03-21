from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaFileUpload
import os
import logging

logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self, access_token: str, refresh_token: str = None, token_uri: str = "https://oauth2.googleapis.com/token", client_id: str = None, client_secret: str = None):
        # Construct credentials object
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=token_uri,
            client_id=client_id,
            client_secret=client_secret
        )
        self.youtube = build('youtube', 'v3', credentials=self.credentials)

    def upload_video(self, file_path: str, title: str, description: str, category_id: str = "22", privacy_status: str = "private", tags: list = []):
        """Upload a video to YouTube"""
        try:
            body = {
                'snippet': {
                    'title': title,
                    'description': description,
                    'tags': tags,
                    'categoryId': category_id
                },
                'status': {
                    'privacyStatus': privacy_status
                }
            }

            media = MediaFileUpload(file_path, chunksize=-1, resumable=True)

            request = self.youtube.videos().insert(
                part=','.join(body.keys()),
                body=body,
                media_body=media
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    logger.info(f"Uploaded {int(status.progress() * 100)}%")

            logger.info(f"Upload Complete! Video ID: {response.get('id')}")
            return response

        except Exception as e:
            logger.error(f"YouTube Upload Error: {e}")
            raise e
