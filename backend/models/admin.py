from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from backend.sql.users import UserType


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)   # lets it read from the SQLAlchemy object
    id: UUID
    username: str
    email: str
    user_type: UserType
    date_of_birth: date | None
    is_active: bool
    created_at: datetime


class UserDetailResponse(UserResponse):
    products_count: int


class RoleUpdate(BaseModel):
    user_type: UserType


class StatusUpdate(BaseModel):
    is_active: bool


class StatsResponse(BaseModel):
    users: dict[str, int]
    products: int
    categories: int


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    event_type: str
    user_id: UUID
    product_id: UUID
    created_at: datetime
