from fastapi import FastAPI

from backend.sql import product, users  # noqa: F401 - registers the tables on Base
from backend.sql.base import Base, engine

Base.metadata.create_all(engine)

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}
