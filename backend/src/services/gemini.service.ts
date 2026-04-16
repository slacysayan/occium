import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const VOICE_INSTRUCTIONS: Record<string, string> = {
  Professional: "Write in a professional, authoritative tone. Clean, concise, credible.",
  Casual: "Write in a friendly, conversational tone. Approachable and relatable.",
  Viral: "Write with high energy. Use a strong hook, punchy sentences, and a bold CTA.",
};

export async function ghostwriteLinkedInPost(params: {
  title: string;
  description: string;
  tags: string[];
  voiceProfile?: string;
}): Promise<string> {
  const { title, description, tags, voiceProfile = "Professional" } = params;
  const voice = VOICE_INSTRUCTIONS[voiceProfile] ?? VOICE_INSTRUCTIONS.Professional;

  const prompt = `You are a LinkedIn ghostwriter for a content creator.

Write a compelling LinkedIn post based on this YouTube video:

Title: ${title}
Description: ${description.slice(0, 800)}
Tags: ${tags.slice(0, 10).join(", ")}

Voice style: ${voice}

Rules:
- Maximum 1300 characters total
- Start with a strong hook — NOT with "I" or "We"
- Use short paragraphs (1-2 sentences each)
- End with a question or clear call-to-action
- Maximum 3 hashtags, placed at the end
- Return ONLY the post text, no explanations, no quotes around it`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return text;
}
