"""
app.py — Nexus AI FastAPI Microservice

LLM Provider Chain with Verified Active Production Models
  - Groq: llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it
  - Google Gemini: gemini-2.5-flash, gemini-2.0-flash, gemini-2.5-flash-lite, gemini-2.0-flash-lite, gemini-flash-latest
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import os, re, json, logging

from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nexus AI — Customer Intelligence API",
    description="LLM-powered review analysis and admin chat service",
    version="2.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Environment Config ────────────────────────────────────────────────────────
GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "").strip()
GOOGLE_API_KEY   = os.getenv("GOOGLE_API_KEY", "").strip()
OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "mistral")
GROQ_PRIMARY_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

# ── LLM Provider Factories ────────────────────────────────────────────────────
def get_groq(model_name: str = None):
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")
    target_model = model_name or GROQ_PRIMARY_MODEL
    return ChatGroq(
        model=target_model,
        groq_api_key=GROQ_API_KEY,
        temperature=0.1,
    )

def get_gemini(model_name: str = "gemini-2.5-flash"):
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not set")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=GOOGLE_API_KEY,
        temperature=0.1,
    )

def get_ollama():
    return ChatOllama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.1,
    )

def build_provider_chain():
    """
    Active Verified Model Chain:
      1. Groq: llama-3.3-70b-versatile, llama-3.1-8b-instant
      2. Gemini: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-flash-latest, gemini-1.5-flash-latest, gemini-pro-latest
      3. Ollama: local fallback
    """
    chain = []

    # ── 1. Groq Active Models (Verified from your Groq Key) ────────────────────
    if GROQ_API_KEY:
        chain.append((f"groq ({GROQ_PRIMARY_MODEL})", lambda: get_groq(GROQ_PRIMARY_MODEL)))
        if GROQ_PRIMARY_MODEL != "openai/gpt-oss-20b":
            chain.append(("groq (openai/gpt-oss-20b)", lambda: get_groq("openai/gpt-oss-20b")))
        if GROQ_PRIMARY_MODEL != "qwen/qwen3.8-27b":
            chain.append(("groq (qwen/qwen3.8-27b)", lambda: get_groq("qwen/qwen3.8-27b")))
        if GROQ_PRIMARY_MODEL != "llama-3.3-70b-versatile":
            chain.append(("groq (llama-3.3-70b-versatile)", lambda: get_groq("llama-3.3-70b-versatile")))
        if GROQ_PRIMARY_MODEL != "llama-3.1-8b-instant":
            chain.append(("groq (llama-3.1-8b-instant)", lambda: get_groq("llama-3.1-8b-instant")))

    # ── 2. Google Gemini Active Models ─────────────────────────────────────────
    if GOOGLE_API_KEY:
        chain.append(("gemini-flash-latest", lambda: get_gemini("gemini-flash-latest")))
        chain.append(("gemini-3.8-flash", lambda: get_gemini("gemini-3.8-flash")))
        chain.append(("gemini-3.5-flash-lite", lambda: get_gemini("gemini-3.5-flash-lite")))
        chain.append(("gemini-pro-latest", lambda: get_gemini("gemini-pro-latest")))

    # ── 3. Ollama (Local only) ─────────────────────────────────────────────────
    if "localhost" in OLLAMA_BASE_URL or "127.0.0.1" in OLLAMA_BASE_URL:
        chain.append(("ollama", get_ollama))

    return chain

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class ReviewRequest(BaseModel):
    review: str

class AnalysisResult(BaseModel):
    sentiment:   str = Field(description="positive | negative | neutral")
    categories:  List[str] = Field(description="Complaint categories")
    severity:    str = Field(description="low | medium | high")
    keywords:    List[str] = Field(description="Key words from review")
    summary:     str = Field(description="One-line summary")
    ai_response: str = Field(description="Personalised response to the customer")

class ChatRequest(BaseModel):
    message:         str
    product_context: Optional[str] = None

# ── Prompt Templates ──────────────────────────────────────────────────────────
ANALYSIS_SYSTEM_PROMPT = """You are an expert customer sentiment intelligence engine.
Your job is to accurately classify customer feedback into positive, negative, or neutral sentiment, and evaluate the business severity.

