"""
Point d'entrée FastAPI — stub étape 2.
Le code métier (bot, trades, chiffrement) sera ajouté aux étapes 3-4.
"""

from fastapi import FastAPI

app = FastAPI(
    title="Trading Bot API",
    version="0.1.0-stub",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Healthcheck Docker / Nginx."""
    return {"status": "ok", "service": "backend", "stage": "infra-stub"}
