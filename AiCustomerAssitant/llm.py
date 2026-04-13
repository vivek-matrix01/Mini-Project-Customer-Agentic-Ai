from langchain_ollama import ChatOllama
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import ToolMessage
# -------------------- TOOLS --------------------

@tool
def get_order_status():
    """Return the current order status for the user. Use this when user asks about order."""
    return "Your order is shipped and will arrive tomorrow."


@tool
def process_refund():
    """Process a refund request. Use this when user asks for refund or return."""
    return "Your refund request has been initiated."


tools = [get_order_status, process_refund]

# -------------------- LLM --------------------

# llm = ChatOllama(model="mistral")
llm=ChatGoogleGenerativeAI(model="gemini-2.5-flash",google_api_key="AIzaSyDnn7b-hhyDIirfKgJ9tqr5lH1ao5giJ_Y")
# Bind tools
model_with_tools = llm.bind_tools(tools)

# -------------------- CORE FUNCTION --------------------

def callmodel(user_input):

    messages = [
        {
            "role": "system",
            "content": """
You are a customer support AI.

Rules:
- If user asks about order → call get_order_status
- If user asks about refund/return → call process_refund
- DO NOT explain tools
- DO NOT suggest tools
- ALWAYS call the correct tool when needed
"""
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # First model call
    response = model_with_tools.invoke(messages)

    messages.append({
        "role": "assistant",
        "content": response.content
    })

    used_tool = None

    # -------------------- TOOL EXECUTION --------------------

    if response.tool_calls:
        print("Tool Calls:", response.tool_calls)

        for call in response.tool_calls:
            tool_name = call["name"]
            tool_args = call.get("args", {})

            for t in tools:
                if t.name == tool_name:
                    tool_output = t.invoke(tool_args)
                    used_tool = tool_name



                    messages.append(
                        ToolMessage(
                            content=tool_output,
                            tool_call_id=call["id"]  # critical link back to the tool call
                        )
                    )

                    break

        # -------------------- SECOND MODEL CALL (IMPORTANT) --------------------

        final_response = model_with_tools.invoke(messages)

        return {
            "response": final_response.content,
            "tool_used": used_tool
        }

    # -------------------- NO TOOL CASE --------------------

    return {
        "response": response.content,
        "tool_used": None
    }


# -------------------- TEST --------------------

print(callmodel("what is my order status"))