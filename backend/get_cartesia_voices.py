"""
Script to fetch available Cartesia voice IDs
Run this to see available voices: python get_cartesia_voices.py
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "sk_car_qHChLu4sAHNgAmEKBBQD7w")

def get_voices():
    """Fetch available Cartesia voices"""
    url = "https://api.cartesia.ai/voices"
    headers = {
        "x-api-key": CARTESIA_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        voices = response.json()
        
        print("\n🎤 Available Cartesia Voices:\n")
        if isinstance(voices, list):
            for voice in voices:
                print(f"  - {voice.get('id', 'N/A')}: {voice.get('name', 'N/A')}")
        elif isinstance(voices, dict) and 'voices' in voices:
            for voice in voices['voices']:
                print(f"  - {voice.get('id', 'N/A')}: {voice.get('name', 'N/A')}")
        else:
            print(f"  Response: {voices}")
            
        return voices
    except Exception as e:
        print(f"❌ Error fetching voices: {e}")
        print("\n💡 Common voice IDs to try:")
        print("  - 11labs-Jenny")
        print("  - 11labs-Adam")
        print("  - 11labs-Antoni")
        return None

if __name__ == "__main__":
    get_voices()

