import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

# Load environment variables from backend/.env
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="DecideAI Chatbot",
    description="AI-powered product decision assistant",
    version="1.0.0"
)

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Read Groq API key from .env
api_key = os.getenv("GROQ_API_KEY")


# Request models
class ChatMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=10
    )


# Home endpoint
@app.get("/")
def home():
    return {
        "success": True,
        "message": "DecideAI chatbot is running"
    }


# Health check endpoint
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "groq_configured": bool(api_key)
    }


# Chat endpoint
@app.post("/chat")
def chat(request: ChatRequest):

    # Check whether the API key is configured
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is missing. Check backend/.env."
        )

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a message."
        )

    # System instructions for DecideAI
    messages = [
        {
            "role": "system",
            "content": (
    "You are DecideAI, a helpful AI assistant specializing in "
    "product comparisons and recommendations. You can also answer "
    "general questions.\n\n"

    "RESPONSE RULES:\n"
    "1. Keep answers short, clear, and easy to understand.\n"
    "2. Usually answer in 3-5 bullet points.\n"
    "3. Use simple English.\n"
    "4. Avoid unnecessary explanations and repetition.\n"
    "5. For product recommendations, mention key features, "
    "main advantages, disadvantages, and your recommendation.\n"
    "6. For simple questions, answer in 1-3 sentences.\n"
    "7. Give detailed explanations only when the user asks for them.\n"
    "8. Never invent product specifications or current prices."
)
        }
    ]

    # Include recent conversation context without storing it
    for item in request.history:
        if (
            item.role in ("user", "assistant")
            and item.content.strip()
        ):
            messages.append({
                "role": item.role,
                "content": item.content.strip()
            })

    # Add the latest user message if it is not already included
    if not (
        messages[-1]["role"] == "user"
        and messages[-1]["content"] == message
    ):
        messages.append({
            "role": "user",
            "content": message
        })

    try:
        # Connect to Groq
        client = Groq(api_key=api_key)

        # Generate an AI response
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.4,
            max_completion_tokens=2048,
            top_p=1,
            reasoning_effort="medium",
        )

        reply = response.choices[0].message.content

        if not reply:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response."
            )

        # Return JSON to the React frontend
        return {
            "success": True,
            "reply": reply
        }

    except HTTPException:
        raise

    except Exception as error:
        # Print detailed error in the backend terminal
        print(f"Groq error: {type(error).__name__}: {error}")

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to get an AI response. "
                "Check your Groq API key, model availability, "
                "and internet connection."
            )
        )