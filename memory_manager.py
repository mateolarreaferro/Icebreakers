# memory_manager.py
"""
Simple profile-memory store

* Memories are kept in TinyDB (`memories.json`) for inspection / backup.
* A per-agent Chroma vector-store is persisted under `.vs_<agent>/`
  so similarity search survives restarts.
"""

from settings import OPENAI_API_KEY
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from tinydb import TinyDB, Query
from threading import Lock
import os

# persistent stores
_db = TinyDB("memories.json")
Q = Query()
_lock = Lock()

_emb = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

# Returns the directory path that holds an agent’s Chroma index.
def _vs_path(agent: str) -> str:
    """Directory that holds an agent’s Chroma index"""
    return f".vs_{agent}"

# Loads (or implicitly creates) the agent’s vector store for memory retrieval.
def _load_vs(agent: str) -> Chroma:
    """Load (or implicitly create) the agent’s vector store"""
    return Chroma(persist_directory=_vs_path(agent), embedding_function=_emb)

# Appends a raw memory string to the database and updates the corresponding vector store.
def add_memory(agent: str, text: str) -> None:
    """Append a raw memory string and update the vector store"""
    with _lock:
        _db.insert({"agent": agent, "text": text})
        _load_vs(agent).add_texts([text])

# retrieves up to *k* memories that are most similar to a given cue for a specified agent, using a vector store
def relevant(agent: str, cue: str, k: int = 3) -> list[str]:
    """
    Return up to *k* memories most similar to `cue`.
    Falls back to the last k raw strings if the agent
    has no vector index yet.
    """
    vs_dir = _vs_path(agent)
    if not os.path.exists(vs_dir):
        rows = _db.search(Q.agent == agent)[-k:]
        return [r["text"] for r in rows]

    docs = _load_vs(agent).similarity_search(cue, k)
    return [d.page_content for d in docs]
