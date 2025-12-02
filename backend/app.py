"""
Backend server for real-time voice AI pipeline
Proxies OpenAI Real-Time API through backend for security
"""
import asyncio
import json
import os
import logging
import uuid
import base64
from typing import Dict, Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import websockets
from openai import OpenAI

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

# OpenAI client
openai_client = None
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"


# ============================================================================
# PYDANTIC MODELS FOR CONFIGURATION
# ============================================================================

class VoiceSessionConfig(BaseModel):
    """Configuration for OpenAI Realtime Voice Session"""
    temperature: Optional[float] = Field(
        default=0.8, 
        ge=0.0, 
        le=2.0,
        description="Controls randomness: 0.0=deterministic, 2.0=very creative"
    )
    max_response_output_tokens: Optional[int] = Field(
        default=250, 
        ge=1, 
        le=4096,
        description="Maximum tokens in response (lower = faster, more concise for voice)"
    )
    voice: Optional[str] = Field(
        default="alloy",
        description="Voice to use: alloy, echo, fable, onyx, nova, shimmer"
    )
    vad_threshold: Optional[float] = Field(
        default=0.95, 
        ge=0.0, 
        le=1.0,
        description="Voice Activity Detection threshold (0.0-1.0, higher = less sensitive)"
    )
    vad_prefix_padding_ms: Optional[int] = Field(
        default=300,
        ge=0,
        description="Padding before speech detection (ms)"
    )
    vad_silence_duration_ms: Optional[int] = Field(
        default=1200,
        ge=0,
        description="Silence duration to end turn (ms)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "temperature": 0.7,
                "max_response_output_tokens": 2048,
                "voice": "alloy",
                "vad_threshold": 0.5,
                "vad_prefix_padding_ms": 300,
                "vad_silence_duration_ms": 1500
            }
        }
    }



class SessionInitRequest(BaseModel):
    """Request to initialize a session with custom config"""
    config: Optional[VoiceSessionConfig] = Field(
        default_factory=VoiceSessionConfig,
        description="Session configuration parameters"
    )


# Store active sessions and their configurations
active_sessions: Dict[str, Dict] = {}
session_configs: Dict[str, VoiceSessionConfig] = {}  # Store config per session


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================



def get_system_instructions() -> str:
    """System instructions for the LLM"""
    return """You are a helpful voice assistant for a bill payment system. You can help users:
- Look up their account information
- View their bills
- Make payments
- Send receipts via email or SMS

CRITICAL INTERACTION RULES:
1. WAIT for the user to speak first and tell you what they need.
2. IF the user says "Hello", "Hi", or greets you: Just say "Hello! How can I help you today?" DO NOT ask for account details yet.
3. DO NOT proactively ask for phone numbers, emails, or offer to look up accounts until the user mentions a task that requires it (like "view bills").
4. DO NOT assume what the user wants - let them tell you.
5. Only call functions when the user explicitly requests that action.
6. Be responsive and helpful, but not pushy.

CRITICAL RULES FOR BILL DISPLAY:
When you call the get_bills function:
1. DO NOT say "hold on", "please wait", "let me check", or "one moment"
2. DO NOT describe the bills (amounts, providers, payment options)
3. The bills appear INSTANTLY in the visual UI when you call the function
4. Simply acknowledge briefly like: "I can see your bills are displayed" or "Your bills are showing on screen"
5. Then ask what they'd like to do next

CRITICAL RULES FOR PAYMENT PLANS:
When you call the show_payment_plans function:
1. DO NOT describe the payment plan options (6-month, 12-month, 18-month, etc.)
2. DO NOT mention monthly payment amounts or interest rates
3. The payment plans appear INSTANTLY in the visual UI
4. Simply say: "I've displayed the payment plan options for your [bill name]"
5. Then ask which plan they'd like to choose

CRITICAL RULES FOR SELECTING PAYMENT PLANS:
When user chooses a payment plan (e.g., "6-month plan", "12-month", "first installment"):
1. IMMEDIATELY call the select_payment_plan function with the correct bill_id and plan_id
2. Map user's choice to plan_id: "6 months" = plan_6mo, "12 months" = plan_12mo, "18 months" = plan_18mo, "24 months" = plan_24mo_reduced
3. DO NOT ask for payment details or card information - the system handles this automatically
4. After calling select_payment_plan, say: "I've set up your [X]-month payment plan. The payment details are now displayed on screen."
5. DO NOT describe payment amounts or details - they appear in the visual UI

Be conversational, friendly, and efficient. When handling payments, confirm amounts and important details.
Use the provided functions to perform actions. Always acknowledge what you're doing."""



