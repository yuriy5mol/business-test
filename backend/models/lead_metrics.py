"""
LeadMetrics model — stores user behaviour data captured by the frontend.

Relation: one-to-one with Lead (lead_id is both FK and PK).

SQL (auto-generated via SQLAlchemy, for reference):
    CREATE TABLE lead_metrics (
        lead_id         INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
        time_on_page    INTEGER,          -- seconds
        button_clicks   JSONB,            -- [{"element": "...", "count": N}]
        hover_zones     JSONB,            -- [{"zone": "...", "seconds": N}]
        return_visits   INTEGER,
        raw_events      JSONB,            -- full event log array from FE
        collected_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
"""

from datetime import datetime

from sqlalchemy import Integer, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class LeadMetrics(Base):
    __tablename__ = "lead_metrics"

    # PK == FK (one-to-one with Lead)
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True
    )

    time_on_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    button_clicks: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    hover_zones: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    return_visits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_events: Mapped[list | None] = mapped_column(JSON, nullable=True)

    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# CRUD operations for LeadMetrics
# ---------------------------------------------------------------------------

from sqlalchemy.ext.asyncio import AsyncSession


async def create_metrics(db: AsyncSession, data: dict) -> LeadMetrics:
    """Insert metrics for a lead."""
    metrics = LeadMetrics(**data)
    db.add(metrics)
    await db.commit()
    await db.refresh(metrics)
    return metrics


async def get_metrics(db: AsyncSession, lead_id: int) -> LeadMetrics | None:
    """Fetch metrics by lead_id."""
    return await db.get(LeadMetrics, lead_id)


async def update_metrics(
    db: AsyncSession, lead_id: int, data: dict
) -> LeadMetrics | None:
    """Partial-update metrics; returns None if not found."""
    metrics = await db.get(LeadMetrics, lead_id)
    if metrics is None:
        return None
    for key, value in data.items():
        setattr(metrics, key, value)
    await db.commit()
    await db.refresh(metrics)
    return metrics


async def delete_metrics(db: AsyncSession, lead_id: int) -> bool:
    """Delete metrics row; returns True on success."""
    metrics = await db.get(LeadMetrics, lead_id)
    if metrics is None:
        return False
    await db.delete(metrics)
    await db.commit()
    return True
