# scenarios.py

scenarios = [
    {
        "id": "lifeboat",
        "title": "Spaceship – Lifeboat Crisis",
        "setup": (
            "You are the 10-person crew of the research vessel *Aeon*. "
            "A reactor fault will destroy the ship in 10 minutes. "
            "The only escape pod holds 5. "
            "Hold an emergency meeting and decide who launches."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SURVIVORS: <comma-separated list of names>"
        ),
    },

    {
        "id": "bank_heist",
        "title": "Bank Heist – Hostage Dilemma",
        "setup": (
            "Six robbers and eight hostages are trapped inside a bank surrounded by police. "
            "Negotiations give 10 minutes to release exactly six people, total. "
            "Decide who walks out first to maximize everyone’s chance of living."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "RELEASED: <comma-separated list of names>"
        ),
    },

    {
        "id": "mars_outpost",
        "title": "Mars Outpost – Oxygen Rationing",
        "setup": (
            "A solar flare has crippled the life-support plant at Mars Outpost 47. "
            "Your 12-person team has backup tanks for only seven people until repairs finish in 24 hours. "
            "Hold a council and decide who gets the tanks."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "OXYGEN_RECIPIENTS: <comma-separated list of names>"
        ),
    },

    {
        "id": "submarine_leak",
        "title": "Submarine – Rising Water",
        "setup": (
            "A deep-sea research sub with nine crew springs a hull leak. "
            "Sealing the breach from outside requires a two-person dive team but exposes them to lethal pressure. "
            "Choose who dives so the rest can surface safely."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "DIVE_TEAM: <comma-separated list of names>"
        ),
    },

    {
        "id": "expedition_blizzard",
        "title": "Arctic Expedition – Shelter Shortage",
        "setup": (
            "A sudden blizzard destroys most tents at your remote Arctic camp. "
            "Only four heated shelters remain for a 14-member team. "
            "You have 15 minutes before temperatures drop to −50 °C. Decide who uses the shelters."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SHELTERED: <comma-separated list of names>"
        ),
    },

    {
        "id": "time_paradox",
        "title": "Time Lab – Paradox Lockdown",
        "setup": (
            "A temporal experiment has fractured reality. "
            "The lab’s chrono-containment field can stabilize only three of the eight scientists before the paradox collapses everything in five minutes. "
            "Hold an emergency debate on who enters the field."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "STABILIZED: <comma-separated list of names>"
        ),
    },
]
