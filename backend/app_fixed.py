"""
Backend server for real-time voice AI pipeline using Pipecat
Combines: Speechmatics STT + OpenAI LLM + Cartesia TTS

NOTE: This is a template. You may need to adjust imports based on the actual
Pipecat package structure. Check: https://github.com/pipecat-ai/pipecat
"""
import asyncio
import json
import os
import logging
from typing import Dict, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice AI Pipeline Backend")

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions
active_sessions: Dict[str, Dict] = {}


def get_system_instructions() -> str:
    """System instructions for the LLM"""
    return """You are a helpful voice assistant for a bill payment system. You can help users:
- Look up their account information
- View their bills
- Make payments
- Set up payment plans
- Send receipts via email or SMS

Be conversational, friendly, and efficient. When handling payments, confirm amounts and important details.
Use the provided functions to perform actions. Always acknowledge what you're doing."""


def get_tools() -> list:
    """Function definitions for the LLM"""
    return [
        {
            "type": "function",
            "function": {
                "name": "lookup_account",
                "description": "Look up customer account by phone number or email",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "identifier": {
                            "type": "string",
                            "description": "Phone number or email address"
                        }
                    },
                    "required": ["identifier"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_bills",
                "description": "Get list of bills for an account",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {
                            "type": "string",
                            "description": "Account identifier"
                        }
                    },
                    "required": ["account_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "process_payment",
                "description": "Process a payment for a bill",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "bill_id": {
                            "type": "string",
                            "description": "Bill identifier"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Payment amount"
                        },
                        "payment_method": {
                            "type": "string",
                            "description": "Payment method (card, bank)",
                            "enum": ["card", "bank"]
                        }
                    },
                    "required": ["bill_id", "amount", "payment_method"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_receipt",
                "description": "Send payment receipt via email or SMS",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "method": {
                            "type": "string",
                            "description": "Delivery method",
                            "enum": ["email", "sms"]
                        },
                        "recipient": {
                            "type": "string",
                            "description": "Email address or phone number"
                        },
                        "transaction_id": {
                            "type": "string",
                            "description": "Transaction identifier"
                        }
                    },
                    "required": ["method", "recipient", "transaction_id"]
                }
            }
        }
    ]


@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time voice communication"""
    await websocket.accept()
    session_id = f"session_{id(websocket)}"
    
    try:
        logger.info(f"New WebSocket connection: {session_id}")
        
        # Try to import Pipecat components
        try:
            # NOTE: Adjust these imports based on actual Pipecat package structure
            # Check: https://github.com/pipecat-ai/pipecat for correct imports
            
            from pipecat.pipeline.pipeline import Pipeline
            from pipecat.pipeline.runner import PipelineRunner
            from pipecat.pipeline.task import PipelineTask
            from pipecat.processors.aggregators.llm_response import LLMResponseAggregator
            from pipecat.services.openai import OpenAILLMService
            from pipecat.services.speechmatics import SpeechmaticsSTTService
            from pipecat.services.cartesia import CartesiaTTSService
            from pipecat.transports.websocket import WebSocketTransport
            
        except ImportError as e:
            logger.error(f"Pipecat import error: {e}")
            logger.error("Please install: pip install pipecat-ai")
            logger.error("And service packages: pip install pipecat-services-speechmatics pipecat-services-openai pipecat-services-cartesia")
            await websocket.close(code=1011, reason="Pipecat not properly installed")
            return
        
        # Get API keys
        speechmatics_key = os.getenv("SPEECHMATICS_API_KEY")
        speechmatics_url = os.getenv("SPEECHMATICS_URL", "wss://eu2.rt.speechmatics.com/v2")
        
        openai_key = os.getenv("OPENAI_API_KEY")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        cartesia_key = os.getenv("CARTESIA_API_KEY")
        cartesia_voice_id = os.getenv("CARTESIA_VOICE_ID")
        
        if not all([speechmatics_key, openai_key, cartesia_key]):
            error_msg = "Missing required API keys in environment variables"
            logger.error(error_msg)
            await websocket.close(code=1008, reason=error_msg)
            return
        
        # Create services
        stt_service = SpeechmaticsSTTService(
            api_key=speechmatics_key,
            url=speechmatics_url,
        )
        
        llm_service = OpenAILLMService(
            api_key=openai_key,
            model=openai_model,
            system_instruction=get_system_instructions(),
            tools=get_tools(),
        )
        
        tts_service = CartesiaTTSService(
            api_key=cartesia_key,
            voice_id=cartesia_voice_id,
        )
        
        # Create WebSocket transport
        transport = WebSocketTransport(
            websocket,
            receive_audio=True,
            send_audio=True,
        )
        
        # Create response aggregator
        response_aggregator = LLMResponseAggregator()
        
        # Build pipeline: Audio Input -> STT -> LLM -> TTS -> Audio Output
        pipeline = Pipeline([
            transport.input(),
            stt_service,
            llm_service,
            response_aggregator,
            tts_service,
            transport.output(),
        ])
        
        # Create runner and task
        runner = PipelineRunner()
        task = PipelineTask(pipeline)
        
        # Store session
        active_sessions[session_id] = {
            "runner": runner,
            "task": task,
            "websocket": websocket
        }
        
        # Start pipeline in background
        pipeline_task = asyncio.create_task(runner.run(task))
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Receive audio data (binary)
                data = await websocket.receive_bytes()
                # Audio will be processed by the pipeline transport
                
            except WebSocketDisconnect:
                logger.info(f"Client disconnected: {session_id}")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason=str(e))
    finally:
        # Cleanup
        if session_id in active_sessions:
            session = active_sessions[session_id]
            if "task" in session:
                session["task"].cancel()
            if "runner" in session:
                await session["runner"].cancel()
            del active_sessions[session_id]
        logger.info(f"Session closed: {session_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse({
        "status": "healthy",
        "active_sessions": len(active_sessions),
        "services": {
            "speechmatics": bool(os.getenv("SPEECHMATICS_API_KEY")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "cartesia": bool(os.getenv("CARTESIA_API_KEY"))
        }
    })


@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse({
        "message": "Voice AI Pipeline Backend",
        "version": "1.0.0",
        "pipeline": "Speechmatics STT → OpenAI LLM → Cartesia TTS",
        "endpoints": {
            "websocket": "/ws/voice",
            "health": "/health"
        },
        "note": "Check Pipecat documentation for correct import paths"
    })


if __name__ == "__main__":
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", 8000))
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

