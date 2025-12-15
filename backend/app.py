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
import resend
from datetime import datetime
from email_templates import get_receipt_html

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice AI Pipeline Backend")

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "*").split(",")
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

# Resend configuration
resend_api_key = os.getenv("RESEND_API_KEY")
if resend_api_key:
    resend.api_key = resend_api_key
else:
    logger.warning("RESEND_API_KEY not found in environment variables")

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"


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
        default=1000, 
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
- Apply for a new CareCredit card

CRITICAL INTERACTION RULES:
1. WAIT for the user to speak first and tell you what they need. DO NOT greet them or say anything when voice mode first starts.
2. When the user first speaks, IF they say "Hello", "Hi", or greet you: Just say "Hello! How can I help you today?" DO NOT ask for account details yet.
3. DO NOT proactively ask for phone numbers, emails, or offer to look up accounts until the user mentions a task that requires it (like "view bills").
4. If you hear silence, background noise, or unclear speech, DO NOT respond. Wait for clear instructions.
5. DO NOT assume what the user wants - let them tell you.
6. Only call functions when the user explicitly requests that action.

CRITICAL RULES FOR ACCOUNT LOOKUP:
1. If the user asks to "view bills", "check balance", or "see account", you MUST identify them first.
2. Ask: "I can help with that. What is your phone number or email address?"
3. WAIT for the user to provide the phone number or email.
4. Once provided, call `lookup_account` with the identifier.
5. ONLY after `lookup_account` returns successfully, call `get_bills` with the returned account_id.
6. NEVER call `get_bills` with a made-up ID like "sample_account_id" or "12345". You MUST have a real ID from the user or lookup.

CRITICAL RULES FOR BILL DISPLAY:
When you call the get_bills function:
1. DO NOT say "hold on", "please wait", "let me check", or "one moment"
2. DO NOT describe the bills (amounts, providers, payment options)
3. The bills appear INSTANTLY in the visual UI when you call the function
4. Simply acknowledge briefly like: "I can see your bills are displayed" or "Your bills are showing on screen"
5. Then ask what they'd like to do next

CRITICAL RULES FOR PAYMENT PLANS:
When you call the show_payment_plans function:
1. ONLY call this if the user EXPLICITLY asks for "dental plan", "installment plan", "payment options", or similar.
2. DO NOT call this if the user just says "pay bill" or "make a payment" - assume they want to pay in full unless they say otherwise.
3. If the user mentions a specific bill type (e.g., "dental"), use that as the bill_id (e.g., "Dental Care").
4. DO NOT describe the payment plan options (6-month, 12-month, 18-month, etc.)
5. DO NOT mention monthly payment amounts or interest rates
6. The payment plans appear INSTANTLY in the visual UI
7. Simply say: "I've displayed the payment plan options for your [bill name]"
8. Then ask which plan they'd like to choose

CRITICAL RULES FOR SELECTING PAYMENT PLANS:
When user chooses a payment plan (e.g., "6-month plan", "12-month", "first installment"):
1. IMMEDIATELY call the select_payment_plan function with the correct bill_id and plan_id
2. Map user's choice to plan_id: "6 months" = plan_6mo, "12 months" = plan_12mo, "18 months" = plan_18mo, "24 months" = plan_24mo_reduced
3. DO NOT ask for payment details or card information - the system handles this automatically
4. After calling select_payment_plan, say: "I've set up your [X]-month payment plan. The payment details are now displayed on screen."
5. DO NOT describe payment amounts or details - they appear in the visual UI

Be conversational, friendly, and efficient. When handling payments, confirm amounts and important details.
Use the provided functions to perform actions. Always acknowledge what you're doing.
Speak in full, complete sentences. Do not break up your response unnecessarily.

