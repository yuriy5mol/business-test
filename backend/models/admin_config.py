"""
AdminConfig model — stores editable service & budget configuration
that the frontend reads to render dynamic UI (service list, budget slider, etc.).

SQL (auto-generated via SQLAlchemy, for reference):
    CREATE TABLE admin_config (
        id              SERIAL PRIMARY KEY,
        service_name    VARCHAR(255) NOT NULL,
        service_slug    VARCHAR(100) NOT NULL UNIQUE,
        budget_min      INTEGER NOT NULL DEFAULT 0,
        budget_max      INTEGER NOT NULL DEFAULT 1000000,
        budget_step     INTEGER NOT NULL DEFAULT 10000,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        sort_order      INTEGER NOT NULL DEFAULT 0,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
"""

from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AdminConfig(Base):
    __tablename__ = "admin_config"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    service_name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Budget slider parameters (in roubles / any currency unit)
    budget_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    budget_max: Mapped[int] = mapped_column(Integer, nullable=False, default=1_000_000)
    budget_step: Mapped[int] = mapped_column(Integer, nullable=False, default=10_000)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# CRUD operations for AdminConfig
# ---------------------------------------------------------------------------

from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_config(db: AsyncSession, data: dict) -> AdminConfig:
    """Insert a new admin config entry."""
    config = AdminConfig(**data)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def get_config(db: AsyncSession, config_id: int) -> AdminConfig | None:
    """Fetch a config entry by primary key."""
    return await db.get(AdminConfig, config_id)


async def get_all_configs(
    db: AsyncSession, only_active: bool = True
) -> Sequence[AdminConfig]:
    """Return all config entries, optionally filtered to active ones only."""
    stmt = select(AdminConfig).order_by(AdminConfig.sort_order)
    if only_active:
        stmt = stmt.where(AdminConfig.is_active.is_(True))
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_config(
    db: AsyncSession, config_id: int, data: dict
) -> AdminConfig | None:
    """Partial-update a config entry; returns None if not found."""
    config = await db.get(AdminConfig, config_id)
    if config is None:
        return None
    for key, value in data.items():
        setattr(config, key, value)
    await db.commit()
    await db.refresh(config)
    return config


async def delete_config(db: AsyncSession, config_id: int) -> bool:
    """Delete a config entry; returns True on success."""
    config = await db.get(AdminConfig, config_id)
    if config is None:
        return False
    await db.delete(config)
    await db.commit()
    return True
