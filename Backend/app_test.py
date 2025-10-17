from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from datetime import datetime as dt
import math
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
import os
from decimal import Decimal, ROUND_HALF_UP
import numpy as np
import cv2

# Support running as module 'Backend.app' or as script inside Backend/
try:
    from Backend.Image_based_measure_function import analyze_single_image
except Exception:
    from Image_based_measure_function import analyze_single_image


def rd(val, digits=2):
    return float(
        Decimal(val).quantize(Decimal(f'1.{"0"*digits}'), rounding=ROUND_HALF_UP)
    )


app = FastAPI(
    title="SEER Calculator API - Test Mode",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the SEER Calculator API (Test Mode). MongoDB features are disabled.",
        "status": "running",
        "endpoints": [
            "/api/measure-image",
            "/docs",
            "/openapi.json"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": dt.now().isoformat()}

@app.post("/api/measure-image")
async def measure_image_endpoint(
    file: UploadFile = File(...),
    ref_length_m: float = Form(
        5.0, description="Real length (meters) of the black reference line"
    ),
    k: Optional[int] = Form(None),
    s_thr: int = Form(60),
    v_thr: int = Form(40),
    measure: str = Form("skeleton"),
    min_area: int = Form(30),
    return_json: bool = Form(False),
    json_indent: int = Form(2),
):
    """Analyze an uploaded image and return clustered lengths with dominant colors."""
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        # Decode image bytes into BGR numpy array
        np_arr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to decode image. Ensure it's a valid image file.",
            )

        h, w = img_bgr.shape[:2]
        
        # Auto-detect reference ROI
        hsv_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        dark_mask = cv2.inRange(hsv_full, (0, 0, 0), (179, 255, 50))
        contours, _ = cv2.findContours(
            dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if contours:
            c = max(contours, key=cv2.contourArea)
            x, y, ww, hh = cv2.boundingRect(c)
            pad_x = max(5, int(0.02 * w))
            pad_y = max(3, int(0.02 * h))
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w - 1, x + ww + pad_x)
            y2 = min(h - 1, y + hh + pad_y)
        else:
            # Fallback heuristic ROI
            roi_height = max(10, int(0.03 * h))
            roi_width = max(50, int(0.4 * w))
            cx1 = (w - roi_width) // 2
            cy1 = max(0, h - roi_height - int(0.02 * h))
            x1, y1, x2, y2 = cx1, cy1, cx1 + roi_width, min(h - 1, cy1 + roi_height)

        # Call the analysis function
        result = analyze_single_image(
            image=img_bgr,
            ref_length_m=ref_length_m,
            k=k,
            s_thr=s_thr,
            v_thr=v_thr,
            measure=measure,
            min_area=min_area,
            return_json=return_json,
            json_indent=json_indent,
        )

        # Parse result if it's JSON string
        if isinstance(result, str):
            import json as _json
            try:
                data = _json.loads(result)
            except Exception:
                return JSONResponse(
                    content={
                        "raw": result,
                        "roi": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    }
                )
        else:
            data = result

        # Attach the ROI used for transparency
        data["roi"] = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
        return JSONResponse(content=data)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Image measurement failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)