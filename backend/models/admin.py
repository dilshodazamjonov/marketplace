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
    created_at: datetime
