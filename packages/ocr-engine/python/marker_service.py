"""
Marker/Surya OCR Service
Fast-pass PDF OCR using the Marker library backed by Surya models.
"""

import asyncio
import logging
import os
import tempfile
from typing import Any

import httpx

logger = logging.getLogger("ocr-gateway.marker")


class MarkerSuryaService:
    """Wraps the Marker PDF converter for fast text + layout extraction."""

    def __init__(self) -> None:
        self._stub = False
        try:
            from marker.converters.pdf import PdfConverter
            from marker.models import create_model_dict

            self._PdfConverter = PdfConverter
            self._create_model_dict = create_model_dict
            self._models = create_model_dict()
            logger.info("Marker/Surya models loaded successfully")
        except Exception as exc:
            logger.warning(
                "Marker/Surya import failed – running in stub mode: %s", exc
            )
            self._stub = True

    async def process(
        self, file_url: str, sheet_id: str = ""
    ) -> dict[str, Any]:
        """Download a PDF from *file_url* and run Marker conversion.

        Returns a dict with keys: text, layout, reading_order, page_count.
        """
        if self._stub:
            logger.warning("Marker stub: returning empty result")
            return {
                "text": "",
                "layout": [],
                "reading_order": [],
                "page_count": 0,
            }

        tmp_path: str | None = None
        try:
            # Download PDF to a temp file
            tmp_path = await self._download(file_url)
            result = await asyncio.to_thread(self._run_conversion, tmp_path)
            return result
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _download(self, file_url: str) -> str:
        """Download *file_url* to a temporary file; return its path."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(file_url)
            resp.raise_for_status()

        fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(resp.content)
        except Exception:
            os.close(fd)
            raise
        return tmp_path

    def _run_conversion(self, pdf_path: str) -> dict[str, Any]:
        """Run the Marker converter synchronously (called via to_thread)."""
        converter = self._PdfConverter(
            artifact_dict=self._models,
        )
        result = converter(pdf_path)

        # Extract structured data from the Marker result
        text = result.markdown if hasattr(result, "markdown") else str(result)
        layout: list[dict[str, Any]] = []
        reading_order: list[int] = []
        page_count = 0

        if hasattr(result, "pages"):
            page_count = len(result.pages)
            for page_idx, page in enumerate(result.pages):
                if hasattr(page, "blocks"):
                    for block_idx, block in enumerate(page.blocks):
                        layout.append(
                            {
                                "page": page_idx,
                                "block_index": block_idx,
                                "type": getattr(block, "block_type", "unknown"),
                                "bbox": getattr(block, "bbox", []),
                                "text": getattr(block, "text", ""),
                            }
                        )
                        reading_order.append(block_idx)

        return {
            "text": text,
            "layout": layout,
            "reading_order": reading_order,
            "page_count": page_count,
        }
