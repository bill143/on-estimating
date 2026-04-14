"""
MinerU OCR Service
Deep-pass PDF extraction using the MinerU (magic-pdf) pipeline.
"""

import asyncio
import logging
import os
import re
import tempfile
from typing import Any

import httpx

logger = logging.getLogger("ocr-gateway.mineru")

# Keynote identifier patterns
_KEYNOTE_RE = re.compile(
    r"^(?:[A-Z]{1,3}\d{1,3}|[A-Z]\d|FP\d+|\d{1,3}\s*[-–]\s*.+)$"
)


class MinerUService:
    """Wraps the MinerU (magic-pdf) pipeline for structural PDF extraction."""

    def __init__(self) -> None:
        self._stub = False
        try:
            from magic_pdf.pipe.UNIPipe import UNIPipe
            from magic_pdf.rw.DiskReaderWriter import DiskReaderWriter

            self._UNIPipe = UNIPipe
            self._DiskReaderWriter = DiskReaderWriter
            logger.info("MinerU pipeline loaded successfully")
        except Exception as exc:
            logger.warning(
                "MinerU import failed – running in stub mode: %s", exc
            )
            self._stub = True

    async def process(
        self, file_url: str, sheet_id: str = ""
    ) -> dict[str, Any]:
        """Download a PDF from *file_url* and run the MinerU pipeline.

        Returns a dict with keys: text, elements, keynotes.
        """
        if self._stub:
            logger.warning("MinerU stub: returning empty result")
            return {
                "text": "",
                "elements": [],
                "keynotes": [],
            }

        tmp_path: str | None = None
        tmp_dir: str | None = None
        try:
            tmp_path = await self._download(file_url)
            tmp_dir = tempfile.mkdtemp(prefix="mineru_")
            result = await asyncio.to_thread(
                self._run_pipeline, tmp_path, tmp_dir
            )
            return result
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            # Clean up temp output directory
            if tmp_dir and os.path.isdir(tmp_dir):
                import shutil

                shutil.rmtree(tmp_dir, ignore_errors=True)

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

    def _run_pipeline(
        self, pdf_path: str, output_dir: str
    ) -> dict[str, Any]:
        """Run the MinerU UNIPipe synchronously (called via to_thread)."""
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        writer = self._DiskReaderWriter(output_dir)
        pipe = self._UNIPipe(pdf_bytes, {"_pdf_type": "", "model_list": []}, writer)
        pipe.pipe_classify()
        pipe.pipe_analyze()
        pipe.pipe_parse()

        # Collect content from the pipeline output
        content_list = pipe.pipe_mk_uni_format("", drop_mode="none")

        full_text_parts: list[str] = []
        elements: list[dict[str, Any]] = []
        keynotes: list[dict[str, Any]] = []

        for item in content_list:
            item_type = item.get("type", "text")
            item_text = item.get("text", "")
            bbox = item.get("bbox", [])

            full_text_parts.append(item_text)

            element = {
                "type": item_type,
                "text": item_text,
                "bbox": bbox,
                "page": item.get("page_idx", 0),
            }
            elements.append(element)

            if self._is_keynote(item_text):
                keynotes.append(
                    {
                        "id": item_text.split()[0] if item_text else "",
                        "text": item_text,
                        "bbox": bbox,
                        "page": item.get("page_idx", 0),
                    }
                )

        return {
            "text": "\n".join(full_text_parts),
            "elements": elements,
            "keynotes": keynotes,
        }

    @staticmethod
    def _is_keynote(text: str) -> bool:
        """Heuristic: detect construction keynote identifiers.

        Matches patterns like:
          - "A1", "M3", "FP2"  (letter-number codes)
          - "01 - description"  (numbered keynote entries)
        """
        stripped = text.strip()
        if not stripped:
            return False
        return bool(_KEYNOTE_RE.match(stripped))
