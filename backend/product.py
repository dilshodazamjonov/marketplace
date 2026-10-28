from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, select

from backend.sql.base import get_db
from backend.sql.product import Product, Category
from backend.sql.users import User, UserType
from backend.models.product import ProductBase, ProductDetailResponse, ProductResponse, ProductUpdate
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix="/product", tags=['product'])

SORT_ORDERS = {
    "newest": Product.created_at.desc(),
    "price_asc": Product.price.asc(),
    "price_desc": Product.price.desc(),
}

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


@router.get(path='/list', response_model=list[ProductResponse], dependencies=[Depends(get_current_user)])
def list_products(
    q: str | None = None,
    category_id: UUID | None = None,
    seller_id: UUID | None = None,
    sort: Literal["newest", "price_asc", "price_desc"] = "newest",
    db: Session = Depends(get_db)
):

    query = select(Product).order_by(SORT_ORDERS[sort])

    if q:
        query = query.where(or_(Product.title.ilike(f"%{q}%"), Product.description.ilike(f"%{q}%")))

    if category_id is not None:
        query = query.where(Product.category_id == category_id)

    if seller_id is not None:
        query = query.where(Product.seller_id == seller_id)

    return db.scalars(query).all()


@router.get(path='/{product_id}', response_model=ProductDetailResponse, dependencies=[Depends(get_current_user)])
def get_product(product_id: UUID, db: Session = Depends(get_db)):

    row = db.execute(
        select(Product, User.username, Category.name)
        .join(User, User.id == Product.seller_id)
        .join(Category, Category.id == Product.category_id)
        .where(Product.id == product_id)
    ).first()

    if row is None:
        raise HTTPException(status_code=404, detail="Product not found.")

    product, seller_username, category_name = row

    return ProductDetailResponse(
        **ProductResponse.model_validate(product).model_dump(),
        seller_username=seller_username,
        category_name=category_name
    )


@router.patch(path='/{product_id}', response_model=ProductResponse)
def update_product(
    product_id: UUID,
    changes: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")

    if product.seller_id != current_user.id and current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="You can only edit your own products.")

    if changes.category_id is not None and db.get(Category, changes.category_id) is None:
        raise HTTPException(status_code=404, detail="Category with that id doesn't exist")

    # exclude_none: a field sent as null is ignored instead of erasing a required column.
    for field, value in changes.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


@router.delete(path='/{product_id}', status_code=204)
def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Admins can remove any listing (moderation).
    if product.seller_id != current_user.id and current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="You can only delete your own products.")

    db.delete(product)
    db.commit()