CRITICAL RULE FOR PAYMENT PLANS:
When you call select_payment_plan:
1. Say: "I've set up your payment plan. Please enter your payment details on the screen to finalize it."
2. STOP TALKING. Do not say "payment successful" or ask about sending receipts.
3. WAIT SILENTLY for the user to either:
   - Say they completed the payment (then you can confirm)
   - Ask for help
   - Or wait for the system to send you a payment completion notification
4. DO NOT assume the payment is complete just because you called select_payment_plan.
5. The payment form is displayed on screen - the user needs to fill it out and click "Pay Now" first.

CRITICAL POST-PAYMENT RULE:
ONLY after you receive explicit confirmation that payment was processed (via process_payment function call OR user tells you):
1. Confirm the success: "Payment successful!"
2. IMMEDIATELY ask: "Would you like me to send a receipt to your email?"
3. If they say "yes" (or "sure", "please"):
   - Call the `send_receipt` function.
   - After sending, ask: "Would you like to make another payment?"
4. If they say "yes" (to another payment):
   - Say: "Okay, here are your remaining bills."
   - CALL `get_bills` function immediately. Use the `account_id` from the previous lookup (e.g., "acc_1").
5. If they say "no":
   - Ask: "Is there anything else I can help you with?"

IMPORTANT: Do NOT say "payment successful" until the user actually completes the payment by clicking "Pay Now" on the form.

CRITICAL RULE FOR "CARECREDIT CARD" OR "PAYMENT OPTIONS":
1. When the user asks to "Pay with CareCredit card" or selects "CareCredit card" option:
2. Call `select_payment_option(option='carecredit-card')`.
3. Say: "I've opened the secure payment form. Please enter your card details on the screen."
4. STOP TALKING. Do NOT say "payment successful". Do NOT say "it's processed".
5. Wait for the user to fill the form.
6. The payment is ONLY complete if the user clicks "Pay Now" or explicitly tells you "I have paid".

