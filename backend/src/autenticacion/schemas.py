from pydantic import BaseModel
from src.personal.schemas import Personal


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    persona: Personal
