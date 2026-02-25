"""
Verbindung zur PostgreSQL-Datenbank (z. B. Supabase) per SQLAlchemy.
Läuft unabhängig von der Next.js-App.

.env (im Projektroot) z. B.:
  user=postgres
  password=DEIN_DB_PASSWORT
  host=db.hkzhtjnwhlnqjokxoqmt.supabase.co
  port=5432
  dbname=postgres

Supabase: Einstellungen → Project Settings → Database → Connection string / Connection info.
"""

from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"

engine = create_engine(DATABASE_URL)

if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("Connection successful!")
    except Exception as e:
        print(f"Failed to connect: {e}")
