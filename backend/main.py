from fastapi import FastAPI

from backend.sql import product, users  # noqa: F401 - registers the tables on Base
from backend.sql.base import Base, engine
from backend.auth import router as auth_router

app = FastAPI()
app.include_router(auth_router)

@app.get("/health")
def health():
    return {"status": "ok"}


