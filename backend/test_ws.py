import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8000/ws/voice"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to backend.")
            
            # Wait for initial message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"Received: {message}")
                
                data = json.loads(message)
                if data.get("type") == "message" and "Voice mode activated" in data.get("text", ""):
                    print("✅ SUCCESS: Backend connected to OpenAI and sent ready signal.")
                elif data.get("type") == "error":
                    print(f"❌ ERROR from backend: {data}")
                else:
                    print(f"⚠️ Unexpected message: {data}")
                    
            except asyncio.TimeoutError:
                print("❌ TIMEOUT waiting for ready signal.")
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
