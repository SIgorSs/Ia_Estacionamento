from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path
from statistics import mean

import cv2
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "Detector_Vagas" / "best_models" / "best" / "best-modelo-universal5v4.pt"

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200 MB

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Modelo não encontrado em: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))


def _state_from_label(label: str, class_id: int | None = None) -> str:
    text = (label or "").lower()
    if any(token in text for token in ("free", "livre", "available", "empty")):
        return "free"
    if any(token in text for token in ("occupied", "ocupad", "car", "veiculo", "vehicle")):
        return "occupied"
    if class_id is not None and class_id % 2 == 0:
        return "free"
    return "occupied"


def _extract_detections(result) -> list[dict]:
    detections: list[dict] = []
    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        return detections

    names = result.names or {}
    for idx, box in enumerate(boxes):
        cls_id = int(box.cls[0]) if box.cls is not None else None
        label = names.get(cls_id, str(cls_id)) if cls_id is not None else ""
        state = _state_from_label(label, cls_id)
        conf = float(box.conf[0]) if box.conf is not None else 0.0
        x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
        detections.append(
            {
                "id": idx + 1,
                "label": label,
                "state": state,
                "conf": conf,
                "x": x1,
                "y": y1,
                "w": x2 - x1,
                "h": y2 - y1,
            }
        )

    return detections


def _image_dimensions(result) -> tuple[int, int]:
    orig = getattr(result, "orig_shape", None)
    if orig and len(orig) >= 2:
        return int(orig[1]), int(orig[0])

    path = getattr(result, "path", None)
    if path and os.path.exists(path):
        frame = cv2.imread(path)
        if frame is not None:
            height, width = frame.shape[:2]
            return width, height

    return 0, 0


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": str(MODEL_PATH.name)})


@app.post("/analyze")
def analyze():
    uploaded = request.files.get("file")
    if uploaded is None or uploaded.filename == "":
        return jsonify({"error": "Arquivo não enviado"}), 400

    media_type = request.form.get("mediaType", "image")
    suffix = Path(uploaded.filename).suffix or ".bin"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        uploaded.save(temp_file.name)
        temp_path = temp_file.name

    try:
        if media_type == "video" or suffix.lower() in {".mp4", ".avi", ".mov", ".mkv"}:
            capture = cv2.VideoCapture(temp_path)
            success, frame = capture.read()
            capture.release()
            if not success or frame is None:
                return jsonify({"error": "Não foi possível ler o vídeo"}), 400

            results = model.predict(source=frame, conf=0.5, verbose=False)
            result = results[0]
        else:
            results = model.predict(source=temp_path, conf=0.5, verbose=False)
            result = results[0]

        detections = _extract_detections(result)
        avg_conf = mean([item["conf"] for item in detections]) if detections else 0.0
        image_width, image_height = _image_dimensions(result)

        return jsonify(
            {
                "mediaType": media_type,
                "imageWidth": image_width,
                "imageHeight": image_height,
                "avgConf": avg_conf,
                "detections": detections,
            }
        )
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
