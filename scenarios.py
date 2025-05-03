# scenarios.py  ·  v3  (≤ 8 agents, twist lists for random events)

scenarios = [
    {
        "id": "lifeboat",
        "title": "Spaceship – Lifeboat Crisis",
        "setup": (
            "You are the 8‑person bridge crew of the research vessel *Aeon*. "
            "A plasma‑reactor fault will blow the ship apart in 10 minutes. "
            "The only escape pod holds 4. Reveal skills and secrets, bargain, decide who ejects."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SURVIVORS: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "A radiation surge knocks out half the escape‑pod controls.",
            "Life‑support alarms blare: CO₂ scrubbers fail in 5 minutes.",
            "A sealed locker pops open revealing one extra EVA suit.",
            "Meteor shrapnel punches a hole in the corridor—deck is depressurising.",
            "A crewmate collapses, injured; they’ll need help to reach the pod.",
            "The ship’s AI announces an unknown life‑form in engineering."
        ],
    },

    {
        "id": "bank_heist",
        "title": "Bank Heist – Hostage Dilemma",
        "setup": (
            "Four robbers and four hostages are barricaded in First Calypso Bank. "
            "Police demand exactly four people exit within 10 minutes. Debate who leaves."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "RELEASED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "SWAT cuts the power—lights go red and emergency batteries kick in.",
            "A hostage fakes chest pains, begging to be released first.",
            "Police slide a burner phone inside: they want proof of life on video.",
            "One robber’s mask slips; a hostage recognises them and starts shouting.",
            "Tear‑gas canister clinks through a window but doesn’t discharge—yet.",
            "Cash‑tray dye packs explode, coating everyone in blue ink."
        ],
    },

    {
        "id": "mars_outpost",
        "title": "Mars Outpost – Oxygen Rationing",
        "setup": (
            "Solar flare wrecked the life‑support plant at Outpost 47. "
            "Eight crew, portable O₂ for four. Choose who gets the tanks."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "OXYGEN_RECIPIENTS: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "Ground‑quakes shake the habitat; one tank ruptures, losing 20 % capacity.",
            "Diagnostics show repairs need a spare chip only one crew member carries.",
            "Solar flare knocks out comms—no help for 36 hours instead of 24.",
            "A dust‑storm tears a panel loose, venting atmosphere in lab 2.",
            "An old rover might serve as a makeshift shelter if someone repairs it.",
            "A crew member admits they sabotaged the plant to hide embezzlement."
        ],
    },

    {
        "id": "submarine_leak",
        "title": "Submarine – Rising Water",
        "setup": (
            "Deep‑sea sub *Pelican‑7* is flooding. Two must dive outside to weld the hull. "
            "Pick the dive team."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "DIVE_TEAM: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "Pressure equaliser jams—internal pressure rising 0.5 bar per minute.",
            "Sonar detects approaching sharks attracted by the leak’s vibrations.",
            "Battery levels drop to 15 %—life‑support lasts 25 minutes tops.",
            "A weld kit is missing; someone must retrieve it from the flooded hold.",
            "Radio crackles with a garbled rescue ETA—could be 10 min or 60.",
            "A crew member confesses fear of diving due to a past accident."
        ],
    },

    {
        "id": "expedition_blizzard",
        "title": "Arctic Expedition – Shelter Shortage",
        "setup": (
            "Blizzard shreds tents at Camp Borealis. Two heated shelters (4 beds each) for eight scientists. Decide who sleeps warm."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "SHELTERED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "Wind speed doubles; wind‑chill drops to −70 °C.",
            "Satellite phone battery is dying; one call left.",
            "A polar bear circles the camp, attracted by rations.",
            "A hidden crevasse opens near the supply sled.",
            "One shelter’s heater sputters—needs spare fuse.",
            "Frostbite sets in on someone’s fingers; medical kit is limited."
        ],
    },

    {
        "id": "time_paradox",
        "title": "Time Lab – Paradox Lockdown",
        "setup": (
            "Chrono‑Lab 3 is fracturing causality. Field can stabilise four people total. Debate who enters."
        ),
        "survival_rule": (
            "After the dialogue, END WITH exactly one line:\n"
            "STABILIZED: <comma‑separated list of names>"
        ),
        "max_agents": 8,
        "twists": [
            "A future version of one scientist appears, begging to be saved first.",
            "Time‑waves age equipment 30 years—control panels crumble.",
            "Security cameras show the lab exploding in 90 seconds unless circuits reroute.",
            "Anomaly swaps two scientists’ memories—panic ensues.",
            "A paradox clone claims it alone can recalibrate the field.",
            "Temporal echo predicts only three will survive any choice."
        ],
    },
]
