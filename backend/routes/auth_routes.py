from fastapi import APIRouter, HTTPException, Request
from google_auth_oauthlib.flow import Flow
import os
import httpx
from models import User, ConnectedAccount
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
ALGORITHM = "HS256"

# Scopes
YOUTUBE_SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.get("/google/url")
async def google_auth_url(redirect_uri: str, state: str = "login"):
    """Get Google OAuth URL"""
    try:
        # Construct client config manually to avoid file dependency if possible, 
        # but Flow.from_client_config is safer
        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        
        flow = Flow.from_client_config(
            client_config,
            scopes=YOUTUBE_SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Access type offline to get refresh token
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent', # Force consent to ensure we get refresh token
            state=state
        )
        return {"url": auth_url}
    except Exception as e:
        logger.error(f"Error generating Google URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/google/callback")
async def google_callback(code: str, redirect_uri: str):
    """Handle Google OAuth Callback"""
    try:
        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        
        flow = Flow.from_client_config(
            client_config,
            scopes=YOUTUBE_SCOPES,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get User Info
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {credentials.token}'}
            )
            user_info = resp.json()
            
        # Find or Create User
        user = await User.find_one(User.email == user_info['email'])
        if not user:
            user = User(
                email=user_info['email'],
                name=user_info.get('name', ''),
                google_id=user_info['id'],
                profile_picture=user_info.get('picture')
            )
            await user.insert()
        
        # Determine if this was a "Connect Account" action or "Login"
        # For simplicity, we always update the connected account for this Google ID
        
        # Check if ConnectedAccount exists
        account = await ConnectedAccount.find_one(
            ConnectedAccount.user_id == str(user.id),
            ConnectedAccount.platform == "youtube",
            ConnectedAccount.channel_id == user_info['id'] # Using Google ID as channel ID proxy for now
        )
        
        if not account:
            account = ConnectedAccount(
                user_id=str(user.id),
                platform="youtube",
                account_name=user.name,
                channel_id=user.google_id,
                profile_picture=user.profile_picture,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expires_at=datetime.utcnow() + timedelta(seconds=3600) # Approx
            )
            await account.insert()
        else:
            # Update tokens
            account.access_token = credentials.token
            if credentials.refresh_token:
                account.refresh_token = credentials.refresh_token
            await account.save()
            
        token = create_access_token({"sub": str(user.id)})
        return {"token": token, "user": {"id": str(user.id), "name": user.name, "email": user.email, "picture": user.profile_picture}}
        
    except Exception as e:
        logger.error(f"Google Auth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/linkedin/url")
async def linkedin_auth_url(redirect_uri: str, state: str = "connect"):
    """Get LinkedIn OAuth URL"""
    scope = "openid profile email w_member_social"
    url = (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    return {"url": url}

@router.post("/linkedin/callback")
async def linkedin_callback(code: str, redirect_uri: str, user_id: str):
    """Connect LinkedIn Account"""
    try:
        async with httpx.AsyncClient() as client:
            # 1. Get Access Token
            token_resp = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": LINKEDIN_CLIENT_ID,
                    "client_secret": LINKEDIN_CLIENT_SECRET
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            token_data = token_resp.json()
            if 'error' in token_data:
                 logger.error(f"LinkedIn Token Error: {token_data}")
                 raise Exception(token_data.get('error_description'))
                 
            access_token = token_data['access_token']
            
            # 2. Get Profile (OpenID)
            profile_resp = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            profile = profile_resp.json()
            
            # Save Connected Account
            # Check for existing
            existing = await ConnectedAccount.find_one(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.platform == "linkedin",
                ConnectedAccount.linkedin_id == profile.get('sub')
            )
            
            if existing:
                existing.access_token = access_token
                existing.account_name = f"{profile.get('given_name')} {profile.get('family_name')}"
                existing.profile_picture = profile.get('picture')
                await existing.save()
                return {"status": "updated", "account": existing.account_name}
            
            account = ConnectedAccount(
                user_id=user_id,
                platform="linkedin",
                account_name=f"{profile.get('given_name')} {profile.get('family_name')}",
                linkedin_id=profile.get('sub'),
                profile_picture=profile.get('picture'),
                access_token=access_token,
                token_expires_at=datetime.utcnow() + timedelta(days=60)
            )
            await account.insert()
            
            return {"status": "success", "account": account.account_name}
            
    except Exception as e:
        logger.error(f"LinkedIn Callback Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
