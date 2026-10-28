from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from backend.sql.base import get_db
from backend.sql.product import Category, Product
from backend.sql.users import User, UserType
from backend.models.category import CategoryBase, CategoryResponse
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix='/category', tags=['category'])


@router.post(path='/create', status_code=201, response_model=CategoryResponse)
def create_category(
    category: CategoryBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
): 

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Only admins can create categories.")

    category_exists = db.scalar(
        select(Category).where(func.lower(Category.name) == category.name.lower())
    )

    if category_exists is not None:
        raise HTTPException(status_code=409, detail="Category already exists.")

    new_category = Category(name=category.name)

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category

@router.get("/list", response_model=list[CategoryResponse], dependencies=[Depends(get_current_user)])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@router.patch(path='/{category_id}', response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    category: CategoryBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Only admins can edit categories.")

    existing_category = db.get(Category, category_id)

    if existing_category is None:
        raise HTTPException(status_code=404, detail="Category not found.")

    name_taken = db.scalar(
        select(Category).where(func.lower(Category.name) == category.name.lower(), Category.id != category_id)
    )

    if name_taken is not None:
        raise HTTPException(status_code=409, detail="Category already exists.")

    existing_category.name = category.name
    db.commit()
    db.refresh(existing_category)

    return existing_category


@router.delete(path='/{category_id}', status_code=204)
def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete categories.")

    existing_category = db.get(Category, category_id)

    if existing_category is None:
        raise HTTPException(status_code=404, detail="Category not found.")

    in_use = db.scalar(
        select(Product.id).where(Product.category_id == category_id).limit(1)
    )

    if in_use is not None:
        raise HTTPException(status_code=409, detail="Products still use this category.")

    db.delete(existing_category)
    db.commit()

