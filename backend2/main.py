from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.api import api_router
from app.crud import user as user_crud
from app.schemas.user import UserCreate
import uuid

# Создаем таблицы в базе данных
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Создаем пользователя root при запуске приложения"""
    from app.core.database import SessionLocal
    from app.models import User, Flow

    db = SessionLocal()
    try:
        # Проверяем, существует ли пользователь root
        root_user = db.query(User).filter(User.username == "root").first()

        if not root_user:
            print("🔧 Создаем пользователя root для тестирования...")

            # Создаем пользователя root
            root_user_data = UserCreate(
                username="root",
                email="root@krok-mvp.local",
                is_active=True
            )

            root_user = user_crud.create_user(db, root_user_data)
            print(f"✅ Пользователь root создан с ID: {root_user.id}")

            # Создаем дефолтный поток для root
            from app.crud import flow as flow_crud
            from app.schemas.flow import FlowCreate

            flow_id = f"flow_{uuid.uuid4().hex[:8]}"
            default_flow_data = FlowCreate(
                flow_id=flow_id,
                name="Тестовый поток",
                description="Автоматически созданный поток для тестирования",
                user_id=root_user.id
            )

            default_flow = flow_crud.create_flow(db, default_flow_data)
            print(f"✅ Дефолтный поток создан с ID: {default_flow.flow_id}")

        else:
            print(f"✅ Пользователь root уже существует (ID: {root_user.id})")

    except Exception as e:
        print(f"❌ Ошибка при создании пользователя root: {e}")
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Krok Nodes API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )