from datetime import date
from pydantic import BaseModel, EmailStr, Field


class UserModel(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    date_of_birth: date
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