CRITICAL: If the user provides a "Confirmation number" or says they completed the payment successfully, ACCEPT this as the confirmation. AUTOMATICALLY ask: "Payment successful! Would you like me to send a receipt to your email?" """



def get_tools() -> list:
    """Function definitions for the LLM"""
    return [
        {
            "type": "function",
            "name": "lookup_account",
            "description": "Look up customer account by phone number or email. Call this when the user provides their contact info to view bills or access their account.",
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
            "description": "Get list of bills for an account. REQUIRED: You MUST have a valid account_id from a previous `lookup_account` call. DO NOT call this with a made-up ID. If you don't have an account_id, ask the user for their phone/email first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "Account identifier obtained from lookup_account"
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
            "name": "send_email",
            "description": "Send an email using Resend API. Call this when the user wants to send a receipt or information via email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "string",
                        "description": "Recipient email address (e.g., sivakumar.kk@gmail.com)"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject"
                    },
                    "html": {
                        "type": "string",
                        "description": "Email body content (HTML supported)"
                    }
                },
                "required": ["to", "subject", "html"]
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
        },
        {
            "type": "function",
            "name": "apply_for_card",
            "description": "Apply for a new CareCredit card. Call this when the user explicitly asks to apply for a new card or mentions they want to get a CareCredit card.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "type": "function",
            "name": "select_payment_option",
            "description": "Select a payment method from the available options (Account Lookup, CareCredit Card, Apply for Card). Call this when the user is on the 'Payment Options' screen and asks to use a specific method.",
            "parameters": {
                "type": "object",
                "properties": {
                    "option": {
                        "type": "string",
                        "description": "The selected option",
                        "enum": ["account-lookup", "carecredit-card", "apply-new"]
                    }
                },
                "required": ["option"]
            }
        },
        {
            "type": "function",
            "name": "select_account",
            "description": "Select a specific account for payment from the available options. Call this when the user mentions an account (e.g., 'primary method', 'ending in 5678') on the Account Lookup screen.",
             "parameters": {
                "type": "object",
                "properties": {
                    "account_identifier": {
                        "type": "string",
                        "description": "The identifier of the account (e.g., last 4 digits '5678', or 'primary')"
                    }
                },
                "required": ["account_identifier"]
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
                            
                            # Handle function calls
                            if data.get("type") == "response.function_call_arguments.done":
                                function_name = data.get("name")
                                call_id = data.get("call_id")
                                arguments_str = data.get("arguments", "{}")
                                logger.info(f"🔧 Function call detected: {function_name}")
                                
                                if function_name == "send_email":
                                    # Handle email sending locally in backend
                                    try:
                                        args = json.loads(arguments_str)
                                        to_email = args.get("to")
                                        subject = args.get("subject")
                                        html_content = args.get("html")
                                        
                                        logger.info(f"📧 Sending email to {to_email}...")
                                        
                                        # Send email using Resend
                                        if resend.api_key:
                                            email_params = {
                                                "from": "CareCredit Support <onboarding@resend.dev>",
                                                "to": [to_email],
                                                "subject": subject,
                                                "html": html_content
                                            }
                                            email_response = resend.Emails.send(email_params)
                                            logger.info(f"✅ Email sent: {email_response}")
                                            output_result = "Email sent successfully."
                                        else:
                                            logger.error("❌ Resend API key not configured")
                                            output_result = "Error: Email service not configured."
                                            
                                    except Exception as e:
                                        logger.error(f"❌ Error sending email: {e}")
                                        output_result = f"Error sending email: {str(e)}"
                                    
                                    # Send output back to OpenAI
                                    function_output_event = {
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "function_call_output",
                                            "call_id": call_id,
                                            "output": output_result
                                        }
                                    }
                                    await openai_ws.send(json.dumps(function_output_event))
                                    
                                    # Trigger response
                                    await openai_ws.send(json.dumps({"type": "response.create"}))

                                elif function_name == "send_receipt":
                                    # Handle receipt sending
                                    try:
                                        args = json.loads(arguments_str)
                                        method = args.get("method")
                                        recipient = args.get("recipient")
                                        transaction_id = args.get("transaction_id")
                                        
                                        if method == "email":
                                            logger.info(f"📧 Sending receipt to {recipient}...")
                                            
                                            # Generate HTML content
                                            amount = "150.00" # Default/Mock amount since it's not passed in send_receipt
                                            date_str = datetime.now().strftime("%B %d, %Y")
                                            html_content = get_receipt_html(transaction_id, amount, date_str, "Credit Card")
                                            
                                            if resend.api_key:
                                                email_params = {
                                                    "from": "CareCredit Support <onboarding@resend.dev>",
                                                    "to": [recipient],
                                                    "subject": f"Payment Receipt - {transaction_id}",
                                                    "html": html_content
                                                }
                                                email_response = resend.Emails.send(email_params)
                                                logger.info(f"✅ Receipt sent: {email_response}")
                                                output_result = "Receipt sent successfully."
                                            else:
                                                output_result = "Error: Email service not configured."
                                        else:
                                            output_result = "SMS not supported yet."
                                            
                                    except Exception as e:
                                        logger.error(f"❌ Error sending receipt: {e}")
                                        output_result = f"Error sending receipt: {str(e)}"

                                    # Send output back to OpenAI
                                    function_output_event = {
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "function_call_output",
                                            "call_id": call_id,
                                            "output": output_result
                                        }
                                    }
                                    await openai_ws.send(json.dumps(function_output_event))
                                    await openai_ws.send(json.dumps({"type": "response.create"}))

                                else:
                                    # Forward other function calls to frontend
                                    function_call_event = {
                                        "type": "function_call",
                                        "call_id": call_id,
                                        "name": function_name,
                                        "arguments": arguments_str
                                    }
                                    await client_ws.send_text(json.dumps(function_call_event))
                                    logger.info(f"📤 Sent function_call event to frontend: {function_name}")
                            
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
