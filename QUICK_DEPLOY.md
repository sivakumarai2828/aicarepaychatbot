# 🚀 Quick Deployment Reference

## 📝 Checklist

### Before You Start
- [ ] GitHub repository is up to date
- [ ] You have your OpenAI API key ready
- [ ] You have accounts on Netlify and Render

---

## 🎨 Netlify (Frontend) - Quick Steps

1. **Go to**: https://app.netlify.com/
2. **Click**: "Add new site" → "Import an existing project"
3. **Select**: Your GitHub repo `sivakumarai2828/aicarepaychatbot`
4. **Build settings** (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Add environment variables**:
   ```
   VITE_OPENAI_API_KEY=sk-...
   VITE_BACKEND_VOICE_URL=wss://YOUR-BACKEND.onrender.com/ws/voice
   ```
6. **Deploy** and wait 2-3 minutes
7. **Get your URL**: `https://YOUR-SITE.netlify.app`

---

## ⚙️ Render (Backend) - Quick Steps

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Web Service"
3. **Select**: Your GitHub repo `sivakumarai2828/aicarepaychatbot`
4. **Settings** (auto-detected from render.yaml):
   - Name: `aicarepaychatbot-backend`
   - Environment: Python 3
   - Build: `cd backend && pip install -r requirements.txt`
   - Start: `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT`
5. **Add environment variable**:
   ```
   OPENAI_API_KEY=sk-...
   ```
6. **Create Web Service** and wait 3-5 minutes
7. **Get your URL**: `https://YOUR-BACKEND.onrender.com`
8. **Test**: Visit `https://YOUR-BACKEND.onrender.com/health`

---

## 🔗 Final Step: Connect Them

1. Copy your Render backend URL
2. Go to Netlify → Site settings → Environment variables
3. Update `VITE_BACKEND_VOICE_URL`:
   ```
   wss://YOUR-BACKEND.onrender.com/ws/voice
   ```
   ⚠️ **Important**: Use `wss://` (not `https://`)
4. Trigger new deploy on Netlify

---

## ✅ Test Your Deployment

1. Visit your Netlify URL
2. Click "Enable Voice Assistance"
3. Speak: "Hello"
4. AI should respond!

---

## 💡 Important Notes

- **Render Free Tier**: Backend sleeps after 15 min inactivity (first request takes 30-60s to wake up)
- **Upgrade to Starter ($7/mo)**: For always-on backend with no sleep
- **WebSocket URL**: Must use `wss://` protocol for production
- **Auto-deploy**: Both services auto-deploy when you push to GitHub

---

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.
