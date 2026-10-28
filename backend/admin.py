from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import delete, func, or_, select

from backend.sql.base import get_db
from backend.sql.users import User, UserType
from backend.sql.product import Category, Product, ProductEvent
from backend.sql.tokens import RefreshToken
from backend.models.admin import (
    ActivityResponse, RoleUpdate, StatsResponse, StatusUpdate, UserDetailResponse, UserResponse
)
from backend.utils.auth_utils import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Admins only.")

    return current_user


# Every route in this file is admin-only.
router = APIRouter(prefix='/admin', tags=['admin'], dependencies=[Depends(require_admin)])


@router.get(path='/stats', response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):

    users = dict(
        db.execute(select(User.user_type, func.count()).group_by(User.user_type)).all()
    )

    return {
        "users": {user_type.value: users.get(user_type, 0) for user_type in UserType},
        "products": db.scalar(select(func.count()).select_from(Product)),
        "categories": db.scalar(select(func.count()).select_from(Category))
    }


@router.get(path='/users', response_model=list[UserResponse])
def list_users(q: str | None = None, role: UserType | None = None, db: Session = Depends(get_db)):

    query = select(User).order_by(User.created_at.desc())

    if q:
        query = query.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))

    if role is not None:
        query = query.where(User.user_type == role)

    return db.scalars(query).all()


@router.get(path='/users/{user_id}', response_model=UserDetailResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)):

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    products_count = db.scalar(
        select(func.count()).select_from(Product).where(Product.seller_id == user.id)
    )

    return UserDetailResponse(**UserResponse.model_validate(user).model_dump(), products_count=products_count)


@router.patch(path='/users/{user_id}/role', response_model=UserResponse)
def update_user_role(
    user_id: UUID,
    body: RoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    # Otherwise the last admin could demote themselves and lock everyone out.
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't change your own role.")

    user.user_type = body.user_type
    db.commit()
    db.refresh(user)

    return user


@router.patch(path='/users/{user_id}/status', response_model=UserResponse)
def update_user_status(
    user_id: UUID,
    body: StatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't suspend your own account.")

    user.is_active = body.is_active

    # Suspending signs them out everywhere: their refresh tokens stop working right away.
    if not body.is_active:
        db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    db.commit()
    db.refresh(user)

    return user


@router.delete(path='/users/{user_id}', status_code=204)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account.")

    has_products = db.scalar(
        select(Product.id).where(Product.seller_id == user.id).limit(1)
    )

    if has_products is not None:
        raise HTTPException(
            status_code=409,
            detail="This user still has listings. Remove them first, or suspend the account instead."
        )

    db.delete(user)
    db.commit()


@router.get(path='/activity', response_model=list[ActivityResponse])
def list_activity(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):

    return db.scalars(
        select(ProductEvent).order_by(ProductEvent.created_at.desc()).limit(limit)
    ).all()