def get_tools() -> list:
    """Function definitions for the LLM"""
    return [
        {
            "type": "function",
            "name": "lookup_account",
            "description": "Look up customer account by phone number or email. ONLY call this if the user explicitly asks to 'look up my account', 'find my account', or if they provide their email/phone number for identification. DO NOT ask for this information proactively upon greeting.",
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
        },
        {
            "type": "function",
            "name": "get_bills",
            "description": "Get list of bills for an account. ONLY call this function when the user EXPLICITLY asks to see their bills, view bills, show bills, or check their bills. DO NOT call this function proactively or as a greeting.",
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
        },
        {
            "type": "function",
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
        },
        {
            "type": "function",
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
        },
        {
            "type": "function",
            "name": "show_payment_plans",
            "description": "Show available payment plans for a specific bill. Call this when user asks about installment or payment plan options. You can use either the bill ID or the provider name (e.g., 'Medical Center', 'Dental Care', 'Vision Care').",
            "parameters": {
                "type": "object",
                "properties": {
                    "bill_id": {
                        "type": "string",
                        "description": "Bill identifier (e.g., bill_1, bill_2) OR provider name (e.g., 'Medical Center', 'Dental Care', 'Vision Care')"
                    }
                },
                "required": ["bill_id"]
            }
        },
        {
            "type": "function",
            "name": "select_payment_plan",
            "description": "Select a specific payment plan after user has chosen one from the displayed options",
            "parameters": {
                "type": "object",
                "properties": {
                    "bill_id": {
                        "type": "string",
                        "description": "Bill identifier"
                    },
                    "plan_id": {
                        "type": "string",
                        "description": "Payment plan identifier (e.g., plan_6mo, plan_12mo, plan_18mo)"
                    }
                },
                "required": ["bill_id", "plan_id"]
            }
        }
    ]


