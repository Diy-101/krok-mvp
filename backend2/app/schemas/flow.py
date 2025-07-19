from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FlowBase(BaseModel):
    flow_id: str
    name: str
    description: Optional[str] = None
    user_id: int


class FlowCreate(FlowBase):
    pass


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Flow(FlowBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True