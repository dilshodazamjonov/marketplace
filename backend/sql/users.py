import enum
import uuid
from datetime import date, datetime

from sqlalchemy import UUID, Boolean, DateTime, Date, Enum, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from backend.sql.base import Base

class UserType(str, enum.Enum):
    buyer = "buyer"
    seller = "seller"
    admin = "admin"

class User(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=True)
    user_type: Mapped[str] = mapped_column(
        Enum(UserType, name="user_type"), 
        nullable=False, 
        default=UserType.buyer, 
        server_default=UserType.buyer.value
        )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

