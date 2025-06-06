# Icebreakers

**Icebreakers** is a small-group chat platform designed to help international students connect in unfamiliar social settings. It pairs users with two generative agents: a shared facilitator that guides the group with culturally sensitive prompts, and a personal agent that offers private, real-time suggestions. The system creates lightweight, time-limited chat sessions focused on lowering social friction and encouraging meaningful first conversations.

## How to Run

### Backend

1. Create a file called `settings.py` in the root directory and add your OpenAI API key:  
   `OPENAI_API_KEY = "your-api-key"`  
2. Set up a virtual environment and install requirements:  
   ```bash
   python -m venv venv  
   source venv/bin/activate  # or venv\Scripts\activate on Windows  
   pip install -r requirements.txt
   ```
5. Run the backend server:  
   ```bash
   python app.py
   ```

### Frontend

1. Configure your Google Cloud OAuth 2 credentials inside the virtual environment.

   To set this up, you can go to Google Cloud console, create a new project, go to APIs & Services > OAuth Consent Screen and configure an API Key.
   Then, you create a `.env.local` in the frontend (/sims) directory with AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET set
2. If needed, update the address and port in `sims/api/server.ts` to match the port that your flask backend is running on (e.g. localhost:5000 instead of 5001).
3. Then, run the frontend npm server:
   ```bash
   cd sims  
   npm install  
   npm run dev
   ```

## Course Info

CS 278 - Social Computing  
Stanford University, Spring 2025

## Creators

Mateo Larrea (mlarreaf)  
Huijun Mao (huijunm)  
Gabe Magaña (gdmagana)  
Kerilynn Guevara (kguevar2)
