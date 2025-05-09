# Code Assistant - it will clarify anything about the codebase - helpful as we start integrating more parts
# feel free to adjust it as you wish
"""
Interactive GPT-powered code assistant

Run this script at your repo root to explore your codebase via GPT. It loads all
relevant source files, starts a REPL, and preserves conversation history so you
can ask follow-up questions. Type `chao` to exit.
"""
import argparse
import readline 
from pathlib import Path
from llm_utils import run_script, gen_oai

# List of project files to include in context (team, fell free to add)
SOURCE_FILES = [
    "app.py",
    "gm_profiles.py",
    "llm_utils.py",
    "npc_agents.py",
    "room.py",
    "scenarios.py",
    "templates/index.html",
]

def load_code(files):
    """Read each file and return a dict mapping filename to its content."""
    code_map = {}
    for fn in files:
        path = Path(fn)
        if path.exists():
            code_map[fn] = path.read_text(encoding='utf-8')
        else:
            code_map[fn] = f"# ERROR: '{fn}' not found\n"
    return code_map


def make_system_prompt(code_map):
    """
    Build the system prompt by concatenating all file contents under headers.
    GPT will use this prompt as context for all questions.
    """
    sections = []
    for name, content in code_map.items():
        sections.append(f"### FILE: {name}\n{content}\n")
    joined = "\n".join(sections)
    return (
        "You are a helpful assistant with full knowledge of the codebase."
        " Answer questions by referring only to the provided code.\n\n"
        + joined
    )


def ask_codebase(history, code_map, question, model, temp):
    """
    Append the user question to history, call GPT with the full message history,
    then record and return the assistant's reply.
    """
    # On first turn, prepend the system prompt
    if not history:
        history.append({
            "role": "system",
            "content": make_system_prompt(code_map)
        })

    # Add user message
    history.append({"role": "user", "content": question})

    # Call GPT
    response = gen_oai(history, model=model, temperature=temp)

    # Record assistant reply
    history.append({"role": "assistant", "content": response})
    return response


def repl(code_map, model, temp):
    """
    Launch the interactive REPL. Preserves conversation for follow-ups.
    Type 'chao' to exit.
    """
    print("Code Assistant REPL — ask me about your code (type chao to exit)\n")
    history = []
    try:
        while True:
            user_q = input("🖥️  Question: ").strip()
            if not user_q:
                continue
            if user_q.lower() == "chao":
                print("\n👋 Chao! Goodbye!\n")
                break

            print("\n🤖 Thinking...\n")
            answer = ask_codebase(history, code_map, user_q, model, temp)
            print(answer)
            print("\n" + "-"*60 + "\n")

    except (EOFError, KeyboardInterrupt):
        print("\n👋 Goodbye!")


def main():
    parser = argparse.ArgumentParser(
        description="Interactive GPT-powered code assistant"
    )
    parser.add_argument(
        "--model", "-m",
        default="gpt-4o-mini",
        help="OpenAI model to use (e.g., gpt-4o-mini, gpt-4)"
    )
    parser.add_argument(
        "--temp", "-t",
        type=float,
        default=0.2,
        help="Sampling temperature"
    )
    args = parser.parse_args()

    code_map = load_code(SOURCE_FILES)
    repl(code_map, args.model, args.temp)


if __name__ == "__main__":
    main()
