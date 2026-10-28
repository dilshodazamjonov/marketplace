import uuid
from sqlalchemy import ForeignKey, DateTime, UUID, String, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.sql.base import Base
from datetime import datetime

class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID, index=True, nullable=False)   # one per sign-in
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # sha256, never the raw token
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
