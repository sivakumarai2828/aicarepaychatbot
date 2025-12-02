#!/usr/bin/env python3
"""
Configuration Manager for Voice AI Backend
Easily update temperature and other settings without touching the UI
"""
import requests
import json
import sys

BACKEND_URL = "http://localhost:8000"

def get_default_config():
    """Get default configuration"""
    response = requests.get(f"{BACKEND_URL}/api/config/default")
    if response.status_code == 200:
        data = response.json()
        print("✅ Default Configuration:")
        print(json.dumps(data["config"], indent=2))
    else:
        print(f"❌ Error: {response.status_code}")

def get_current_config():
    """Get current configuration"""
    response = requests.get(f"{BACKEND_URL}/api/config")
    if response.status_code == 200:
        data = response.json()
        print("✅ Current Configuration:")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ Error: {response.status_code}")

def update_config(temperature=None, voice=None, vad_threshold=None, max_tokens=None):
    """Update configuration"""
    config = {}
    
    if temperature is not None:
        config["temperature"] = float(temperature)
    if voice is not None:
        config["voice"] = voice
    if vad_threshold is not None:
        config["vad_threshold"] = float(vad_threshold)
    if max_tokens is not None:
        config["max_response_output_tokens"] = int(max_tokens)
    
    if not config:
        print("❌ No configuration provided")
        return
    
    response = requests.post(f"{BACKEND_URL}/api/config", json=config)
    if response.status_code == 200:
        data = response.json()
        print("✅ Configuration Updated:")
        print(json.dumps(data["config"], indent=2))
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

def set_preset(preset_name):
    """Set a configuration preset"""
    presets = {
        "payment": {
            "temperature": 0.5,
            "vad_threshold": 0.5,
            "vad_silence_duration_ms": 1500,
            "description": "Precise and focused for payment processing"
        },
        "conversation": {
            "temperature": 0.7,
            "vad_threshold": 0.4,
            "vad_silence_duration_ms": 1800,
            "description": "Balanced for general conversation"
        },
        "creative": {
            "temperature": 0.9,
            "vad_threshold": 0.3,
            "vad_silence_duration_ms": 2000,
            "description": "Creative and engaging"
        },
        "default": {
            "temperature": 0.8,
            "vad_threshold": 0.3,
            "vad_silence_duration_ms": 2000,
            "description": "Default settings"
        }
    }
    
    if preset_name not in presets:
        print(f"❌ Unknown preset: {preset_name}")
        print(f"Available presets: {', '.join(presets.keys())}")
        return
    
    preset = presets[preset_name]
    description = preset.pop("description")
    
    response = requests.post(f"{BACKEND_URL}/api/config", json=preset)
    if response.status_code == 200:
        print(f"✅ Preset '{preset_name}' applied: {description}")
        print(json.dumps(preset, indent=2))
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

def check_health():
    """Check backend health"""
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend is healthy")
            print(json.dumps(data, indent=2))
        else:
            print(f"❌ Backend unhealthy: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Is it running?")
        print(f"   Start it with: cd backend && python app.py")

def print_help():
    """Print help message"""
    print("""
🎛️  Voice AI Configuration Manager

Usage:
    python config_manager.py [command] [options]

Commands:
    health                          Check backend health
    get                            Get current configuration
    default                        Get default configuration
    
    update --temp 0.7              Update temperature
    update --voice nova            Update voice
    update --vad 0.5               Update VAD threshold
    update --tokens 2048           Update max tokens
    
    preset payment                 Use payment processing preset (temp=0.5)
    preset conversation            Use conversation preset (temp=0.7)
    preset creative                Use creative preset (temp=0.9)
    preset default                 Reset to default preset (temp=0.8)

Examples:
    # Check if backend is running
    python config_manager.py health
    
    # Get current config
    python config_manager.py get
    
    # Update temperature only
    python config_manager.py update --temp 0.6
    
    # Update multiple settings
    python config_manager.py update --temp 0.7 --voice nova --vad 0.4
    
    # Use preset for payment processing
    python config_manager.py preset payment
    """)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)
    
    command = sys.argv[1]
    
    if command == "health":
        check_health()
    elif command == "get":
        get_current_config()
    elif command == "default":
        get_default_config()
    elif command == "update":
        # Parse arguments
        args = {}
        for i in range(2, len(sys.argv), 2):
            if i + 1 < len(sys.argv):
                key = sys.argv[i].lstrip('-')
                value = sys.argv[i + 1]
                
                if key == "temp":
                    args["temperature"] = value
                elif key == "voice":
                    args["voice"] = value
                elif key == "vad":
                    args["vad_threshold"] = value
                elif key == "tokens":
                    args["max_tokens"] = value
        
        update_config(**args)
    elif command == "preset":
        if len(sys.argv) < 3:
            print("❌ Please specify a preset name")
            print("Available: payment, conversation, creative, default")
        else:
            set_preset(sys.argv[2])
    elif command == "help":
        print_help()
    else:
        print(f"❌ Unknown command: {command}")
        print_help()
