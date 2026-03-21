import httpx
import logging
import os

logger = logging.getLogger(__name__)

class LinkedInService:
    def __init__(self, access_token: str, person_urn: str):
        self.access_token = access_token
        self.person_urn = person_urn # e.g. "urn:li:person:..." or just ID
        
        # Ensure urn format
        if not self.person_urn.startswith("urn:li:person:"):
            self.person_urn = f"urn:li:person:{self.person_urn}"

    async def post_text(self, text: str):
        """Post text update to LinkedIn"""
        url = "https://api.linkedin.com/v2/ugcPosts"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        payload = {
            "author": self.person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": text
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 201:
                logger.error(f"LinkedIn Error: {resp.text}")
                raise Exception(f"LinkedIn API failed: {resp.text}")
            return resp.json()
