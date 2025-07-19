from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud import flow as flow_crud
from app.crud import user as user_crud
from app.schemas.flow import Flow, FlowCreate, FlowUpdate

router = APIRouter()


@router.get("/", response_model=List[Flow])
def get_flows(user_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить все потоки или потоки конкретного пользователя"""
    if user_id:
        return flow_crud.get_flows_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return flow_crud.get_all_flows(db, skip=skip, limit=limit)


@router.get("/{flow_id}", response_model=Flow)
def get_flow(flow_id: str, db: Session = Depends(get_db)):
    """Получить поток по ID"""
    db_flow = flow_crud.get_flow(db, flow_id=flow_id)
    if db_flow is None:
        raise HTTPException(status_code=404, detail="Поток не найден")
    return db_flow


@router.post("/", response_model=Flow, status_code=status.HTTP_201_CREATED)
def create_flow(flow: FlowCreate, db: Session = Depends(get_db)):
    """Создать новый поток"""
    db_flow = flow_crud.get_flow(db, flow_id=flow.flow_id)
    if db_flow:
        raise HTTPException(status_code=400, detail="Поток с таким ID уже существует")
    return flow_crud.create_flow(db=db, flow=flow)


@router.put("/{flow_id}", response_model=Flow)
def update_flow(flow_id: str, flow: FlowUpdate, db: Session = Depends(get_db)):
    """Обновить поток"""
    db_flow = flow_crud.update_flow(db, flow_id=flow_id, flow_update=flow)
    if db_flow is None:
        raise HTTPException(status_code=404, detail="Поток не найден")
    return db_flow


@router.delete("/{flow_id}")
def delete_flow(flow_id: str, db: Session = Depends(get_db)):
    """Удалить поток"""
    success = flow_crud.delete_flow(db, flow_id=flow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Поток не найден")
    return {"message": "Поток успешно удален"}


@router.post("/create-default/{user_id}", response_model=Flow)
def create_default_flow_for_user(user_id: int, db: Session = Depends(get_db)):
    """Создать дефолтный поток для пользователя"""
    # Проверяем, что пользователь существует
    db_user = user_crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    return flow_crud.create_default_flow_for_user(db, user_id=user_id)