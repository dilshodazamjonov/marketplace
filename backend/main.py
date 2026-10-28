from fastapi import FastAPI

from backend.sql import product, users  # noqa: F401 - registers the tables on Base
from backend.sql.base import Base, engine
from backend.auth import router as auth_router
from backend.product import router as product_router
from backend.category import router as category_router
from backend.admin import router as admin_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(product_router)
app.include_router(category_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}


