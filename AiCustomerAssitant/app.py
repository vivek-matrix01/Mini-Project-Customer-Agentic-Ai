from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import os
from langchain_ollama import ChatOllama

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
llm = ChatOllama(model="mistral", base_url=ollama_base_url)

class ReviewRequest(BaseModel):
    review: str

class ChatRequest(BaseModel):
    message: str
    product_context: Optional[str] = None

PROMPT = """
Analyze the following product review and return STRICT JSON.

Review: "{review}"

Return JSON:
{{
  "sentiment": "positive | negative | neutral",
  "categories": ["delivery", "product_quality", "packaging", "pricing", "service", "other"],
  "severity": "low | medium | high",
  "keywords": ["..."],
  "summary": "one line summary",
  "ai_response": "A polite, personalized 1-2 sentence response addressed directly to the user (e.g., 'Thank you for your feedback! We are glad you liked...' or 'We are sorry to hear about your experience...')"
}}
"""


import re
import json

def safe_parse(text):
    try:

        code_block = re.search(r"```json(.*?)```", text, re.DOTALL)

        if code_block:
            json_str = code_block.group(1).strip()
            return json.loads(json_str)


        match = re.search(r"\{.*\}", text, re.DOTALL)

        if match:
            return json.loads(match.group(0))

        raise ValueError("No JSON found")

    except Exception as e:
        print("Parsing error:", e)
        print("RAW OUTPUT:", text)

        return {
            "sentiment": "unknown",
            "categories": ["other"],
            "severity": "low",
            "keywords": [],
            "summary": "Parsing failed",
            "ai_response": "Thank you for your feedback. We are processing it."
        }

@app.post("/analyze")
def analyze_review(req: ReviewRequest):
    prompt = PROMPT.format(review=req.review)

    response = llm.invoke(prompt)

    parsed = safe_parse(response.content)

    return parsed

@app.post("/chat")
def admin_chat(req: ChatRequest):
    context_info = f"\nHere are the analytics details for the product in question:\n{req.product_context}\n" if req.product_context else ""
    prompt = f"You are an AI assistant for the Admin dashboard of an e-commerce platform.{context_info}Answer the following question or request specifically focusing on the product details provided if applicable: {req.message}"
    response = llm.invoke(prompt)
    return {"response": response.content}