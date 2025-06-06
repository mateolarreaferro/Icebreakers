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
3. Configure your Google Cloud OAuth 2 credentials inside the virtual environment.  
4. Run the backend server:  
   ```bash
   python app.py
   ```
5. If needed, update the port in `sims/api/server.ts` to match the port that `app.py` is running on (e.g. 5000 instead of 5001).

### Frontend

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
