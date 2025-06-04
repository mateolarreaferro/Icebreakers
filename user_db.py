import sqlite3
import json
from datetime import datetime
import os
import threading
import time

DB_PATH = "users.db"
# Thread lock for database operations
db_lock = threading.Lock()

def get_db_connection():
    """Get a database connection with proper timeout and WAL mode"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.execute('PRAGMA cache_size=1000')
    conn.execute('PRAGMA temp_store=memory')
    return conn

def init_user_db():
    """Initialize the user database"""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                google_session_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                profile_picture_url TEXT,
                join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_messages INTEGER DEFAULT 0,
                rooms_joined INTEGER DEFAULT 0,
                favorite_icebreakers TEXT,  -- JSON array
                stats TEXT,  -- JSON object for additional stats
                current_room_id TEXT,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_room_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_session_id TEXT,
                room_session_id TEXT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                messages_sent INTEGER DEFAULT 0,
                ready_votes INTEGER DEFAULT 0,
                FOREIGN KEY (google_session_id) REFERENCES users (google_session_id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS room_ready_status (
                room_session_id TEXT,
                google_session_id TEXT,
                is_ready BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (room_session_id, google_session_id)
            )
        ''')
        
        conn.commit()
        conn.close()

def create_or_update_user(google_session_id, display_name, profile_picture_url=None):
    """Create or update a user using UPSERT for better concurrency"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Use INSERT OR REPLACE for atomic upsert operation
            cursor.execute('''
                INSERT OR REPLACE INTO users 
                (google_session_id, display_name, profile_picture_url, 
                 join_date, total_messages, rooms_joined, favorite_icebreakers, stats, last_active)
                VALUES (?, ?, ?, 
                        COALESCE((SELECT join_date FROM users WHERE google_session_id = ?), CURRENT_TIMESTAMP),
                        COALESCE((SELECT total_messages FROM users WHERE google_session_id = ?), 0),
                        COALESCE((SELECT rooms_joined FROM users WHERE google_session_id = ?), 0),
                        COALESCE((SELECT favorite_icebreakers FROM users WHERE google_session_id = ?), '[]'),
                        COALESCE((SELECT stats FROM users WHERE google_session_id = ?), '{}'),
                        CURRENT_TIMESTAMP)
            ''', (google_session_id, display_name, profile_picture_url,
                  google_session_id, google_session_id, google_session_id, 
                  google_session_id, google_session_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating/updating user: {e}")
            if 'conn' in locals():
                conn.close()
            return False

def get_user(google_session_id):
    """Get user by Google session ID"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM users WHERE google_session_id = ?', (google_session_id,))
            user = cursor.fetchone()
            conn.close()
            
            if user:
                return {
                    'google_session_id': user[0],
                    'display_name': user[1],
                    'profile_picture_url': user[2],
                    'join_date': user[3],
                    'total_messages': user[4],
                    'rooms_joined': user[5],
                    'favorite_icebreakers': json.loads(user[6]) if user[6] else [],
                    'stats': json.loads(user[7]) if user[7] else {},
                    'current_room_id': user[8],
                    'last_active': user[9]
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            if 'conn' in locals():
                conn.close()
            return None

def update_user_stats(google_session_id, message_sent=False, room_joined=False):
    """Update user statistics"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if message_sent:
                cursor.execute('''
                    UPDATE users SET total_messages = total_messages + 1, last_active = CURRENT_TIMESTAMP
                    WHERE google_session_id = ?
                ''', (google_session_id,))
            
            if room_joined:
                cursor.execute('''
                    UPDATE users SET rooms_joined = rooms_joined + 1, last_active = CURRENT_TIMESTAMP
                    WHERE google_session_id = ?
                ''', (google_session_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating user stats: {e}")
            if 'conn' in locals():
                conn.close()
            return False

def set_user_ready_status(room_session_id, google_session_id, is_ready):
    """Set user's ready status for a room"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO room_ready_status 
                (room_session_id, google_session_id, is_ready, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (room_session_id, google_session_id, is_ready))
            
            if is_ready:
                cursor.execute('''
                    UPDATE user_room_history SET ready_votes = ready_votes + 1
                    WHERE room_session_id = ? AND google_session_id = ?
                ''', (room_session_id, google_session_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error setting ready status: {e}")
            if 'conn' in locals():
                conn.close()
            return False

def get_room_ready_status(room_session_id):
    """Get ready status for all users in a room"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT google_session_id, is_ready FROM room_ready_status 
                WHERE room_session_id = ?
            ''', (room_session_id,))
            
            ready_status = cursor.fetchall()
            conn.close()
            
            return {user_id: bool(ready) for user_id, ready in ready_status}
        except Exception as e:
            print(f"Error getting room ready status: {e}")
            if 'conn' in locals():
                conn.close()
            return {}

def join_user_to_room(google_session_id, room_session_id):
    """Record user joining a room"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR IGNORE INTO user_room_history 
                (google_session_id, room_session_id)
                VALUES (?, ?)
            ''', (google_session_id, room_session_id))
            
            cursor.execute('''
                UPDATE users SET current_room_id = ? WHERE google_session_id = ?
            ''', (room_session_id, google_session_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error joining user to room: {e}")
            if 'conn' in locals():
                conn.close()
            return False

def get_user_stats(google_session_id):
    """Get comprehensive user statistics"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get basic user info
            user = get_user(google_session_id)
            if not user:
                return None
            
            # Get room participation stats
            cursor.execute('''
                SELECT COUNT(*) as rooms_participated, 
                       SUM(messages_sent) as total_messages_in_rooms,
                       SUM(ready_votes) as total_ready_votes
                FROM user_room_history 
                WHERE google_session_id = ?
            ''', (google_session_id,))
            
            room_stats = cursor.fetchone()
            conn.close()
            
            return {
                **user,
                'rooms_participated': room_stats[0] if room_stats[0] else 0,
                'total_messages_in_rooms': room_stats[1] if room_stats[1] else 0,
                'total_ready_votes': room_stats[2] if room_stats[2] else 0
            }
        except Exception as e:
            print(f"Error getting user stats: {e}")
            if 'conn' in locals():
                conn.close()
            return None

def leave_user_from_room(google_session_id, room_session_id=None):
    """Record user leaving a room and clear current room data"""
    with db_lock:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Clear current room
            cursor.execute('''
                UPDATE users SET current_room_id = NULL WHERE google_session_id = ?
            ''', (google_session_id,))
            
            # Clear ready status for the specific room if provided
            if room_session_id:
                cursor.execute('''
                    DELETE FROM room_ready_status 
                    WHERE google_session_id = ? AND room_session_id = ?
                ''', (google_session_id, room_session_id))
            else:
                # Clear all ready status for user
                cursor.execute('''
                    DELETE FROM room_ready_status WHERE google_session_id = ?
                ''', (google_session_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error removing user from room: {e}")
            if 'conn' in locals():
                conn.close()
            return False

# Initialize the database when imported
init_user_db()
