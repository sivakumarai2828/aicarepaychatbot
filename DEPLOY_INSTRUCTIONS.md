# Deployment Guide for AI CarePay Chatbot

This guide will help you deploy the **frontend to Netlify** and the **backend to Render**.

## Prerequisites
- A [GitHub account](https://github.com/) with this repository pushed (already done).
- A [Netlify account](https://www.netlify.com/).
- A [Render account](https://render.com/).
- Your API Keys (`OPENAI_API_KEY`, `RESEND_API_KEY`, etc.).

---

## Part 1: Deploy Backend to Render

1.  **Log in to Render** and go to your Dashboard.
2.  Click **New +** and select **Web Service**.
3.  **Connect your GitHub repository**:
    *   Find `aicarepaychatbot` in the list and click **Connect**.
4.  **Configure the Service**:
    *   **Name**: `aicarepaychatbot-backend` (or similar).
    *   **Region**: Choose the one closest to you (e.g., Oregon, Frankfurt).
    *   **Branch**: `main`.
    *   **Root Directory**: `backend` (Important!).
    *   **Runtime**: `Python 3`.
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5.  **Environment Variables**:
    *   Scroll down to the "Environment Variables" section and add:
        *   `PYTHON_VERSION`: `3.11.0`
        *   `OPENAI_API_KEY`: `sk-...` (Your OpenAI API Key)
        *   `RESEND_API_KEY`: `re_...` (Your Resend API Key)
        *   `CORS_ORIGINS`: `*` (Or your Netlify URL once you have it, e.g., `https://your-site.netlify.app`)
6.  Click **Create Web Service**.
7.  **Wait for Deployment**: Render will build and start your service.
8.  **Copy the Backend URL**: Once deployed, copy the URL (e.g., `https://aicarepaychatbot-backend.onrender.com`).

---

## Part 2: Deploy Frontend to Netlify

1.  **Log in to Netlify** and go to your Dashboard.
2.  Click **Add new site** -> **Import from Git**.
3.  **Connect to GitHub**:
    *   Authorize Netlify if needed.
    *   Select the `aicarepaychatbot` repository.
4.  **Configure the Build**:
    *   **Branch to deploy**: `main`.
    *   **Base directory**: (Leave empty or `/`).
    *   **Build command**: `npm run build`.
    *   **Publish directory**: `dist`.
5.  **Environment Variables**:
    *   Click on **Show advanced** -> **New Variable**.
    *   Add the following:
        *   `VITE_BACKEND_VOICE_URL`: The WebSocket URL of your Render backend.
            *   Format: `wss://<YOUR-RENDER-APP-NAME>.onrender.com/ws/voice`
            *   Example: `wss://aicarepaychatbot-backend.onrender.com/ws/voice`
            *   *Note: Replace `https://` with `wss://` and append `/ws/voice`.*
        *   `VITE_OPENAI_API_KEY`: (Optional, if you want to allow client-side fallback, but backend is recommended).
6.  Click **Deploy site**.
7.  **Wait for Deployment**: Netlify will build and publish your site.
8.  **Visit your site**: Click the link provided by Netlify (e.g., `https://fluffy-unicorn-123.netlify.app`).

---

## Part 3: Final Configuration

1.  **Update CORS on Render (Optional but Recommended)**:
    *   Once you have your Netlify URL (e.g., `https://my-app.netlify.app`), go back to your Render Dashboard.
    *   Update the `CORS_ORIGINS` environment variable to your Netlify URL to restrict access.
    *   Render will automatically redeploy.

## Troubleshooting

-   **Backend Connection Failed**: Check the browser console (F12). If you see WebSocket connection errors, verify the `VITE_BACKEND_VOICE_URL` is correct (starts with `wss://`) and the Render service is "Live".
-   **Voice Not Working**: Ensure `OPENAI_API_KEY` is correctly set in Render environment variables.
