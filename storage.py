# storage.py
from tinydb import TinyDB, Query
db = TinyDB("agents.json")
Q  = Query()

def upsert_profile(profile: dict):
    db.upsert(profile, Q.name == profile["name"])

def get_profile(name: str) -> dict | None:
    res = db.search(Q.name == name)
    return res[0] if res else None
