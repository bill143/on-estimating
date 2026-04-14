"""
OCR Engine Python Gateway
FastAPI application serving OCR endpoints on port 8001.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from marker_service import MarkerSuryaService
from mineru_service import MinerUService
from paddle_service import PaddleOCRService
from docling_service import DoclingService

logger = logging.getLogger("ocr-gateway")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class FastPassResponse(BaseModel):
    text: str
    layout: list[dict[str, Any]]
    reading_order: list[int]
    page_count: int


class DeepPassResponse(BaseModel):
    text: str
    elements: list[dict[str, Any]]
    keynotes: list[dict[str, Any]]
    ocr_elements: list[dict[str, Any]]
    confidence_map: dict[str, float]


class ExtractTablesResponse(BaseModel):
    tables: list[dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    loaded_models: list[str]


# ---------------------------------------------------------------------------
# Service singletons (populated at startup)
# ---------------------------------------------------------------------------

marker_service: MarkerSuryaService | None = None
mineru_service: MinerUService | None = None
paddle_service: PaddleOCRService | None = None
docling_service: DoclingService | None = None
loaded_models: list[str] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all four OCR services at startup."""
    global marker_service, mineru_service, paddle_service, docling_service, loaded_models

    logger.info("Loading OCR services...")

    try:
        marker_service = MarkerSuryaService()
        loaded_models.append("marker-surya")
        logger.info("Marker/Surya service loaded")
    except Exception as exc:
        logger.warning("Failed to load Marker/Surya service: %s", exc)

    try:
        mineru_service = MinerUService()
        loaded_models.append("mineru")
        logger.info("MinerU service loaded")
    except Exception as exc:
        logger.warning("Failed to load MinerU service: %s", exc)

    try:
        paddle_service = PaddleOCRService()
        loaded_models.append("paddleocr")
        logger.info("PaddleOCR service loaded")
    except Exception as exc:
        logger.warning("Failed to load PaddleOCR service: %s", exc)

    try:
        docling_service = DoclingService()
        loaded_models.append("docling")
        logger.info("Docling service loaded")
    except Exception as exc:
        logger.warning("Failed to load Docling service: %s", exc)

    logger.info("Startup complete – loaded models: %s", loaded_models)
    yield
    logger.info("Shutting down OCR gateway")


app = FastAPI(title="OCR Engine Gateway", version="0.1.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/fast-pass", response_model=FastPassResponse)
async def fast_pass(file_url: str = Form(...), sheet_id: str = Form("")):
    """Run Marker/Surya fast OCR pass on a PDF."""
    if marker_service is None:
        raise HTTPException(status_code=503, detail="Marker/Surya service is not loaded")
    try:
        result = await marker_service.process(file_url, sheet_id)
        return FastPassResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("fast-pass failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/deep-pass", response_model=DeepPassResponse)
async def deep_pass(file_url: str = Form(...), sheet_id: str = Form("")):
    """Run MinerU then PaddleOCR-VL and merge results."""
    if mineru_service is None:
        raise HTTPException(status_code=503, detail="MinerU service is not loaded")
    if paddle_service is None:
        raise HTTPException(status_code=503, detail="PaddleOCR service is not loaded")
    try:
        mineru_result = await mineru_service.process(file_url, sheet_id)
        paddle_result = await paddle_service.process(file_url, sheet_id)

        # Merge MinerU structural data with PaddleOCR visual elements
        merged = {
            "text": mineru_result.get("text", ""),
            "elements": mineru_result.get("elements", []),
            "keynotes": mineru_result.get("keynotes", []),
            "ocr_elements": paddle_result.get("elements", []),
            "confidence_map": paddle_result.get("confidence_map", {}),
        }
        return DeepPassResponse(**merged)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("deep-pass failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/extract-tables", response_model=ExtractTablesResponse)
async def extract_tables(file_url: str = Form(...), sheet_id: str = Form("")):
    """Extract tables from a PDF using Docling."""
    if docling_service is None:
        raise HTTPException(status_code=503, detail="Docling service is not loaded")
    try:
        result = await docling_service.process(file_url, sheet_id)
        return ExtractTablesResponse(tables=result.get("tables", []))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("extract-tables failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health", response_model=HealthResponse)
async def health():
    """Return gateway health based on number of loaded models."""
    count = len(loaded_models)
    if count >= 3:
        status = "ok"
    elif count > 0:
        status = "degraded"
    else:
        status = "error"
    return HealthResponse(status=status, loaded_models=loaded_models)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("gateway:app", host="0.0.0.0", port=8001, reload=False)
