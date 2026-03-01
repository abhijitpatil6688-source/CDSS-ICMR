from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import radiology

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Clinical Decision Support System for Appropriate Radiological Investigations. "
        "Based on ICMR Guidelines and ACR Appropriateness Criteria (India-adapted)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow web & mobile frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(radiology.router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/radiology/health",
    }
