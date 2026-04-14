"""
Docling Table-Extraction Service
Extracts and classifies tables from PDFs using the Docling library.
"""

import asyncio
import logging
import os
import re
import tempfile
from typing import Any

import httpx

logger = logging.getLogger("ocr-gateway.docling")

# Patterns for classifying table types
_SCHEDULE_RE = re.compile(r"\bschedul[e]?\b", re.IGNORECASE)
_LEGEND_RE = re.compile(r"\blegend\b", re.IGNORECASE)
_KEYNOTE_RE = re.compile(r"\bkeynote[s]?\b", re.IGNORECASE)
_MATERIAL_RE = re.compile(r"\bmaterial[s]?\b", re.IGNORECASE)


class DoclingService:
    """Wraps the Docling DocumentConverter for table extraction."""

    def __init__(self) -> None:
        self._stub = False
        try:
            from docling.document_converter import DocumentConverter
            from docling.datamodel.pipeline_options import (
                PdfPipelineOptions,
                TableFormerMode,
            )

            pipeline_options = PdfPipelineOptions(
                table_structure_options={"mode": TableFormerMode.ACCURATE}
            )
            self._converter = DocumentConverter(
                pipeline_options={"pdf": pipeline_options}
            )
            logger.info("Docling DocumentConverter loaded (ACCURATE mode)")
        except Exception as exc:
            logger.warning(
                "Docling import failed – running in stub mode: %s", exc
            )
            self._stub = True

    async def process(
        self, file_url: str, sheet_id: str = ""
    ) -> dict[str, Any]:
        """Download a PDF from *file_url* and extract tables.

        Returns a dict with key: tables (list of table dicts).
        """
        if self._stub:
            logger.warning("Docling stub: returning empty result")
            return {"tables": []}

        tmp_path: str | None = None
        try:
            tmp_path = await self._download(file_url)
            result = await asyncio.to_thread(self._run_extraction, tmp_path)
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

    def _run_extraction(self, pdf_path: str) -> dict[str, Any]:
        """Run Docling conversion synchronously (called via to_thread)."""
        result = self._converter.convert(pdf_path)
        document = result.document

        tables: list[dict[str, Any]] = []

        for table in document.tables:
            headers: list[str] = []
            rows: list[list[str]] = []

            if hasattr(table, "data") and table.data:
                table_data = table.data
                if isinstance(table_data, list) and len(table_data) > 0:
                    # First row as headers
                    headers = [
                        str(cell) for cell in table_data[0]
                    ]
                    # Remaining rows as data
                    for row in table_data[1:]:
                        rows.append([str(cell) for cell in row])

            # Extract coordinates if available
            coordinates: dict[str, Any] = {}
            if hasattr(table, "prov") and table.prov:
                prov = table.prov[0] if isinstance(table.prov, list) else table.prov
                if hasattr(prov, "bbox"):
                    bbox = prov.bbox
                    coordinates = {
                        "x": getattr(bbox, "l", 0),
                        "y": getattr(bbox, "t", 0),
                        "width": getattr(bbox, "r", 0) - getattr(bbox, "l", 0),
                        "height": getattr(bbox, "b", 0) - getattr(bbox, "t", 0),
                        "page": getattr(prov, "page_no", 0),
                    }

            # Classify the table type
            all_text = " ".join(headers) + " " + " ".join(
                cell for row in rows for cell in row
            )
            table_type = self._classify_table(all_text)

            tables.append(
                {
                    "headers": headers,
                    "rows": rows,
                    "coordinates": coordinates,
                    "table_type": table_type,
                }
            )

        return {"tables": tables}

    @staticmethod
    def _classify_table(text: str) -> str:
        """Classify a table based on keyword patterns in its content.

        Returns one of: "schedule", "legend", "keynote", "material", "general".
        """
        if _SCHEDULE_RE.search(text):
            return "schedule"
        if _LEGEND_RE.search(text):
            return "legend"
        if _KEYNOTE_RE.search(text):
            return "keynote"
        if _MATERIAL_RE.search(text):
            return "material"
        return "general"
