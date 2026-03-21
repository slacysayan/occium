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
    print("Checking for scheduled posts...")
    now = datetime.utcnow()
    posts = await Post.find(
        Post.status == "scheduled",
        Post.scheduled_at <= now
    ).to_list()
    
    for post in posts:
        print(f"Publishing post {post.id}...")
        try:
            # Logic to publish to LinkedIn/YouTube
            # For MVP, we'll just mark as published and simulate success
            # In real implementation, we'd call the platform API here
            
            # Example Logic (Placeholder)
            # if post.platform == 'linkedin':
            #     publish_linkedin(post)
            # elif post.platform == 'youtube':
            #     publish_youtube(post)
            
            post.status = "published"
            post.published_at = now
            await post.save()
            print(f"Post {post.id} published successfully.")
            
        except Exception as e:
            print(f"Failed to publish post {post.id}: {e}")
            post.status = "failed"
            post.error_message = str(e)
            await post.save()

@app.on_event("startup")
async def startup_event():
    # DB Init
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    await init_beanie(
        database=client[os.getenv("DB_NAME", "occium")],
        document_models=[User, ConnectedAccount, Post, ThumbnailTemplate, GhostwriterVoice]
    )
    
    # Start Scheduler
    scheduler.add_job(check_and_publish_posts, 'interval', minutes=1)
    scheduler.start()
    print("✅ Application started & DB Connected")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

# Routes
app.include_router(auth_routes.router, prefix="/api")
app.include_router(account_routes.router, prefix="/api")
app.include_router(post_routes.router, prefix="/api")
app.include_router(ai_routes.router, prefix="/api")

@app.post("/api/cron/publish")
async def manual_cron_trigger(authorization: str = Header(None)):
    """Manual trigger for cron job"""
    # Simple security check (in prod use a secret env var)
    # if authorization != f"Bearer {os.getenv('CRON_SECRET')}":
    #     raise HTTPException(status_code=401, detail="Unauthorized")
    
    await check_and_publish_posts()
    return {"status": "triggered"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