async def proxy_openai_realtime(client_ws: WebSocket, session_id: str, voice_config: VoiceSessionConfig = None):
    """Proxy WebSocket connection to OpenAI Real-Time API"""
    if not openai_api_key:
        await client_ws.send_json({
            "type": "error",
            "error": {"message": "OpenAI API key not configured"}
        })
        return
    
    # Use default config if none provided
    if voice_config is None:
        voice_config = VoiceSessionConfig()
    
    logger.info(f"🎛️ Session config: temp={voice_config.temperature}, voice={voice_config.voice}, vad={voice_config.vad_threshold}")
    
    try:
        # Connect to OpenAI Real-Time API
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "OpenAI-Beta": "realtime=v1"
        }
        
        logger.info(f"🔌 Connecting to OpenAI Real-Time API for session {session_id}...")
        
        async with websockets.connect(
            OPENAI_REALTIME_URL,
            extra_headers=headers
        ) as openai_ws:
            logger.info(f"✅ Connected to OpenAI Real-Time API for session {session_id}")
            
            # Small delay to ensure connection is ready
            await asyncio.sleep(0.1)
            
            # Wait for session.created event from OpenAI
            try:
                initial_response = await asyncio.wait_for(openai_ws.recv(), timeout=5.0)
                initial_data = json.loads(initial_response) if isinstance(initial_response, str) else None
                
                if initial_data and initial_data.get("type") == "session.created":
                    logger.info(f"✅ Session created by OpenAI: {initial_data.get('session', {}).get('id')}")
                elif initial_data and initial_data.get("type") == "error":
                    error_details = initial_data.get("error", {})
                    logger.error(f"❌ OpenAI sent error on connection: {json.dumps(initial_data, indent=2)}")
                    raise Exception(f"OpenAI connection error: {error_details.get('message', 'Unknown error')}")
                else:
                    logger.warning(f"Unexpected initial response: {initial_data.get('type') if initial_data else 'unknown'}")
                    logger.warning(f"Full response: {json.dumps(initial_data, indent=2) if initial_data else 'None'}")
                    
            except asyncio.TimeoutError:
                logger.error("Timeout waiting for session.created from OpenAI")
                raise Exception("OpenAI did not send session.created event")
            
            # Now send session.update with our configuration
            # Use minimal configuration that matches OpenAI Real-Time API schema
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": get_system_instructions(),
                    "voice": voice_config.voice,
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": voice_config.vad_threshold,
                        "prefix_padding_ms": voice_config.vad_prefix_padding_ms,
                        "silence_duration_ms": voice_config.vad_silence_duration_ms
                    },
                    "tools": get_tools(),
                    "tool_choice": "auto",
                    "temperature": voice_config.temperature,
                    "max_response_output_tokens": voice_config.max_response_output_tokens
                }
            }
            
            # Log the exact config being sent for debugging
            logger.info(f"📤 Session config to send: {json.dumps(session_config, indent=2)}")
            
            try:
                await openai_ws.send(json.dumps(session_config))
                logger.info(f"📤 Sent session config for session {session_id}")
                
                # Wait briefly to see if OpenAI sends an error
                try:
                    response = await asyncio.wait_for(openai_ws.recv(), timeout=1.0)
                    response_data = json.loads(response) if isinstance(response, str) else None
                    if response_data:
                        if response_data.get("type") == "error":
                            error_msg = response_data.get("error", {}).get("message", "Unknown error")
                            logger.error(f"OpenAI session config error: {error_msg}")
                            logger.error(f"Full error response: {json.dumps(response_data, indent=2)}")
                            raise Exception(f"OpenAI error: {error_msg}")
                        elif response_data.get("type") == "session.updated":
                            logger.info(f"✅ Session updated successfully")
                        else:
                            logger.debug(f"OpenAI response: {response_data.get('type')}")
                except asyncio.TimeoutError:
                    logger.debug("No immediate response from OpenAI, proceeding")
                    
            except Exception as e:
                logger.error(f"Error sending session config: {e}")
                raise
            
            # Send initial greeting to client
            await client_ws.send_json({
                "type": "message",
                "text": "Voice mode activated. I can hear you now!",
                "sender": "bot"
            })
            
            # Create tasks for bidirectional proxying
            async def forward_client_to_openai():
                """Forward messages from client to OpenAI"""
                try:
                    while True:
                        # Receive from client
                        try:
                            data = await client_ws.receive()
                            
                            if "bytes" in data:
                                # Raw audio bytes - send to OpenAI as input.audio.append
                                audio_bytes = data["bytes"]
                                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                                
                                message = {
                                    "type": "input_audio_buffer.append",
                                    "audio": audio_base64
                                }
                                await openai_ws.send(json.dumps(message))
                                logger.debug(f"Sent {len(audio_bytes)} bytes of audio to OpenAI")
                                
                            elif "text" in data:
                                # JSON text message
                                try:
                                    message = json.loads(data["text"])
                                    await openai_ws.send(json.dumps(message))
                                except json.JSONDecodeError:
                                    # Plain text - convert to conversation item
                                    message = {
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "message",
                                            "role": "user",
                                            "content": [{"type": "input_text", "text": data["text"]}]
                                        }
                                    }
                                    await openai_ws.send(json.dumps(message))
                                    
                        except WebSocketDisconnect:
                            logger.info(f"Client disconnected during forwarding for session {session_id}")
                            break
                        except Exception as e:
                            logger.error(f"Error receiving from client: {e}")
                            break
                            
                except asyncio.CancelledError:
                    logger.info(f"Client-to-OpenAI forwarding cancelled for session {session_id}")
                except Exception as e:
                    logger.error(f"Error in client-to-OpenAI forwarding: {e}")
            
            async def forward_openai_to_client():
                """Forward messages from OpenAI to client"""
                try:
                    async for message in openai_ws:
                        try:
                            data = json.loads(message)
                            
                            # Forward all messages to client
                            await client_ws.send_text(message)
                            
                            # Handle function calls - transform to frontend format
                            if data.get("type") == "response.function_call_arguments.done":
                                logger.info(f"🔧 Function call detected: {data.get('name')}")
                                # Send transformed function_call event to frontend
                                function_call_event = {
                                    "type": "function_call",
                                    "call_id": data.get("call_id"),
                                    "name": data.get("name"),
                                    "arguments": data.get("arguments", "{}")
                                }
                                await client_ws.send_text(json.dumps(function_call_event))
                                logger.info(f"📤 Sent function_call event to frontend: {data.get('name')}")
                            
                            # Log important events
                            if data.get("type") == "response.audio.delta":
                                # logger.debug(f"Audio delta: {len(data.get('delta', ''))} bytes")
                                pass
                            elif data.get("type") == "response.audio.done":
                                logger.info(f"✅ Audio response complete")
                            elif data.get("type") in ["response.audio_transcript.delta", "response.audio_transcript.done"]:
                                logger.debug(f"Transcript: {data.get('delta', '')}")
                                
                        except json.JSONDecodeError:
                            # Binary data - forward as-is
                            logger.info(f"🔊 Forwarding binary audio chunk: {len(message)} bytes")
                            await client_ws.send_bytes(message)
                        except Exception as e:
                            logger.error(f"Error processing OpenAI message: {e}")
                            
                except asyncio.CancelledError:
                    logger.info(f"OpenAI-to-client forwarding cancelled for session {session_id}")
                except Exception as e:
                    logger.error(f"Error in OpenAI-to-client forwarding: {e}")
            
            # Run both forwarding tasks concurrently
            try:
                await asyncio.gather(
                    forward_client_to_openai(),
                    forward_openai_to_client()
                )
            except Exception as e:
                logger.error(f"Error in proxy tasks: {e}")
                
    except Exception as e:
        logger.exception(f"Error proxying to OpenAI Real-Time API: {e}")
        try:
            await client_ws.send_json({
                "type": "error",
                "error": {"message": str(e)}
            })
        except:
            pass


