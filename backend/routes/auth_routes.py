from fastapi import APIRouter, HTTPException, Depends
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import os
import httpx
from models import User, ConnectedAccount
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# Scopes for Login + YouTube
SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
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
async def google_auth_url(redirect_uri: str):
    """Get Google OAuth URL"""
    flow = Flow.from_client_secrets_file(
        'client_secrets.json', # We'll need to create this temporarily or use from_client_config
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
    return {"url": auth_url}

@router.post("/google/callback")
async def google_callback(code: str, redirect_uri: str):
    """Handle Google OAuth Callback"""
    try:
        # Create client config dict from env vars
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
            scopes=SCOPES,
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
            
        # Also save as a connected account if it includes YouTube scopes
        # For simplicity, we assume the login flow grants YouTube access too
        # In a real app, you might separate Login vs Connect Account
        
        token = create_access_token({"sub": str(user.id)})
        return {"token": token, "user": {"id": str(user.id), "name": user.name, "email": user.email, "picture": user.profile_picture}}
        
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

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
                    "client_id": os.getenv("LINKEDIN_CLIENT_ID"),
                    "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET")
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            token_data = token_resp.json()
            if 'error' in token_data:
                 raise Exception(token_data.get('error_description'))
                 
            access_token = token_data['access_token']
            
            # 2. Get Profile
            profile_resp = await client.get(
                "https://api.linkedin.com/v2/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            profile = profile_resp.json()
            
            # Save Connected Account
            account = ConnectedAccount(
                user_id=user_id,
                platform="linkedin",
                account_name=f"{profile.get('localizedFirstName')} {profile.get('localizedLastName')}",
                linkedin_id=profile.get('id'),
                access_token=access_token,
                # LinkedIn tokens are valid for 60 days
                token_expires_at=datetime.utcnow() + timedelta(days=60)
            )
            await account.insert()
            
            return {"status": "success", "account": account.account_name}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
