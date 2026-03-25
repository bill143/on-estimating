"""
ON Estimating — Neural Network Auto-Count Microservice
YOLOv8 ONNX model for construction symbol detection

Run: uvicorn main:app --host 0.0.0.0 --port 8080
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import io

app = FastAPI(
    title="ON Estimating Auto-Count API",
    description="YOLOv8 ONNX construction symbol detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3100", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Detection(BaseModel):
    symbol: str
    count: int
    confidence: float
    bboxes: List[List[float]]  # [[x1, y1, x2, y2], ...]


class DetectionResponse(BaseModel):
    success: bool
    detections: List[Detection]
    total_count: int
    model_version: str


# Symbol class mapping (matches YOLOv8 training labels)
SYMBOL_CLASSES = {
    0: "Electrical Outlet (Duplex)",
    1: "Light Fixture (Recessed)",
    2: "Fire Sprinkler Head",
    3: "HVAC Diffuser",
    4: "Smoke Detector",
    5: "Exit Sign",
    6: "GFI Outlet",
    7: "Switch (Single Pole)",
    8: "Thermostat",
    9: "Floor Drain",
}


@app.post("/detect", response_model=DetectionResponse)
async def detect_symbols(file: UploadFile = File(...)):
    """
    Upload a blueprint image and detect construction symbols.
    Returns classified symbols with bounding boxes and counts.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (PNG, JPG)")

    contents = await file.read()

    # TODO: Load ONNX model and run inference
    # model_path = "models/yolov8_construction_symbols.onnx"
    # session = ort.InferenceSession(model_path)
    # ... preprocessing, inference, NMS, postprocessing ...

    # For now, return placeholder response
    return DetectionResponse(
        success=True,
        detections=[],
        total_count=0,
        model_version="yolov8n-construction-v0.1-placeholder",
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": False}
