# storage.py
from tinydb import TinyDB, Query


db = TinyDB("agents.json")
Q = Query()

# Insert a new profile or update an existing profile in the database based on the profile's name.
def upsert_profile(profile: dict):
    db.upsert(profile, Q.name == profile["name"])

# Retrieve a profile from the database by name. Returns the profile dictionary if found, otherwise returns None.
def get_profile(name: str) -> dict | None:
    res = db.search(Q.name == name)
    return res[0] if res else None

# Return a sorted list of all stored profile names from the database.
def list_profiles() -> list[str]:
    return sorted(r["name"] for r in db.all())

