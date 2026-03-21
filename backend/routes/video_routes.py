from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.video_service import VideoService
import logging

router = APIRouter(prefix="/video", tags=["video"])
logger = logging.getLogger(__name__)

class FetchRequest(BaseModel):
    url: str

@router.post("/fetch")
async def fetch_video_metadata(req: FetchRequest):
    """Fetch video metadata from YouTube URL using yt-dlp"""
    try:
        service = VideoService()
        metadata = service.fetch_metadata(req.url)
        return metadata
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
