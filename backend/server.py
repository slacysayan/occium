from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
import os
from dotenv import load_dotenv
from routes import auth_routes, account_routes, post_routes, ai_routes, video_routes
from models import User, ConnectedAccount, Post, ThumbnailTemplate, GhostwriterVoice
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from services.youtube_service import YouTubeService
from services.linkedin_service import LinkedInService
from services.video_service import VideoService
import logging
import asyncio

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

async def publish_post(post: Post):
    """Publish a single post based on platform"""
    logger.info(f"Publishing post {post.id} to {post.platform}")
    
    try:
        # Get Account Credentials
        account = await ConnectedAccount.get(PydanticObjectId(post.account_id))
        if not account:
            raise Exception("Connected account not found or disconnected")

        if post.platform == "youtube":
            # 1. Prepare Video
            video_service = VideoService()
            file_path = None
            
            if post.source_url:
                 # Download if it's from a URL (Import flow)
                 logger.info(f"Downloading video from {post.source_url}")
                 file_path = video_service.download_video(post.source_url)
            elif post.thumbnail_url: 
                # If we had a file upload feature, we'd use that path. 
                # For now, MVP supports Import. 
                # If no source_url, we can't upload without a file.
                raise Exception("No source video provided for upload")

            # 2. Upload
            if file_path:
                yt_service = YouTubeService(
                    access_token=account.access_token,
                    refresh_token=account.refresh_token,
                    client_id=os.getenv("GOOGLE_CLIENT_ID"),
                    client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
                )
                
                resp = yt_service.upload_video(
                    file_path=file_path,
                    title=post.title,
                    description=post.description,
                    privacy_status="private", # Default to private for safety in MVP
                    tags=post.tags
                )
                
                post.platform_post_id = resp.get("id")
                
                # Cleanup
                video_service.cleanup(file_path)

        elif post.platform == "linkedin":
            li_service = LinkedInService(
                access_token=account.access_token,
                person_urn=account.linkedin_id
            )
            resp = await li_service.post_text(post.description)
            post.platform_post_id = resp.get("id")

        # Success
        post.status = "published"
        post.published_at = datetime.utcnow()
        await post.save()
        logger.info(f"Post {post.id} published successfully")

    except Exception as e:
        logger.error(f"Failed to publish post {post.id}: {e}")
        post.status = "failed"
        post.error_message = str(e)
        await post.save()

async def check_and_publish_posts():
    """Cron job to check for scheduled posts and publish them"""
    logger.info("Checking for scheduled posts...")
    now = datetime.utcnow()
    posts = await Post.find(
        Post.status == "scheduled",
        Post.scheduled_at <= now
    ).to_list()
    
    for post in posts:
        # Run in background to not block loop? 
        # For simplicity in this cron, await it.
        await publish_post(post)

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
    try:
        scheduler.add_job(check_and_publish_posts, 'interval', minutes=1)
        scheduler.start()
        logger.info("Scheduler started")
    except Exception as e:
         logger.error(f"Scheduler Failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

# Routes
app.include_router(auth_routes.router, prefix="/api")
app.include_router(account_routes.router, prefix="/api")
app.include_router(post_routes.router, prefix="/api")
app.include_router(ai_routes.router, prefix="/api")
app.include_router(video_routes.router, prefix="/api") # Add Video Routes

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
