from fastapi import APIRouter
from app.api.endpoints import nodes, flows, users

api_router = APIRouter()
api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(flows.router, prefix="/flows", tags=["flows"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
