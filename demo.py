import getpass
import os
from langgraph.prebuilt import create_react_agent
import openai 
from langgraph_supervisor import create_supervisor
from langchain.chat_models import init_chat_model

from langchain_core.messages import AIMessage
from textwrap import dedent


# Helper function 

# Validate API key 
def _set_if_undefined(var: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"Please provide your {var}: ")

def get_supervisor_message(output):
    # Get all AI messages (including supervisor's final output)
    ai_messages = [
        msg for msg in output["messages"] 
        if isinstance(msg, AIMessage)  # Checks if it's an AI message
    ]

    if ai_messages:
        # The last AI message is the final output
        final_content = ai_messages[-1].content  # Access .content, not ["content"]
        return final_content
    else:
        print("No AI messages found.")
        return None

class Agent:
    def __init__(self, name: str, persona: str):
        self.name    = name.strip()
        self.persona = persona.strip()
        self.instruction = ""

    def instruct(self, instruction: str):
        self.instruction = instruction.strip()
        
    def __repr__(self):
        return f"<Agent name='{self.name}' persona = '{self.persona}' instruction='{self.instruction}'>"
    
def prepare_input(agent1: Agent, agent2: Agent):
    user_input = dedent(f"""
    {agent1.name} persona: {agent1.persona}
    {agent1.name} instruction: {agent1.instruction}
    {agent2.name} persona: {agent2.persona}
    {agent2.name} instruction: {agent2.instruction}
    """)
    return user_input


def setup_agents():
    player1_agent = create_react_agent(
        model="openai:gpt-4.1",
        tools=[],
        prompt=(
            "You are an agent directed by a user.\n\n"
            "INSTRUCTIONS:\n"
            "- You will be an instruction and a persona\n"
            "- You need to follow the instruction given to you by the director, based on the persona\n"
            "- Your output must be `Name for Player1: dialogue` —no markdown, bullets, or extra prefixes.\n\n"
        ),
        name="player1_agent",
    )

    player2_agent = create_react_agent(
        model="openai:gpt-4.1",
        tools=[],
        prompt=(
            "You are an agent directed by a user.\n\n"
            "INSTRUCTIONS:\n"
            "- You will be an instruction and a persona\n"
            "- You need to follow the instruction given to you by the director, based on the persona\n"
            "- Your output must be `Name for Player2: dialogue` —no markdown, bullets, or extra prefixes.\n\n"
        ),
        name="player2_agent",
    )

    gm_agent = create_react_agent(
        model="openai:gpt-4.1",
        tools=[],
        prompt=(
            "You are the game master.\n\n"
            "INSTRUCTIONS:\n"
            "- Based on the past scenarios and the user reactions, you need to generate a narration of how the story will naturally unfold next \n"
            "- You shouldn't mention any other characters except the players in this game\n"
            "- Your output must be `GM: dialogue` —no markdown, bullets, or extra prefixes.\n\n"
        ),
        name="gm_agent",
    )

    supervisor = create_supervisor(
        model=init_chat_model("openai:gpt-4.1"),
        agents=[player1_agent, player2_agent, gm_agent],
        prompt=(
            "You are a supervisor managing three agents and you will be history dialogue and user input:\n"
            "- an agent for player1. Assign the instruction and persona from player1 in user input to this agent and you will receive the reaction from player1\n"
            "- an agent for player2. Assign the instruction and persona from player2 in user input to this agent and you will receive the reaction from player2 \n"
            "- a game master agent. Assign the history of diaglogue and current reactions from both users to this agen and you will receive the next plot\n"
            "Assign instructions from both users first to their agents, then assign their outputs along with the scenarios to the game master\n"
            "You will output the exact results from all three agents one by one."
            "The output format should be `Speaker: dialogue` —no markdown, bullets, or extra prefixes.\n\n"
        ),
        add_handoff_back_messages=True,
        output_mode="full_history",
    ).compile()

    return supervisor

def run_supervisor(supervisor, players_input, history_dialogue):
    
    # construct the full prompt
    prompt = dedent(f"""
    "history": {history_dialogue}
    "players_input": {players_input}
    """)

    # invoke supervisor
    messages = supervisor.invoke({
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })

    supervisor_msg = get_supervisor_message(messages)
    history_dialogue += supervisor_msg + "\n"
    print(supervisor_msg)
    return history_dialogue

def main():
    # 1. Check API key first
    _set_if_undefined("OPENAI_API_KEY")

    # Get user inputs
    print("Welcome to the Roleplaying Scenario Setup!")
    print("Please enter the following details:")
    
    player1_name = input("1) Name for Player 1: ")
    player1_persona = input("2) Personality for Player 1: ")
    player2_name = input("3) Name for Player 2: ")
    player2_persona = input("4) Personality for Player 2: ")\
    
    Agent1 = Agent(player1_name, player1_persona)
    Agent2 = Agent(player2_name, player2_persona)
    
    print("\n=== Received Input ===")
    print(f"Player 1: {Agent1.name} ({Agent1.persona})")
    print(f"Player 2: {Agent2.name} ({Agent2.persona})")

    START = ("""Scenario: In the dimly lit corridor of the Nostromo, your crewmate Kane lies motionless, his chest torn open from the inside, blood still pooling beneath him. The thing that burst from him—a xenomorph—is gone, lurking somewhere on this ship. The crew is panicked, debating what to do: hunt it down, ignore it and continue with original tasks, or abandon ship—drip, drip, drip—Kane's blood is still fresh, and time is running out. 
    """)

    print("\n=== Game Start ===")
    print(START)

    supervisor = setup_agents()

    history_dialogue = ("""
    Scenario:
    In the dimly lit corridor of the Nostromo, your crewmate Kane lies motionless, his chest torn open from the inside, blood still pooling beneath him. The thing that burst from him—a xenomorph—is gone, lurking somewhere on this ship. The crew is panicked, debating what to do: hunt it down, ignore it and continue with original tasks, or abandon ship—drip, drip, drip—Kane's blood is still fresh, and time is running out.
    """)

    # Start simulation rounds 
    for i in range(1):
        print(f"\n=== Round {i+1} ===")
        
        player1_instruction = input("5) Player1, please enter instructions to direct your agent: ")
        player2_instruction = input("6) Player2, please enter instructions to direct your agent: ")

        Agent1.instruct(player1_instruction)
        Agent2.instruct(player2_instruction)
        print("\n=== Received Instructions ===")
        print("\n=== Waiting for agents to respond ===")

        round_input = prepare_input(Agent1, Agent2)

        history_dialogue = run_supervisor(supervisor, round_input, history_dialogue)

    print("\n=== Game Over ===")
    print("Thank you for playing!")
    print("Here is the whole dialogue!")
    print(history_dialogue)



if __name__ == "__main__":
    main()