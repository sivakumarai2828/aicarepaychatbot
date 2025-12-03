# 🚀 Deployment Guide

This guide will help you deploy the AI CarePay Chatbot to production.

## 📋 Prerequisites

- GitHub account with your repository: https://github.com/sivakumarai2828/aicarepaychatbot
- Netlify account (for frontend)
- Render account (for backend)
- OpenAI API key

---

## 🎨 Frontend Deployment (Netlify)

### Step 1: Connect to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Select your repository: `sivakumarai2828/aicarepaychatbot`

### Step 2: Configure Build Settings

Netlify should auto-detect the settings from `netlify.toml`, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18

### Step 3: Set Environment Variables

In Netlify dashboard → **Site settings** → **Environment variables**, add:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_BACKEND_VOICE_URL=wss://your-render-backend-url.onrender.com/ws/voice
```

**Important**: Replace `your-render-backend-url` with your actual Render backend URL (you'll get this in Step 2 of backend deployment).

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete (2-3 minutes)
3. Your site will be live at: `https://your-site-name.netlify.app`

### Step 5: Update Frontend Config

After backend is deployed, update the backend URL:

1. Go to **Site settings** → **Environment variables**
2. Update `VITE_BACKEND_VOICE_URL` with your Render backend URL
3. Trigger a new deploy: **Deploys** → **Trigger deploy** → **Deploy site**

---

## ⚙️ Backend Deployment (Render)

### Step 1: Connect to Render

1. Go to [Render](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `sivakumarai2828/aicarepaychatbot`

### Step 2: Configure Service

Render should auto-detect settings from `render.yaml`, but verify:

- **Name**: `aicarepaychatbot-backend`
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

### Step 3: Set Environment Variables

In Render dashboard → **Environment**, add:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for the build to complete (3-5 minutes)
3. Your backend will be live at: `https://your-service-name.onrender.com`

### Step 5: Test Backend

Visit: `https://your-service-name.onrender.com/health`

You should see:
```json
{
  "status": "healthy",
  "active_sessions": 0,
  "services": {
    "openai": true
  }
}
```

---

## 🔗 Connect Frontend to Backend

### Update Frontend Environment Variable

1. Go to Netlify → **Site settings** → **Environment variables**
2. Update `VITE_BACKEND_VOICE_URL`:
   ```
   wss://your-service-name.onrender.com/ws/voice
   ```
3. **Important**: Use `wss://` (not `https://`) for WebSocket connection
4. Trigger a new deploy

---

## ✅ Verification Checklist

### Backend (Render)
- [ ] Health endpoint works: `https://your-backend.onrender.com/health`
- [ ] Returns `{"status": "healthy"}`
- [ ] OPENAI_API_KEY is set in environment variables

### Frontend (Netlify)
- [ ] Site loads successfully
- [ ] Chat window opens
- [ ] Voice mode button appears
- [ ] Can click "Enable Voice Assistance"
- [ ] Voice mode activates (check browser console for connection)

### Integration
- [ ] Voice mode connects to backend (check browser console)
- [ ] Can speak and get AI responses
- [ ] Payment flow works end-to-end
- [ ] Receipt email offer appears after payment

---

## 🐛 Troubleshooting

### Frontend Issues

**Build fails on Netlify:**
- Check Node version is 18
- Verify all dependencies in `package.json`
- Check build logs for specific errors

**Voice mode doesn't connect:**
- Verify `VITE_BACKEND_VOICE_URL` is correct
- Must use `wss://` protocol (not `ws://` or `https://`)
- Check browser console for WebSocket errors

### Backend Issues

**Build fails on Render:**
- Check Python version is 3.11
- Verify `requirements.txt` is in `backend/` folder
- Check build logs for missing dependencies

**Health endpoint returns error:**
- Check OPENAI_API_KEY is set
- Check Render logs for startup errors
- Verify `app.py` is in `backend/` folder

**WebSocket connection fails:**
- Render free tier may have cold starts (first request takes 30-60 seconds)
- Check Render logs for WebSocket errors
- Verify CORS settings in `app.py`

---

## 💰 Cost Estimates

### Netlify (Frontend)
- **Free tier**: 100 GB bandwidth, 300 build minutes/month
- **Cost**: $0/month (for most use cases)

### Render (Backend)
- **Free tier**: 750 hours/month, sleeps after 15 min inactivity
- **Starter**: $7/month (always on, no sleep)
- **Cost**: $0-7/month

### OpenAI API
- **Realtime API**: ~$0.06/minute of audio
- **Cost**: Variable based on usage

---

## 🔄 Updating Your Deployment

### To Deploy New Changes:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Netlify**: Auto-deploys on push to `main`
3. **Render**: Auto-deploys on push to `main`

### Manual Deploy:
- **Netlify**: Deploys → Trigger deploy → Deploy site
- **Render**: Manual Deploy → Deploy latest commit

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review deployment logs in Netlify/Render dashboards
3. Check browser console for frontend errors
4. Check Render logs for backend errors

---

## 🎉 Success!

Once deployed, your app will be accessible at:
- **Frontend**: `https://your-site-name.netlify.app`
- **Backend**: `https://your-service-name.onrender.com`

Share the frontend URL with users to access your AI CarePay Chatbot!
