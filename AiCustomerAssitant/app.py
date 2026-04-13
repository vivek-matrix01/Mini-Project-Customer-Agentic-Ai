from fastapi import FastAPI
from pydantic import BaseModel
import json
from langchain_ollama import ChatOllama

app = FastAPI()

llm = ChatOllama(model="mistral")

class ReviewRequest(BaseModel):
    review: str


PROMPT = """
Analyze the following product review and return STRICT JSON.

Review: "{review}"

Return JSON:
{{
  "sentiment": "positive | negative | neutral",
  "categories": ["delivery", "product_quality", "packaging", "pricing", "service", "other"],
  "severity": "low | medium | high",
  "keywords": ["..."],
  "summary": "one line summary"
}}
"""


import re
import json

def safe_parse(text):
    try:
        # Step 1: extract JSON inside ```json ... ```
        code_block = re.search(r"```json(.*?)```", text, re.DOTALL)

        if code_block:
            json_str = code_block.group(1).strip()
            return json.loads(json_str)

        # Step 2: fallback → extract first {...}
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
            "summary": "Parsing failed"
        }

@app.post("/analyze")
def analyze_review(req: ReviewRequest):
    prompt = PROMPT.format(review=req.review)

    response = llm.invoke(prompt)

    parsed = safe_parse(response.content)

    return parsed