from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.sql.base import get_db
from backend.sql.users import User, UserType
from backend.models.admin import UserResponse
from backend.utils.auth_utils import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:

    if current_user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Admins only.")

    return current_user


# Every route in this file is admin-only.
router = APIRouter(prefix='/admin', tags=['admin'], dependencies=[Depends(require_admin)])


@router.get(path='/users', response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):

    return db.scalars(
        select(User).order_by(User.created_at.desc())
    ).all()
