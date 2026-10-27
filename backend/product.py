from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.sql.base import get_db
from backend.sql.product import Product, Category
from backend.sql.users import User, UserType
from backend.models.product import ProductBase, ProductResponse
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix="/product", tags=['product'])

@router.post(path='/create', status_code=201)
def create_product(
    product: ProductBase, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> ProductResponse:
    
    if current_user.user_type not in (UserType.admin, UserType.seller):
        raise HTTPException(status_code=403, detail="Only sellers can create products")

    category = db.scalar(
        select(Category).where(Category.id == product.category_id)
    )

    if category is None:
        raise HTTPException(status_code=404, detail="Category with that id doesn't exist")

    new_product = Product(
        **product.model_dump(),
        seller_id=current_user.id
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return ProductResponse.model_validate(new_product)
