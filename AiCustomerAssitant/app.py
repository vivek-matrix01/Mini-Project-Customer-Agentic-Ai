"""
app.py — Nexus AI FastAPI Microservice

LLM Provider Chain (Priority Order):
  1. Groq       — Primary (fastest, generous free tier, LPU hardware)
  2. Gemini     — Secondary fallback (if GOOGLE_API_KEY set)
  3. Ollama     — Final local fallback (no API key needed)

Get your FREE Groq API key at: https://console.groq.com
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
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Environment Config ────────────────────────────────────────────────────────
GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GOOGLE_API_KEY   = os.getenv("GOOGLE_API_KEY", "")
OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "mistral")

# Groq model options (all free):
#   llama-3.3-70b-versatile  → best quality
#   llama-3.1-8b-instant     → fastest (sub-200ms)
#   mixtral-8x7b-32768       → large context window
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── LLM Provider Factories ────────────────────────────────────────────────────
def get_groq():
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")
    return ChatGroq(
        model=GROQ_MODEL,
        groq_api_key=GROQ_API_KEY,
        temperature=0.1,
    )

def get_gemini():
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not set")
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
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
    Ordered fallback chain: Groq → Gemini → Ollama.
    Only includes providers whose API keys are configured.
    Ollama is always last since it needs no key (local).
    """
    chain = []
    if GROQ_API_KEY:
        chain.append(("groq", get_groq))
    if GOOGLE_API_KEY:
        chain.append(("gemini", get_gemini))
    chain.append(("ollama", get_ollama))   # always available as last resort
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
ANALYSIS_SYSTEM_PROMPT = """You are a customer review analysis engine.
Always respond with ONLY valid JSON — no markdown, no explanation, no code fences.
Never add extra keys. Never deviate from the exact schema provided."""

ANALYSIS_USER_PROMPT = """Analyse this product review and return STRICT JSON matching this exact schema:

{{
  "sentiment":   "positive | negative | neutral",
  "categories":  ["delivery","product_quality","packaging","pricing","service","other"],
  "severity":    "low | medium | high",
  "keywords":    ["keyword1", "keyword2"],
  "summary":     "one-line factual summary of the review",
  "ai_response": "polite 1-2 sentence personalised response to the customer"
}}

Review:
\"\"\"{review}\"\"\"

Return ONLY the JSON object. No other text."""

# ── Robust JSON Parser (3-stage) ──────────────────────────────────────────────
def parse_analysis_response(text: str) -> dict:
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

    log.warning("All parsing strategies failed. Raw: %s", text[:300])
    return {
        "sentiment":   "unknown",
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
            return response.content
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
        "ollama":    OLLAMA_BASE_URL,
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