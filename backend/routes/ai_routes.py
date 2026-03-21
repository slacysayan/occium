from fastapi import APIRouter, HTTPException
from services.gemini_service import GeminiService
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai"])
gemini_service = GeminiService()

class GhostwriteRequest(BaseModel):
    prompt: str
    platform: str
    tone: str = "professional"

class ImageDescRequest(BaseModel):
    image_url: str

@router.post("/ghostwrite")
async def ghostwrite(req: GhostwriteRequest):
    try:
        system_prompt = f"You are an expert social media manager specializing in {req.platform}. Tone: {req.tone}."
        text = gemini_service.generate_text(req.prompt, system_instruction=system_prompt)
        return {"content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-image")
async def analyze_image(req: ImageDescRequest):
    try:
        desc = gemini_service.generate_image_description(req.image_url)
        return {"description": desc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
