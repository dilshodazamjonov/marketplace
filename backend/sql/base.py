import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(os.environ["DATABASE_URL"])

class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(bind=engine)

def get_db():
    with SessionLocal() as db:
        yield db
