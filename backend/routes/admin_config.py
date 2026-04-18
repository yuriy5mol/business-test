from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db
from core.security import get_current_admin
from models import admin_config as crud

router = APIRouter(prefix="/admin/config", tags=["admin"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ConfigCreate(BaseModel):
    service_name: str
    service_slug: str
    budget_min: int = 0
    budget_max: int = 1_000_000
    budget_step: int = 10_000
    is_active: bool = True
    sort_order: int = 0


class ConfigUpdate(BaseModel):
    service_name: str | None = None
    service_slug: str | None = None
    budget_min: int | None = None
    budget_max: int | None = None
    budget_step: int | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class ConfigRead(ConfigCreate):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ConfigRead)
async def create_config(
    body: ConfigCreate, db: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)
):
    """Add a new service / budget config entry."""
    return await crud.create_config(db, body.model_dump())


@router.get("/", response_model=list[ConfigRead])
async def list_configs(
    only_active: bool = True, db: AsyncSession = Depends(get_db)
):
    """Return all config entries (active by default).
    Frontend calls this endpoint to build service list and slider ranges."""
    return await crud.get_all_configs(db, only_active=only_active)


@router.get("/{config_id}", response_model=ConfigRead)
async def get_config(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await crud.get_config(db, config_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Config not found")
    return config


@router.patch("/{config_id}", response_model=ConfigRead)
async def update_config(
    config_id: int, body: ConfigUpdate, db: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)
):
    updated = await crud.update_config(
        db, config_id, body.model_dump(exclude_none=True)
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Config not found")
    return updated


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(config_id: int, db: AsyncSession = Depends(get_db), admin: str = Depends(get_current_admin)) -> None:
    deleted = await crud.delete_config(db, config_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Config not found")
