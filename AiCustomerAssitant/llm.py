"""
llm.py — Agentic Tool-Calling Module

Provider Chain: Groq (primary) → Gemini (secondary) → Ollama (local fallback)
"""

import os
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import tool
from langchain_core.messages import ToolMessage, SystemMessage, HumanMessage

# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
def get_order_status() -> str:
    """Return the current shipping status for the user's most recent order."""
    return "Your order #ORD-8821 is shipped and will arrive by tomorrow 6 PM."

@tool
def process_refund() -> str:
    """Initiate a refund for the user's most recent eligible order."""
    return "Your refund of ₹499 has been initiated. It will reflect in 3-5 business days."

@tool
def escalate_to_human() -> str:
    """Escalate this conversation to a human support agent when AI cannot resolve."""
    return "Your request has been escalated to our support team. You will receive an email within 2 hours."

tools = [get_order_status, process_refund, escalate_to_human]

# ── LLM Factory ───────────────────────────────────────────────────────────────

def get_llm():
    """
    Provider priority: Groq → Gemini → Ollama.
    All keys read from environment — never hardcoded.
    """
    groq_key   = os.getenv("GROQ_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "")

    if groq_key:
        return ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            groq_api_key=groq_key,
            temperature=0,  # deterministic for tool-calling
        )
    if google_key:
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=google_key,
            temperature=0,
        )
    # local fallback — no key needed
    return ChatOllama(
        model=os.getenv("OLLAMA_MODEL", "mistral"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0,
    )

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a customer support AI for an e-commerce platform.

Rules:
- If user asks about order status / shipping → call get_order_status
- If user asks about refund / return → call process_refund
- If the issue is complex or user is angry → call escalate_to_human
- For all other questions → answer directly
- NEVER explain which tool you are calling. Just call it and respond naturally."""

# ── Agentic Two-Pass Loop ─────────────────────────────────────────────────────

def call_agent(user_input: str) -> dict:
    """
    Two-pass agentic loop:
      Pass 1 → model decides whether to call a tool
      Pass 2 → model formulates a natural response with tool output
    """
    llm = get_llm()
    model_with_tools = llm.bind_tools(tools)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_input),
    ]

    first_response = model_with_tools.invoke(messages)
    messages.append(first_response)

    tool_used = None

    if first_response.tool_calls:
        for call in first_response.tool_calls:
            for t in tools:
                if t.name == call["name"]:
                    tool_output = t.invoke(call.get("args", {}))
                    tool_used   = call["name"]
                    messages.append(ToolMessage(
                        content=str(tool_output),
                        tool_call_id=call["id"],
                    ))
                    break

        final_response = model_with_tools.invoke(messages)
        return {"response": final_response.content, "tool_used": tool_used}

    return {"response": first_response.content, "tool_used": None}


# ── Quick test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    for q in ["Where is my order?", "I want a refund", "What are your working hours?"]:
        print(f"\nQ: {q}")
        r = call_agent(q)
        print(f"A: {r['response']}")
        print(f"Tool: {r['tool_used']}")