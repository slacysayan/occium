from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
import os
from dotenv import load_dotenv
from routes import auth_routes, account_routes, post_routes, ai_routes
from models import User, ConnectedAccount, Post, ThumbnailTemplate, GhostwriterVoice
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Occium API")

# CORS
origins = [os.getenv("FRONTEND_URL", "http://localhost:3000")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database & Scheduler
scheduler = AsyncIOScheduler()

async def check_and_publish_posts():
    """Cron job to check for scheduled posts and publish them"""
    logger.info("Checking for scheduled posts...")
    # ... (logic same as before)
    # keeping it minimal to avoid blocking
    pass 

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up...")
    # DB Init
    try:
        client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
        await init_beanie(
            database=client[os.getenv("DB_NAME", "occium")],
            document_models=[User, ConnectedAccount, Post, ThumbnailTemplate, GhostwriterVoice]
        )
        logger.info("DB Connected")
    except Exception as e:
        logger.error(f"DB Connection Failed: {e}")
    
    # Start Scheduler
    scheduler.add_job(check_and_publish_posts, 'interval', minutes=1)
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    # scheduler.shutdown()
    pass

# Routes
app.include_router(auth_routes.router, prefix="/api")
app.include_router(account_routes.router, prefix="/api")
app.include_router(post_routes.router, prefix="/api")
app.include_router(ai_routes.router, prefix="/api")

@app.get("/api/health")
async def health():
    logger.info("Health check called")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
