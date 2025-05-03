scenarios = [
    {
        "id": "lifeboat",
        "title": "Spaceship – Lifeboat Crisis",
        "setup": (
            "You are the 8‑person bridge crew of the research vessel *Aeon*. "
            "A plasma‑reactor fault will blow the ship apart in **10 real‑time minutes**. "
            "The only escape pod holds **4**. "
            "Hold a rapid round‑table: each character may reveal a skill or secret that could "
            "influence who gets a seat. Debate, barter favours, or volunteer heroic actions."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SURVIVORS: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },

    {
        "id": "bank_heist",
        "title": "Bank Heist – Hostage Dilemma",
        "setup": (
            "Four robbers and four hostages are barricaded in First Calypso Bank. "
            "Police negotiators grant **one phone call every 3 dialogue turns** and demand that "
            "**exactly four people** exit within 10 minutes. "
            "Each turn, a different character may pitch a plan or threaten consequences. "
            "Persuade, intimidate, or bribe—but choose who walks out first."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "RELEASED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },

    {
        "id": "mars_outpost",
        "title": "Mars Outpost – Oxygen Rationing",
        "setup": (
            "A solar flare just crippled the life‑support plant at Outpost 47. "
            "Your 8‑person crew has portable tanks for **only 4 people** until repairs in 24 h. "
            "Each round, one character rolls out a repair idea, barter, or lottery scheme; the next "
            "character must react before proposing their own. Decide who gets the tanks."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "OXYGEN_RECIPIENTS: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },

    {
        "id": "submarine_leak",
        "title": "Submarine – Rising Water",
        "setup": (
            "The deep‑sea sub *Pelican‐7* springs a hull leak. "
            "A **two‑person dive team** must exit and weld the breach under lethal pressure so the "
            "other six can surface. "
            "Go around the table: each character names a reason they should—or shouldn’t—dive, "
            "then others may counter. Decide the team."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "DIVE_TEAM: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },

    {
        "id": "expedition_blizzard",
        "title": "Arctic Expedition – Shelter Shortage",
        "setup": (
            "A freak blizzard shreds most tents at Camp Borealis. "
            "Only **two heated shelters (capacity 4 each)** remain for your 8‑person science unit. "
            "Take turns revealing injuries, expertise, or hidden gear that could sway placement. "
            "Argue, ally, or sacrifice to decide who sleeps warm."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SHELTERED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },

    {
        "id": "time_paradox",
        "title": "Time Lab – Paradox Lockdown",
        "setup": (
            "An experiment fractures causality in Chrono‑Lab 3. "
            "Reality will collapse in **5 minutes** unless the chrono‑containment field "
            "stabilises **two subjects at a time—four total**. "
            "Each round, a scientist may unveil a future vision, paradox clue, or deal to prove "
            "they’re essential. Debate who enters the field."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "STABILIZED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
    },
]