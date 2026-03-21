from beanie import Document, Indexed
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field

class User(Document):
    email: Indexed(str, unique=True)
    google_id: Optional[str] = None
    name: str
    profile_picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"

class ConnectedAccount(Document):
    user_id: str
    platform: str  # youtube, linkedin
    account_name: str
    channel_id: Optional[str] = None # For YouTube
    linkedin_id: Optional[str] = None # For LinkedIn
    profile_picture: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "connected_accounts"

class Post(Document):
    user_id: str
    account_id: str
    platform: str
    content_type: str = "text" # text, video, image
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []
    source_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str = "draft" # draft, scheduled, publishing, published, failed
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "posts"

class ThumbnailTemplate(Document):
    user_id: str
    template_name: str
    style_ref_url: Optional[str] = None
    base_prompt: str
    is_default: bool = False

    class Settings:
        name = "thumbnail_templates"

class GhostwriterVoice(Document):
    user_id: str
    voice_name: str
    system_prompt: str
    few_shot_examples: Dict[str, Any] = {} # jsonb
    is_default: bool = False

    class Settings:
        name = "ghostwriter_voices"
