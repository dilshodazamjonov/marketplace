from pydantic import BaseModel, EmailStr, Field, PastDate, StringConstraints
from typing import Annotated, Literal

# Trimmed, so " bob" and "bob" are the same user. Only here: passwords must never be trimmed.
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=50)]


class UserModel(BaseModel):
    username: Username
    email: EmailStr
    date_of_birth: PastDate
    user_type: Literal["buyer", "seller"] = "buyer"
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    # Every field is optional: only the ones sent are changed.
    username: Username | None = None
    email: EmailStr | None = None
    date_of_birth: PastDate | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

