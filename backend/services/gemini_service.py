import google.generativeai as genai
from PIL import Image
import io
import os
import requests

class GeminiService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_text = genai.GenerativeModel('gemini-pro')
        self.model_vision = genai.GenerativeModel('gemini-pro-vision')
    
    def generate_text(self, prompt: str, system_instruction: str = None, temperature: float = 0.7):
        """Generate text using Gemini"""
        final_prompt = prompt
        if system_instruction:
            final_prompt = f"{system_instruction}\n\nUser Request: {prompt}"
            
        response = self.model_text.generate_content(
            final_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=2048
            )
        )
        return response.text
    
    def generate_image_description(self, image_url: str, prompt: str = ""):
        """Generate description from image URL"""
        # Download image
        response = requests.get(image_url)
        image = Image.open(io.BytesIO(response.content))
        
        default_prompt = "Describe this image in detail."
        final_prompt = prompt or default_prompt
        
        response = self.model_vision.generate_content([final_prompt, image])
        return response.text
