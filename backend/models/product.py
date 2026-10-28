from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class ProductBase(BaseModel):

    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category_id: UUID
    condition: str = Field(min_length=1, max_length=200)


class ProductUpdate(BaseModel):

    # Every field is optional: only the ones sent are changed.
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    category_id: UUID | None = None
    condition: str | None = Field(default=None, min_length=1, max_length=200)


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)   # lets it read from the SQLAlchemy object
    id: UUID
    seller_id: UUID
    created_at: datetime


class ProductDetailResponse(ProductResponse):
    seller_username: str
    category_name: str
