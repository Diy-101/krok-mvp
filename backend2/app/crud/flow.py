from sqlalchemy.orm import Session
from app.models.flow import Flow
from app.schemas.flow import FlowCreate, FlowUpdate
from typing import List, Optional


def get_flow(db: Session, flow_id: str) -> Optional[Flow]:
    return db.query(Flow).filter(Flow.flow_id == flow_id).first()


def get_all_flows(db: Session, skip: int = 0, limit: int = 100) -> List[Flow]:
    return db.query(Flow).offset(skip).limit(limit).all()


def get_flows_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Flow]:
    return db.query(Flow).filter(Flow.user_id == user_id).offset(skip).limit(limit).all()


def create_flow(db: Session, flow: FlowCreate) -> Flow:
    db_flow = Flow(
        flow_id=flow.flow_id,
        name=flow.name,
        description=flow.description,
        user_id=flow.user_id
    )
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow


def update_flow(db: Session, flow_id: str, flow_update: FlowUpdate) -> Optional[Flow]:
    db_flow = get_flow(db, flow_id)
    if db_flow:
        update_data = flow_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_flow, field, value)
        db.commit()
        db.refresh(db_flow)
    return db_flow


def delete_flow(db: Session, flow_id: str) -> bool:
    db_flow = get_flow(db, flow_id)
    if db_flow:
        db.delete(db_flow)
        db.commit()
        return True
    return False


def create_default_flow_for_user(db: Session, user_id: int) -> Flow:
    """Создает дефолтный поток для пользователя"""
    from app.crud import flow as flow_crud
    import uuid

    flow_id = f"flow_{uuid.uuid4().hex[:8]}"
    default_flow = FlowCreate(
        flow_id=flow_id,
        name="Мой первый поток",
        description="Автоматически созданный поток",
        user_id=user_id
    )
    return create_flow(db, default_flow)