from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    user_id: Optional[int] = None
    message: str
    session_id: Optional[str] = None
    metadata: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    tool_used: Optional[str] = None
    confidence: Optional[float] = None