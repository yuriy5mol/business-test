from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db
from models import lead as crud

router = APIRouter(prefix="/leads", tags=["leads"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: str | None = None
    email: str | None = None
    phone: str | None = None
    business_info: str | None = None
    business_niche: str | None = None
    company_size: str | None = None
    role: str | None = None
    task_volume: str | None = None
    task_deadline: str | None = None
    service_id: int | None = None
    budget: str | None = None
    preferred_contact: str | None = None
    convenient_time: str | None = None
    comments: str | None = None


class LeadUpdate(BaseModel):
    """All fields optional for partial updates."""
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    email: str | None = None
    phone: str | None = None
    business_info: str | None = None
    business_niche: str | None = None
    company_size: str | None = None
    role: str | None = None
    task_volume: str | None = None
    task_deadline: str | None = None
    service_id: int | None = None
    budget: str | None = None
    preferred_contact: str | None = None
    convenient_time: str | None = None
    comments: str | None = None


class LeadRead(LeadCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=LeadRead)
async def create_lead(body: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Submit a new lead from the landing page form."""
    return await crud.create_lead(db, body.model_dump())


@router.get("/", response_model=list[LeadRead])
async def list_leads(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """Return a paginated list of all leads (admin use)."""
    return await crud.get_leads(db, skip=skip, limit=limit)


@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await crud.get_lead(db, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadRead)
async def update_lead(
    lead_id: int, body: LeadUpdate, db: AsyncSession = Depends(get_db)
):
    updated = await crud.update_lead(
        db, lead_id, body.model_dump(exclude_none=True)
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return updated


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)) -> None:
    deleted = await crud.delete_lead(db, lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")
