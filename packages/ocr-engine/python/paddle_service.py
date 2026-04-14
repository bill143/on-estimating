"""
PaddleOCR Service
Visual OCR using PaddleOCR for text detection and recognition.
"""

import asyncio
import logging
import os
import tempfile
from typing import Any

import httpx

logger = logging.getLogger("ocr-gateway.paddle")


class PaddleOCRService:
    """Wraps PaddleOCR for high-accuracy text element extraction."""

    def __init__(self) -> None:
        self._stub = False
        try:
            from paddleocr import PaddleOCR

            # Detect GPU availability
            use_gpu = False
            try:
                import paddle

                use_gpu = paddle.device.is_compiled_with_cuda()
            except Exception:
                pass

            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=use_gpu,
            )
            logger.info(
                "PaddleOCR loaded (GPU=%s)", use_gpu
            )
        except Exception as exc:
            logger.warning(
                "PaddleOCR import failed – running in stub mode: %s", exc
            )
            self._stub = True

    async def process(
        self, file_url: str, sheet_id: str = ""
    ) -> dict[str, Any]:
        """Download a PDF/image from *file_url* and run PaddleOCR.

        Returns a dict with keys: elements, confidence_map.
        """
        if self._stub:
            logger.warning("PaddleOCR stub: returning empty result")
            return {
                "elements": [],
                "confidence_map": {},
            }

        tmp_path: str | None = None
        try:
            tmp_path = await self._download(file_url)
            result = await asyncio.to_thread(self._run_ocr, tmp_path)
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

    def _run_ocr(self, file_path: str) -> dict[str, Any]:
        """Run PaddleOCR synchronously (called via to_thread)."""
        ocr_results = self._ocr.ocr(file_path, cls=True)

        elements: list[dict[str, Any]] = []
        confidence_map: dict[str, float] = {}

        if ocr_results is None:
            return {"elements": elements, "confidence_map": confidence_map}

        for page_idx, page_result in enumerate(ocr_results):
            if page_result is None:
                continue
            for line in page_result:
                # line format: [bbox_points, (text, confidence)]
                bbox_points = line[0]  # 4-point polygon
                text, confidence = line[1]

                # Convert 4-point bbox [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                # to {x, y, width, height} format
                xs = [p[0] for p in bbox_points]
                ys = [p[1] for p in bbox_points]
                x = min(xs)
                y = min(ys)
                width = max(xs) - x
                height = max(ys) - y

                element = {
                    "text": text,
                    "bbox": {
                        "x": round(x, 2),
                        "y": round(y, 2),
                        "width": round(width, 2),
                        "height": round(height, 2),
                    },
                    "confidence": round(confidence, 4),
                    "page": page_idx,
                }
                elements.append(element)

                # Build confidence map keyed by text
                confidence_map[text] = round(confidence, 4)

        return {
            "elements": elements,
            "confidence_map": confidence_map,
        }
