from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.sql.base import get_db
from backend.sql.product import Category
from backend.sql.users import User, UserType
from backend.models.category import CategoryBase
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix='/category', tags=['category'])


@router.post(path='/create', status_code=201)
def create_category(
    category: CategoryBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
): 

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Only admins can create categories.")

    category_exists = db.scalar(
        select(Category).where(Category.name == category.name)
    )

    if category_exists is not None:
        raise HTTPException(status_code=409, detail="Category already exists.")

    new_category = Category(name=category.name)

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category