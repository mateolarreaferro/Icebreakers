StoryLine is a text-based interactive simulator and game where users guide generative agents through dynamic scenarios led by a generative game master. The story unfolds over a fixed number of rounds, with users making strategic decisions in response to plot twists. Some agents survive; others don’t.

To run the backend:  
1. Create a file called `settings.py` in the root directory and add your OpenAI API key:
OPENAI_API_KEY = "your-api-key"

2. Set up a virtual environment and install requirements:
python -m venv venv  
source venv/bin/activate  (or venv\Scripts\activate on Windows)  
pip install -r requirements.txt

3. Configure your Google Cloud OAuth 2 credentials inside the virtual environment.

4. Run the backend server:
python app.py

To run the frontend:  
cd sims  
npm install  
npm run dev

Contributors: Gabe Magaña (gdmagana), Huijun Mao (huijunm), Kerilynn Guevara (kguevar2), Mateo Larrea (mlarreaf)  
Course: CS 278 - Social Computing, Stanford University, Spring 2025