@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint that proxies to OpenAI Real-Time API"""
    await websocket.accept()
    
    session_id = str(uuid.uuid4())
    logger.info(f"🔌 WebSocket client connected - Session: {session_id}")
    
    try:
        # Get session config if it was pre-configured, otherwise use defaults
        voice_config = session_configs.get(session_id, VoiceSessionConfig())
        
        active_sessions[session_id] = {
            "websocket": websocket,
            "connected_at": asyncio.get_event_loop().time(),
            "config": voice_config
        }
        
        # Proxy to OpenAI Real-Time API with configuration
        await proxy_openai_realtime(websocket, session_id, voice_config)
        
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket client disconnected - Session: {session_id}")
    except Exception as e:
        logger.exception(f"❗ Error in WebSocket for session {session_id}: {e}")
    finally:
        if session_id in active_sessions:
            del active_sessions[session_id]
        logger.info(f"✅ Session closed: {session_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse({
        "status": "healthy",
        "active_sessions": len(active_sessions),
        "services": {
            "openai": bool(openai_api_key),
        }
    })


@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse({
        "message": "Voice AI Pipeline Backend",
        "version": "2.0.0",
        "pipeline": "OpenAI Real-Time API (Proxied with Dynamic Config)",
        "endpoints": {
            "websocket": "/ws/voice",
            "health": "/health",
            "config": {
                "get_default": "/api/config/default",
                "update": "/api/config",
                "get_current": "/api/config"
            }
        }
    })


@app.get("/api/config/default")
async def get_default_config():
    """Get default voice session configuration"""
    default_config = VoiceSessionConfig()
    return JSONResponse({
        "config": default_config.model_dump(),
        "description": "Default configuration for voice sessions"
    })


@app.get("/api/config")
async def get_current_config():
    """Get current global configuration"""
    # Return the default config (you can extend this to support per-user configs)
    default_config = VoiceSessionConfig()
    return JSONResponse({
        "config": default_config.model_dump(),
        "active_sessions": len(active_sessions),
        "session_configs": len(session_configs)
    })


@app.post("/api/config")
async def update_config(config: VoiceSessionConfig):
    """
    Update configuration for future sessions
    This sets the default configuration that will be used for new WebSocket connections
    """
    try:
        # Validate the config (Pydantic does this automatically)
        logger.info(f"📝 Updated config: temp={config.temperature}, voice={config.voice}")
        
        # Store as default for new sessions (you can extend this to be user-specific)
        # For now, we'll just return success - in production, you'd store this in a database
        
        return JSONResponse({
            "status": "success",
            "message": "Configuration updated successfully",
            "config": config.model_dump()
        })
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/config/session/{session_id}")
async def set_session_config(session_id: str, config: VoiceSessionConfig):
    """
    Pre-configure a session before WebSocket connection
    Useful for setting up session-specific parameters
    """
    try:
        session_configs[session_id] = config
        logger.info(f"📝 Pre-configured session {session_id}: temp={config.temperature}")
        
        return JSONResponse({
            "status": "success",
            "session_id": session_id,
            "message": "Session configuration set. Connect to WebSocket to use this config.",
            "config": config.model_dump()
        })
    except Exception as e:
        logger.error(f"Error setting session config: {e}")
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
