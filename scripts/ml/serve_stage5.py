"""Optional loopback FastAPI ONNX demo. Run only after verified training and parity export."""
import io
import os
from pathlib import Path

from dataset_common import ROOT
from detector_stage5 import OnnxDetector, unknown_risks


def create_app():
    from fastapi import FastAPI, HTTPException, Request
    from PIL import Image, UnidentifiedImageError
    directory = Path(os.environ.get("SAFEHOME_STAGE5_ONNX", str(ROOT / "models/stage5/rtdetr_r18/onnx")))
    detector = OnnxDetector(directory)
    app = FastAPI(title="SafeHome Stage 5 detector demo")

    @app.get("/health")
    def health():
        return {"contract_version": 1, "trained_classes": detector.metadata["classes"],
            "untrained_classes": detector.metadata["untrained_classes"], "status": "ready", "model_sha256": detector.metadata["onnx_sha256"], "risk_supported": False}

    @app.post("/detect")
    async def detect(request: Request):
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > 15 * 1024 * 1024:
                raise HTTPException(413, "Image too large")
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.width * image.height > 25_000_000:
                    raise HTTPException(413, "Image dimensions too large")
                objects = detector(image)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, "Invalid image") from None
        return {"contract_version": 1, "trained_classes": detector.metadata["classes"], "objects": objects, "untrained_classes": detector.metadata["untrained_classes"],
            "risks": unknown_risks(), "risk_supported": False, "source": "LOCAL_FINE_TUNED_DETECTOR",
            "model_sha256": detector.metadata["onnx_sha256"]}

    return app
