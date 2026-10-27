from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class ProductBase(BaseModel):

    title: str = Field(max_length=200)
    description: str
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category_id: UUID
    condition: str


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)   # lets it read from the SQLAlchemy object
    id: UUID
    seller_id: UUID
    created_at: datetime
