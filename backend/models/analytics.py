"""
Analytics tracking model for heatmaps and user flow.
Stored separate from leads to track anonymous traffic.
"""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    
    time_on_page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cursor_x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cursor_y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    window_width: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    window_height: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    clicks: Mapped[list | None] = mapped_column(JSON, nullable=True)

# Create an index on timestamp for fast time-series queries
Index('ix_analytics_timestamp', AnalyticsEvent.timestamp)


# ---------------------------------------------------------------------------
# CRUD operations for Analytics
# ---------------------------------------------------------------------------

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def create_analytics_event(db: AsyncSession, data: dict) -> AnalyticsEvent:
    """Insert a single tick of anonymous analytics."""
    event = AnalyticsEvent(**data)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

async def get_analytics_summary(db: AsyncSession) -> dict:
    """
    Returns aggregated analytical data:
    1) Averages of session max durations for 1d, 7d, 30d
    2) Clustered heatmap coords (20x20 blocks) to avoid overloading the frontend
    """
    # 1. Calculate Averages
    # We find the max time_on_page for each session, then average those maxes.
    avg_sql = text("""
        WITH session_max AS (
            SELECT session_id, max(time_on_page) as max_time, max(timestamp) as last_seen
            FROM analytics_events
            GROUP BY session_id
        )
        SELECT
            COALESCE(avg(max_time) FILTER (WHERE last_seen >= now() - interval '1 day'), 0) as avg_1d,
            COALESCE(avg(max_time) FILTER (WHERE last_seen >= now() - interval '7 days'), 0) as avg_7d,
            COALESCE(avg(max_time) FILTER (WHERE last_seen >= now() - interval '30 days'), 0) as avg_30d
        FROM session_max;
    """)
    avg_result = await db.execute(avg_sql)
    avg_row = avg_result.mappings().first()

    # 2. Get Heatmap Matrix
    # We divide by 40 and multiply by 40 to create a 40x40 pixel grid bucket to reduce points.
    hm_sql = text("""
        SELECT 
            (cursor_x / 40) * 40 as x, 
            (cursor_y / 40) * 40 as y, 
            count(*) as weight 
        FROM analytics_events 
        WHERE cursor_x > 0 AND cursor_y > 0
        GROUP BY 1, 2
        ORDER BY 3 DESC
    """)
    hm_result = await db.execute(hm_sql)
    heatmap_points = [dict(row) for row in hm_result.mappings().all()]

    return {
        "averages": {
            "day_1": float(avg_row["avg_1d"]) if avg_row else 0,
            "day_7": float(avg_row["avg_7d"]) if avg_row else 0,
            "day_30": float(avg_row["avg_30d"]) if avg_row else 0,
        },
        "heatmap": heatmap_points
    }
