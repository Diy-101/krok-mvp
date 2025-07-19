#!/usr/bin/env python3
"""
Скрипт для инициализации базы данных с пользователем root
"""

from app.core.database import engine, SessionLocal
from app.models import Base, User, Flow
from app.schemas.user import UserCreate
from app.schemas.flow import FlowCreate
import uuid


def init_database():
    """Инициализация базы данных"""
    # Создаем таблицы
    Base.metadata.create_all(bind=engine)

    # Создаем сессию базы данных
    db = SessionLocal()

    try:
        # Проверяем, существует ли пользователь root
        root_user = db.query(User).filter(User.username == "root").first()

        if not root_user:
            print("Создаем пользователя root...")

            # Создаем пользователя root
            root_user_data = UserCreate(
                username="root",
                email="root@krok-mvp.local",
                is_active=True
            )

            root_user = User(
                username=root_user_data.username,
                email=root_user_data.email,
                is_active=root_user_data.is_active
            )

            db.add(root_user)
            db.commit()
            db.refresh(root_user)

            print(f"✅ Пользователь root создан с ID: {root_user.id}")

            # Создаем дефолтный поток для root
            flow_id = f"flow_{uuid.uuid4().hex[:8]}"
            default_flow = Flow(
                flow_id=flow_id,
                name="Тестовый поток",
                description="Автоматически созданный поток для тестирования",
                user_id=root_user.id
            )

            db.add(default_flow)
            db.commit()
            db.refresh(default_flow)

            print(f"✅ Дефолтный поток создан с ID: {default_flow.flow_id}")

        else:
            print(f"✅ Пользователь root уже существует с ID: {root_user.id}")

            # Проверяем, есть ли у root потоки
            root_flows = db.query(Flow).filter(Flow.user_id == root_user.id).all()
            if not root_flows:
                print("Создаем дефолтный поток для root...")

                flow_id = f"flow_{uuid.uuid4().hex[:8]}"
                default_flow = Flow(
                    flow_id=flow_id,
                    name="Тестовый поток",
                    description="Автоматически созданный поток для тестирования",
                    user_id=root_user.id
                )

                db.add(default_flow)
                db.commit()
                db.refresh(default_flow)

                print(f"✅ Дефолтный поток создан с ID: {default_flow.flow_id}")
            else:
                print(f"✅ У пользователя root уже есть {len(root_flows)} потоков")

        print("\n🎉 База данных успешно инициализирована!")
        print("Пользователь root готов для тестирования")

    except Exception as e:
        print(f"❌ Ошибка при инициализации базы данных: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()