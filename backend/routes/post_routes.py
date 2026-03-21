from fastapi import APIRouter, HTTPException
from models import Post, ConnectedAccount
from typing import List, Optional
from beanie import PydanticObjectId
from datetime import datetime

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=Post)
async def create_post(post: Post):
    await post.insert()
    return post

@router.get("/{user_id}", response_model=List[Post])
async def get_posts(user_id: str):
    posts = await Post.find(Post.user_id == user_id).sort("-created_at").to_list()
    return posts

@router.put("/{post_id}", response_model=Post)
async def update_post(post_id: str, update_data: dict):
    post = await Post.get(PydanticObjectId(post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Handle date conversion if needed
    if 'scheduled_at' in update_data and update_data['scheduled_at']:
        update_data['scheduled_at'] = datetime.fromisoformat(update_data['scheduled_at'].replace('Z', '+00:00'))
        
    await post.set(update_data)
    return post

@router.delete("/{post_id}")
async def delete_post(post_id: str):
    post = await Post.get(PydanticObjectId(post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await post.delete()
    return {"status": "deleted"}
