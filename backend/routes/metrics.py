from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db
from models import lead_metrics as crud
from models import analytics as analytics_crud

router = APIRouter(prefix="/metrics", tags=["metrics"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class MetricsCreate(BaseModel):
    lead_id: int
    time_on_page: int | None = None
    button_clicks: list | dict | None = None
    hover_zones: list | dict | None = None
    return_visits: int | None = None
    raw_events: list | None = None

class AnalyticsEventCreate(BaseModel):
    session_id: str
    time_on_page: int = 0
    cursor_x: int = 0
    cursor_y: int = 0
    window_width: int = 0
    window_height: int = 0
    clicks: list | None = None

class MetricsUpdate(BaseModel):
    time_on_page: int | None = None
    button_clicks: list | dict | None = None
    hover_zones: list | dict | None = None
    return_visits: int | None = None
    raw_events: list | None = None


class MetricsRead(MetricsCreate):
    collected_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=MetricsRead)
async def create_metrics(
    body: MetricsCreate, db: AsyncSession = Depends(get_db)
):
    """Save behaviour metrics sent by the frontend after form submission."""
    return await crud.create_metrics(db, body.model_dump())

@router.post("/analytics", status_code=status.HTTP_201_CREATED)
async def create_analytics_event(
    body: AnalyticsEventCreate, db: AsyncSession = Depends(get_db)
):
    """Save continuous anonymous analytics (cursor, clicks, time) for heatmaps."""
    await analytics_crud.create_analytics_event(db, body.model_dump())
    return {"status": "ok"}

@router.get("/analytics/summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    """Fetch the aggregated averages and heatmap points."""
    return await analytics_crud.get_analytics_summary(db)

@router.get("/{lead_id}", response_model=MetricsRead)
async def get_metrics(lead_id: int, db: AsyncSession = Depends(get_db)):
    metrics = await crud.get_metrics(db, lead_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="Metrics not found")
    return metrics


@router.patch("/{lead_id}", response_model=MetricsRead)
async def update_metrics(
    lead_id: int, body: MetricsUpdate, db: AsyncSession = Depends(get_db)
):
    updated = await crud.update_metrics(
        db, lead_id, body.model_dump(exclude_none=True)
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Metrics not found")
    return updated


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metrics(lead_id: int, db: AsyncSession = Depends(get_db)) -> None:
    deleted = await crud.delete_metrics(db, lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Metrics not found")
