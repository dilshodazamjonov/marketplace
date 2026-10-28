from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    created_at: datetime

class CategoryBase(BaseModel):

    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)