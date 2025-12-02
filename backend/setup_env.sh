#!/bin/bash

# Setup script to configure .env file with API keys

echo "🔧 Setting up backend environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Speechmatics API Configuration
SPEECHMATICS_API_KEY=VzK0vI02iHnCYLKb9CcQxA6rLcMD7uMz
SPEECHMATICS_URL=wss://eu2.rt.speechmatics.com/v2

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Cartesia API Configuration
CARTESIA_API_KEY=sk_car_qHChLu4sAHNgAmEKBBQD7w
CARTESIA_VOICE_ID=11labs-Jenny

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
    echo "✅ .env file created!"
else
    echo "⚠️  .env file already exists. Updating API keys..."
    
    # Update Speechmatics key
    if grep -q "SPEECHMATICS_API_KEY=" .env; then
        sed -i '' 's|SPEECHMATICS_API_KEY=.*|SPEECHMATICS_API_KEY=VzK0vI02iHnCYLKb9CcQxA6rLcMD7uMz|' .env
    else
        echo "SPEECHMATICS_API_KEY=VzK0vI02iHnCYLKb9CcQxA6rLcMD7uMz" >> .env
    fi
    
    # Update Cartesia key
    if grep -q "CARTESIA_API_KEY=" .env; then
        sed -i '' 's|CARTESIA_API_KEY=.*|CARTESIA_API_KEY=sk_car_qHChLu4sAHNgAmEKBBQD7w|' .env
    else
        echo "CARTESIA_API_KEY=sk_car_qHChLu4sAHNgAmEKBBQD7w" >> .env
    fi
    
    echo "✅ API keys updated!"
fi

echo ""
echo "📋 Next steps:"
echo "1. Edit .env and add your OpenAI API key"
echo "2. (Optional) Run 'python get_cartesia_voices.py' to see available voices"
echo "3. Start the server with 'python app.py'"
echo ""