STRICT CLASSIFICATION RULES:
1. sentiment (MUST be one of: "positive", "negative", "neutral"):
   - "positive": Customer expresses praise, satisfaction, happiness, compliments, or 4-5 star tone.
   - "negative": Customer complains, reports defects, broken items, shipping delays, poor service, or expresses anger/disappointment.
   - "neutral": General questions, inquiry about order, or balanced feedback without strong emotion.

2. severity (MUST be one of: "low", "medium", "high"):
   - "high": Broken/damaged product, missing delivery, refund demanded, severe anger, or ruined experience.
   - "medium": Delivery delays, minor cosmetic defect, poor packaging, or unhelpful support.
   - "low": Positive feedback, minor suggestions, or general inquiries.

Always respond with ONLY valid JSON matching the exact schema. No markdown fences, no conversational text."""

ANALYSIS_USER_PROMPT = """Analyse this product review and return STRICT JSON matching this exact schema:

{{
  "sentiment":   "positive" or "negative" or "neutral",
  "categories":  ["delivery","product_quality","packaging","pricing","service","other"],
  "severity":    "low" or "medium" or "high",
  "keywords":    ["keyword1", "keyword2"],
  "summary":     "one-line factual summary of the review",
  "ai_response": "polite 1-2 sentence personalised response addressing the customer's specific review"
}}

Review:
\"\"\"{review}\"\"\"

Return ONLY the JSON object. No other text."""

# ── Text Content Extractor (Handles string or LangChain block lists) ───────────
def extract_text_content(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
            elif hasattr(item, "text"):
                parts.append(str(getattr(item, "text")))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(content)

# ── Robust JSON Parser (3-stage) ──────────────────────────────────────────────
def parse_analysis_response(raw) -> dict:
    if isinstance(raw, dict):
        return raw

    text = extract_text_content(raw)

    # Stage 1: direct parse
    try:
        return json.loads(text.strip())
    except Exception:
        pass

    # Stage 2: strip markdown code fences
    try:
        stripped = re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE).strip(" `\n")
        return json.loads(stripped)
    except Exception:
        pass

    # Stage 3: regex extract first { ... } block
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass

    log.warning("All parsing strategies failed. Raw: %s", str(text)[:300])
    return {
        "sentiment":   "neutral",
        "categories":  ["other"],
        "severity":    "low",
        "keywords":    [],
        "summary":     "Could not parse AI response",
        "ai_response": "Thank you for your feedback. Our team will review it shortly.",
    }

# ── LLM Call with Provider Fallback ──────────────────────────────────────────
async def call_llm_with_fallback(messages: list) -> str:
    chain = build_provider_chain()
    last_error = None

    for name, factory in chain:
        try:
            log.info("Trying provider: %s", name)
            llm = factory()
            response = llm.invoke(messages)
            log.info("Provider '%s' succeeded", name)
            return extract_text_content(response.content)
        except Exception as e:
            log.warning("Provider '%s' failed: %s", name, str(e))
            last_error = e

    raise HTTPException(
        status_code=503,
        detail=f"All LLM providers unavailable. Last error: {str(last_error)}",
    )

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    chain = build_provider_chain()
    return {
        "status":    "healthy",
        "providers": [name for name, _ in chain],
        "primary":   chain[0][0] if chain else "none",
        "groq":      "configured" if GROQ_API_KEY   else "not configured",
        "gemini":    "configured" if GOOGLE_API_KEY  else "not configured",
    }

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_review(req: ReviewRequest):
    messages = [
        SystemMessage(content=ANALYSIS_SYSTEM_PROMPT),
        HumanMessage(content=ANALYSIS_USER_PROMPT.format(review=req.review)),
    ]
    raw = await call_llm_with_fallback(messages)
    return parse_analysis_response(raw)

@app.post("/chat")
async def admin_chat(req: ChatRequest):
    context_block = ""
    if req.product_context:
        context_block = f"\n\nProduct analytics context:\n{req.product_context}\n"

    system_msg = (
        "You are Nexus AI, an intelligent assistant for the Admin dashboard of an e-commerce platform. "
        "Help admins understand customer feedback, review trends, and product performance. "
        "Be concise, data-driven, and professional."
        + context_block
    )
    messages = [
        SystemMessage(content=system_msg),
        HumanMessage(content=req.message),
    ]
    raw = await call_llm_with_fallback(messages)
    return {"response": raw}

@app.get("/providers")
async def list_providers():
    chain = build_provider_chain()
    return {"chain": [name for name, _ in chain]}
