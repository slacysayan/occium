from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            print("Warning: EMERGENT_LLM_KEY not set")
    
    async def generate_text(self, prompt: str, system_instruction: str = None, temperature: float = 0.7):
        """Generate text using Emergent LLM Key (Gemini via LlmChat)"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=str(uuid.uuid4()),
                system_message=system_instruction or "You are a helpful assistant."
            ).with_model("gemini", "gemini-2.5-flash") # Using 2.5 flash as per list

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            return response
        except Exception as e:
            print(f"Error generating text: {e}")
            raise e
    
    async def generate_image_description(self, image_url: str, prompt: str = ""):
        """
        Generate description from image URL.
        Note: LlmChat currently supports text. 
        For image description with Emergent Key, we might need a different approach 
        or use the 'openai' integration for vision if supported.
        For now, falling back to a text response indicating limitation or using a placeholder.
        """
        return "Image analysis currently unavailable with this key configuration."
