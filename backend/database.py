import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database directory and URL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "exam_generator.db")

# Support custom DATABASE_URL (e.g. PostgreSQL, Supabase, Neon) or Vercel /tmp fallback
CUSTOM_DB_URL = os.environ.get("DATABASE_URL")

if CUSTOM_DB_URL:
    DATABASE_URL = CUSTOM_DB_URL
elif os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    # On Vercel / serverless, copy pre-seeded database to writable /tmp
    TMP_DB = "/tmp/exam_generator.db"
    if not os.path.exists(TMP_DB):
        if os.path.exists(DB_FILE):
            shutil.copyfile(DB_FILE, TMP_DB)
        else:
            # Check alternative path
            root_db = os.path.join(os.path.dirname(BASE_DIR), "backend", "exam_generator.db")
            if os.path.exists(root_db):
                shutil.copyfile(root_db, TMP_DB)
    DATABASE_URL = f"sqlite:///{TMP_DB}"
else:
    DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
