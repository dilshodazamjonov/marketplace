from datetime import date
from pydantic import BaseModel, EmailStr, Field
from typing import Literal


class UserModel(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    date_of_birth: date
    user_type: Literal["buyer", "seller"] = "buyer"
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

