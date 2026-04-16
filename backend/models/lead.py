"""
Lead model — stores the main application form submitted by a warm client.

SQL (auto-generated via SQLAlchemy, for reference):
    CREATE TABLE leads (
        id          SERIAL PRIMARY KEY,
        first_name  VARCHAR(100) NOT NULL,
        last_name   VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        -- Contact
        email       VARCHAR(255),
        phone       VARCHAR(50),
        -- Business info
        business_info       TEXT,
        business_niche      VARCHAR(255),
        company_size        VARCHAR(100),
        role                VARCHAR(100),       -- "employee" / "manager"
        -- Task / needs
        task_volume         VARCHAR(100),
        task_deadline       VARCHAR(100),
        service_id          INTEGER REFERENCES admin_config(id),
        -- Budget
        budget              VARCHAR(100),
        -- Communication
        preferred_contact   VARCHAR(100),
        convenient_time     VARCHAR(100),
        -- Extra
        comments            TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
"""

from datetime import datetime

from sqlalchemy import String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Personal
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Contact
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Business info
    business_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_niche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Task / needs
    task_volume: Mapped[str | None] = mapped_column(String(100), nullable=True)
    task_deadline: Mapped[str | None] = mapped_column(String(100), nullable=True)

    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("admin_config.id"), nullable=True
    )
    service: Mapped["AdminConfig"] = relationship("AdminConfig")

    # Budget (stored as string, selected via slider on FE)
    budget: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Communication preferences
    preferred_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    convenient_time: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Extra
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# CRUD operations for Lead
# ---------------------------------------------------------------------------

from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_lead(db: AsyncSession, data: dict) -> Lead:
    """Insert a new lead and return the persisted object."""
    lead = Lead(**data)
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


async def get_lead(db: AsyncSession, lead_id: int) -> Lead | None:
    """Fetch a single lead by primary key."""
    return await db.get(Lead, lead_id)


async def get_leads(
    db: AsyncSession, skip: int = 0, limit: int = 100
) -> Sequence[Lead]:
    """Return a paginated list of all leads."""
    result = await db.execute(select(Lead).offset(skip).limit(limit))
    return result.scalars().all()


async def update_lead(
    db: AsyncSession, lead_id: int, data: dict
) -> Lead | None:
    """Partial-update a lead by primary key; returns None if not found."""
    lead = await db.get(Lead, lead_id)
    if lead is None:
        return None
    for key, value in data.items():
        setattr(lead, key, value)
    await db.commit()
    await db.refresh(lead)
    return lead


async def delete_lead(db: AsyncSession, lead_id: int) -> bool:
    """Delete a lead; returns True on success, False if not found."""
    lead = await db.get(Lead, lead_id)
    if lead is None:
        return False
    await db.delete(lead)
    await db.commit()
    return True
