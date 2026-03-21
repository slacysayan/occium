from fastapi import APIRouter, HTTPException
from services.gemini_service import GeminiService
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])
try:
    gemini_service = GeminiService()
except Exception as e:
    logger.error(f"Failed to init Gemini Service: {e}")
    gemini_service = None

class GhostwriteRequest(BaseModel):
    prompt: str
    platform: str
    tone: str = "professional"

class ImageDescRequest(BaseModel):
    image_url: str

@router.post("/ghostwrite")
async def ghostwrite(req: GhostwriteRequest):
    logger.info(f"Ghostwrite request: {req.prompt}")
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini Service not initialized")
    
    try:
        system_prompt = f"You are an expert social media manager specializing in {req.platform}. Tone: {req.tone}."
        logger.info("Calling Gemini API...")
        # Await the async method
        text = await gemini_service.generate_text(req.prompt, system_instruction=system_prompt)
        logger.info("Gemini API returned success")
        return {"content": text}
    except Exception as e:
        logger.error(f"Gemini Error: {e}")
        # MOCK RESPONSE FOR DEMO/TESTING WHEN KEY FAILS
        logger.warning("Returning mock response due to AI failure")
        return {"content": f"[MOCK] AI generation failed (Key Inactive). Here is a draft about {req.prompt}: Create content that resonates with your audience on {req.platform}. Focus on value and engagement."}

@router.post("/analyze-image")
async def analyze_image(req: ImageDescRequest):
    try:
        desc = await gemini_service.generate_image_description(req.image_url)
        return {"description": desc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
