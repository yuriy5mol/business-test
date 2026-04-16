from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import engine, Base
from routes.leads import router as leads_router
from routes.metrics import router as metrics_router
from routes.admin_config import router as admin_config_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup (idempotent — skips existing tables)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Business Backend API",
    description="Private API — accessible only within the internal Docker network.",
    version="0.1.0",
    lifespan=lifespan,
    # Docs available only inside the container / local dev
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow only same-origin requests (nginx proxies everything internally)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this once nginx / domain is confirmed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Mount all routers under /api/v1
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(leads_router, prefix=API_PREFIX)
app.include_router(metrics_router, prefix=API_PREFIX)
app.include_router(admin_config_router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
