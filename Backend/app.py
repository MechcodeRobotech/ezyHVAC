from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from datetime import datetime as dt
import math
from typing import Dict, Any, List, Optional
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import gridfs
from bson import ObjectId
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
    return float(Decimal(val).quantize(Decimal(f'1.{"0"*digits}'), rounding=ROUND_HALF_UP))

app = FastAPI(title="SEER Calculator API",)

class UploadedFileMetadata(BaseModel):
    mongo_id: Optional[str] = Field(default=None, alias="_id")
    original_name: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: str
    gridfs_id: str

    class Config:
        arbitrary_types_allowed = True
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}

    @field_validator('mongo_id', mode='before')
    @classmethod
    def mongo_id_to_str(cls, v: Any) -> Optional[str]:
        if isinstance(v, ObjectId):
            return str(v)
        return v

class CalculationParameters(BaseModel):
    mode: str
    bin_temp: float 
    time_range: str
    Coil_inlet_wet_bulb: float
    Coil_inlet_dry_bulb: float
    full_Capacity: float
    Designcoolingload: float
    p_full: float
    electricity_rate: float
    working_day_per_year: int
    half_Capacity: Optional[float] = 0.0
    p_half: Optional[float] = 0.0

    class Config:
        from_attributes = True

MONGO_DETAILS = os.environ.get("MONGO_DETAILS", "mongodb+srv://admin1:OtqZWh40oqdPAYGV@seer1.fe4uypj.mongodb.net/?retryWrites=true&w=majority&appName=SEER1")
DATABASE_NAME = "SEER1"
FILE_METADATA_COLLECTION = "uploaded_files_metadata"

client: Optional[MongoClient] = None
db: Optional[Any] = None
fs: Optional[gridfs.GridFS] = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def connect_to_mongo():
    global client, db, fs
    try:
        # Mask password in log for security
        print(f"Attempting to connect to MongoDB with URI: {MONGO_DETAILS[:MONGO_DETAILS.find('@')]}...")
        client = MongoClient(MONGO_DETAILS, server_api=ServerApi('1'))
        client.admin.command('ping')
        db = client[DATABASE_NAME]
        fs = gridfs.GridFS(db)
        print(f"Successfully connected to MongoDB: Database: {DATABASE_NAME}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_collection(collection_name: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    return db[collection_name]


TIME_RANGES = {
    '06.00-12.00': list(range(6, 12)),
    '06.00-15.00': list(range(6, 15)),
    '06.00-18.00': list(range(6, 18)),
    '06.00-21.00': list(range(6, 21)),
    '06.00-24.00': list(range(6, 24)),
    '06.00-03.00': list(range(6, 24)) + list(range(0, 3)),
    '06.00-06.00': list(range(0, 24)),
    '09.00-15.00': list(range(9, 15)),
    '09.00-18.00': list(range(9, 18)),
    '09.00-21.00': list(range(9, 21)),
    '09.00-24.00': list(range(9, 24)),
    '09.00-03.00': list(range(9, 24)) + list(range(0, 3)),
    '09.00-06.00': list(range(9, 24)) + list(range(0,6)),
    '09.00-09.00': list(range(0, 24)),
    '12.00-18.00': list(range(12, 18)),
    '12.00-21.00': list(range(12, 21)),
    '12.00-24.00': list(range(12, 24)),
    '12.00-03.00': list(range(12, 24)) + list(range(0, 3)),
    '12.00-06.00': list(range(12,24)) + list(range(0,6)),
    '12.00-09.00': list(range(12,24)) + list(range(0,9)),
    '12.00-12.00': list(range(0,24)),
    '15.00-21.00': list(range(15, 21)),
    '15.00-24.00': list(range(15, 24)),
    '15.00-03.00': list(range(15, 24)) + list(range(0, 3)),
    '15.00-06.00': list(range(15,24)) + list(range(0,6)),
    '15.00-09.00': list(range(15,24)) + list(range(0,9)),
    '15.00-12.00': list(range(15,24)) + list(range(0,12)),
    '15.00-15.00': list(range(0,24)),
    '18.00-24.00': list(range(18, 24)),
    '18.00-03.00': list(range(18, 24)) + list(range(0, 3)),
    '18.00-06.00': list(range(18,24)) + list(range(0,6)),
    '18.00-09.00': list(range(18,24)) + list(range(0,9)),
    '18.00-12.00': list(range(18,24)) + list(range(0,12)),
    '18.00-15.00': list(range(18,24)) + list(range(0,15)),
    '18.00-18.00': list(range(0,24)),
    '21.00-03.00': list(range(21, 24)) + list(range(0, 3)),
    '21.00-06.00': list(range(21,24)) + list(range(0,6)),
    '21.00-09.00': list(range(21,24)) + list(range(0,9)),
    '21.00-12.00': list(range(21,24)) + list(range(0,12)),
    '21.00-15.00': list(range(21,24)) + list(range(0,15)),
    '21.00-18.00': list(range(21,24)) + list(range(0,18)),
    '21.00-21.00': list(range(0,24)),
    '24.00-06.00': list(range(0, 6)),
    '24.00-09.00': list(range(0, 9)),
    '24.00-12.00': list(range(0, 12)),
    '24.00-15.00': list(range(0, 15)),
    '24.00-18.00': list(range(0, 18)),
    '24.00-21.00': list(range(0, 21)),
    '24.00-24.00': list(range(0, 24)),
}

@app.on_event("startup")
async def startup_db_client():
    connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    close_mongo_connection()

def create_excel_file(data_dict: Dict[str, Any]) -> io.BytesIO:
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='xlsxwriter')

    params_data = {
        "Parameter": list(data_dict["input_params"].keys()),
        "Value": list(data_dict["input_params"].values())
    }
    df_params = pd.DataFrame(params_data)
    df_params.to_excel(writer, sheet_name='Input Parameters', index=False)

    results_data = {
        "Metric": list(data_dict["results"].keys()),
        "Value": list(data_dict["results"].values())
    }
    df_results = pd.DataFrame(results_data)
    df_results.to_excel(writer, sheet_name='Calculated Results', index=False)

    if "nj_dict" in data_dict and data_dict["nj_dict"]:
        nj_df = pd.DataFrame(list(data_dict["nj_dict"].items()), columns=['Temperature Bin (°C)', 'Hours'])
        nj_df.to_excel(writer, sheet_name='Temp Distribution (nj)', index=False)

    writer.close()
    output.seek(0)
    return output

@app.get("/")
def read_root():
    return {"message": "Welcome to the SEER Calculator API. Use the /calculate-seer endpoint to calculate SEER."}

@app.post("/api/measure-image")
async def measure_image_endpoint(
    file: UploadFile = File(...),
    ref_roi_xyxy: Optional[str] = Form(None, description="Reference ROI as 'x1,y1,x2,y2'"),
    ref_length_m: float = Form(5.0, description="Real length (meters) of the black reference line inside ROI"),
    k: Optional[int] = Form(None),
    s_thr: int = Form(60),
    v_thr: int = Form(40),
    measure: str = Form("skeleton"),
    min_area: int = Form(30),
    return_json: bool = Form(False),
    json_indent: int = Form(2),
):
    """Analyze an uploaded image and return clustered lengths with dominant colors.

    Notes:
    - If ref_roi_xyxy is not provided, a heuristic ROI near the bottom-center of the image will be used.
    - The function expects a dark (black) reference line inside the ROI to compute meters-per-pixel.
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        # Decode image bytes into BGR numpy array
        np_arr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Failed to decode image. Ensure it's a valid image file.")

        h, w = img_bgr.shape[:2]
        if ref_roi_xyxy:
            try:
                x1, y1, x2, y2 = [int(v.strip()) for v in ref_roi_xyxy.split(',')]
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid ref_roi_xyxy format. Use 'x1,y1,x2,y2'.")
        else:
            # Try to auto-detect a dark reference line on the whole image and build ROI around it
            hsv_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
            # First pass: very dark
            dark_mask = cv2.inRange(hsv_full, (0, 0, 0), (179, 255, 50))
            contours, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            # Second pass: slightly looser threshold if nothing found
            if not contours:
                dark_mask2 = cv2.inRange(hsv_full, (0, 0, 0), (179, 255, 80))
                contours, _ = cv2.findContours(dark_mask2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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
                # Fallback heuristic ROI: a shallow strip across the bottom-center of the image
                roi_height = max(10, int(0.03 * h))
                roi_width = max(50, int(0.4 * w))
                cx1 = (w - roi_width) // 2
                cy1 = max(0, h - roi_height - int(0.02 * h))
                x1, y1, x2, y2 = cx1, cy1, cx1 + roi_width, min(h - 1, cy1 + roi_height)

        # Call the analysis function; pass ndarray to avoid re-reading from disk
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

        # If the function returned a JSON string, parse it so we always return JSON
        if isinstance(result, str):
            import json as _json
            try:
                data = _json.loads(result)
            except Exception:
                # Fallback: return raw string
                return JSONResponse(content={
                    "raw": result,
                    "roi": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                })
        else:
            data = result

        # If measured lengths are zero across clusters, retry with a different method
        try:
            clusters = data.get("clusters", [])
            total_len = sum(float(c.get("sum_length_m", 0) or 0) for c in clusters)
        except Exception:
            total_len = 0.0
        if total_len <= 0:
            try:
                result2 = analyze_single_image(
                    image=img_bgr,
                    ref_length_m=ref_length_m,
                    k=k,
                    s_thr=s_thr,
                    v_thr=v_thr,
                    measure="box",  # fallback to box measurement
                    min_area=min_area,
                    return_json=False,
                )
                data = result2 if not isinstance(result2, str) else _json.loads(result2)
                data["fallback_measure"] = "box"
            except Exception:
                pass

        # Attach the ROI used for transparency
        data["roi"] = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
        return JSONResponse(content=data)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image measurement failed: {str(e)}")

@app.post("/api/files/upload", response_model=UploadedFileMetadata)
async def upload_file_endpoint(file: UploadFile = File(...), 
                               country: str = Form(...), 
                               city: str = Form(...),
                               year: int = Form(...)):

    if fs is None or db is None:
        raise HTTPException(status_code=500, detail="Database service not available.")

    metadata_collection = get_collection(FILE_METADATA_COLLECTION)

    original_filename_base = os.path.splitext(file.filename)[0]
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"{country}_{city}_{year}_{original_filename_base}{file_extension}"

    existing_file = metadata_collection.find_one({"original_name": new_filename})
    if existing_file:
        raise HTTPException(status_code=409, detail=f"File with name '{new_filename}' already exists. Please rename the original file or choose different country/city/year.")

    contents = await file.read()

    try:
        gridfs_id = fs.put(
            contents,
            filename=new_filename,
            content_type=file.content_type
        )

        file_meta_data = {
            "original_name": new_filename,
            "content_type": file.content_type,
            "file_size": len(contents),
            "uploaded_at": dt.utcnow().isoformat(),
            "gridfs_id": str(gridfs_id), 
        }

        result = metadata_collection.insert_one(file_meta_data)

        created_doc = metadata_collection.find_one({"_id": result.inserted_id})
        return UploadedFileMetadata(**created_doc)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")

@app.get("/api/files", response_model=List[UploadedFileMetadata])
async def list_files():

    if db is None:
        raise HTTPException(status_code=500, detail="Database service not available.")
    metadata_collection = get_collection(FILE_METADATA_COLLECTION)
    files = []
    for doc in metadata_collection.find():
        files.append(UploadedFileMetadata(**doc))
    return files

@app.post("/calculate-seer")
async def calculate_seer(
    file: Optional[UploadFile] = File(None),
    existing_file_id: Optional[str] = Form(None),
    mode: str = Form(...),
    bin_temp: float = Form(...),
    time_range: str = Form(...),
    Coil_inlet_wet_bulb: float = Form(...),
    Coil_inlet_dry_bulb: float = Form(...),
    full_Capacity: float = Form(...),
    half_Capacity: float = Form(...),
    p_full: float = Form(...),
    p_half: float = Form(...),
    Designcoolingload: float = Form(...),
    electricity_rate: float = Form(...),
    working_day_per_year: int = Form(...),
):
    if db is None or fs is None:
        raise HTTPException(status_code=500, detail="Database service not available.")

    try:
        contents: bytes
        file_name_for_processing: str

        if existing_file_id:
            if file:
                raise HTTPException(status_code=400, detail="Provide either a new file or an existing_file_id, not both.")
            metadata_collection = get_collection(FILE_METADATA_COLLECTION)
            try:
                file_meta_doc = metadata_collection.find_one({"_id": ObjectId(existing_file_id)})
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid existing_file_id format.")
            if not file_meta_doc:
                raise HTTPException(status_code=404, detail=f"File with metadata ID {existing_file_id} not found.")

            try:
                gridfs_id_obj = ObjectId(file_meta_doc["gridfs_id"])
                grid_out = fs.get(gridfs_id_obj)
                contents = grid_out.read()
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error retrieving file from GridFS: {str(e)}")
            file_name_for_processing = file_meta_doc["original_name"]
            grid_out.close()
        elif file:
            contents = await file.read()
            file_name_for_processing = file.filename
        else:
            raise HTTPException(status_code=400, detail="Either a new file must be uploaded or an existing_file_id must be provided.")

        if file_name_for_processing.lower().endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), skiprows=2, usecols=[0, 1])
        elif file_name_for_processing.lower().endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents), skiprows=2, usecols=[0, 1])
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Only .csv and .xlsx are supported.")

        df.columns = ['datetime', 'temp']
        df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')
        df = df.dropna(subset=['datetime'])  
        
        df['day_of_year'] = df['datetime'].dt.dayofyear
        df['hour'] = df['datetime'].dt.hour
        df.dropna(inplace=True) 

        time_hours = TIME_RANGES.get(time_range)
        if time_hours is None:
            raise HTTPException(status_code=400, detail=f"Invalid time_range: {time_range}")

        df_time_range = df[df['hour'].isin(time_hours)].copy()

        if df_time_range.empty:
            raise HTTPException(status_code=400, detail="No data found for the selected time range in the uploaded file. Please check your file data or select a different time range.")

        temp_bin_floor = int(bin_temp)
        df_bin_temp = df_time_range[(df_time_range['temp'] >= temp_bin_floor) & (df_time_range['temp'] < temp_bin_floor + 1)].copy()

        total_hours_in_calculation = df_bin_temp.shape[0]

        n_days_in_calculation = len(df_bin_temp['day_of_year'].unique())

        sumLCST = 0.0
        sumCCSE = 0.0

        Designcoolingload_watt = rd(Designcoolingload * 0.2930711)
        t_iter = (bin_temp - 20) / 15
        lc_iter = rd(Designcoolingload_watt * t_iter)

        if mode == 'Fixed':
            CFw = 0.2275475 + 0.0135333 * bin_temp + Coil_inlet_wet_bulb * 0.0155132 
            CFc = 0.6781129 - 0.008971 * bin_temp + 0.0325166 * Coil_inlet_wet_bulb + 0.00505006

            CFw = max(CFw, 1e-9)
            CFc = max(CFc, 1e-9)

            q_watt = rd((full_Capacity * 0.2930711) / CFc)
            p_watt = rd(p_full / CFw)

            q_29 = rd(q_watt * 1.077)
            p_29 = rd(p_watt * 0.914)

            q_adj = rd(q_watt + (q_29 - q_watt) * (35 - bin_temp) / 6)
            p_adj = rd(p_watt + (p_29 - p_watt) * (35 - bin_temp) / 6)

            q_adj_safe = max(q_adj, 1e-9)
            p_adj_safe = max(p_adj, 1e-9)

            X = rd(lc_iter / q_adj_safe)
            Fpl = max(rd(1 - 0.25 * (1 - X)), 1e-9)

            
            LCST = rd(max(min(lc_iter, q_adj_safe), 0) * total_hours_in_calculation)
            CCSE_fixed = rd((X * p_adj_safe * total_hours_in_calculation) / Fpl)

            sumLCST += LCST
            sumCCSE += CCSE_fixed

        
        elif mode == 'Variable': 
            q_full = rd(full_Capacity * 0.2930711)
            q_half = rd(half_Capacity * 0.2930711)
            p_full_ = rd(p_full)
            p_half_ = rd(p_half)

            q_29f = rd(q_full * 1.077)
            p_29f = rd(p_full_ * 0.914)
            q_29h = rd(q_half * 1.077)
            p_29h = rd(p_half_ * 0.914)

            qf_adj = rd(q_full + (q_29f - q_full) * (35 - bin_temp) / 6)
            pf_adj = rd(p_full_ + (p_29f - p_full_) * (35 - bin_temp) / 6)
            qh_adj = rd(q_half + (q_29h - q_half) * (35 - bin_temp) / 6)
            ph_adj = rd(p_half_ + (p_29h - p_half_) * (35 - bin_temp) / 6)

            qf_adj_safe = max(qf_adj, 1e-9)
            pf_adj_safe = max(pf_adj, 1e-9)
            qh_adj_safe = max(qh_adj, 1e-9)
            ph_adj_safe = max(ph_adj, 1e-9)

            X_variable = rd(lc_iter / qh_adj_safe) 
            Fpl_variable = max(rd(1 - 0.25 * (1 - X_variable)), 1e-9) # Renamed Fpl

            
            LCST = rd(min(lc_iter, qf_adj_safe) * total_hours_in_calculation)
            CCSE_variable = 0.0 

            
            if lc_iter <= qh_adj_safe:
                CCSE_variable = (X_variable * ph_adj_safe * total_hours_in_calculation) / Fpl_variable

            
            elif lc_iter <= qf_adj_safe:
                
                tc_denominator = (6 * q_full + (q_29h - q_half) * 15)
                tb_denominator = (6 * q_full + (q_29f - q_full) * 15)

                tc = (6 * q_full * 20 + 6 * q_half * 15 + 35 * (q_29h - q_half) * 15) / max(tc_denominator, 1e-9)
                tb = (6 * q_full * 20 + 6 * q_full * 15 + 35 * (q_29f - q_full) * 15) / max(tb_denominator, 1e-9)

                q_half_tc = q_half + (q_29h - q_half) * (35 - tc) / 6
                p_half_tc = p_half_ + (p_29h - p_half_) * (35 - tc) / 6
                EER_tc = q_half_tc / max(p_half_tc, 1e-9)

                
                q_full_tb = q_full + (q_29h - q_full) * (35 - tb) / 6
                p_full_tb = p_full_ + (p_29f - p_full_) * (35 - tb) / 6
                EER_tb = q_full_tb / max(p_full_tb, 1e-9)

                
                eer_adj_denominator = (tb - tc)
                if abs(eer_adj_denominator) < 1e-9: 
                    EER_adj = EER_tc 
                else:
                    EER_adj = EER_tc + (EER_tb - EER_tc) * (bin_temp - tc) / eer_adj_denominator

                phr = lc_iter / max(EER_adj, 1e-9)
                CCSE_variable = phr * total_hours_in_calculation

            
            else:
                CCSE_variable = pf_adj_safe * total_hours_in_calculation

            sumLCST += LCST
            sumCCSE += CCSE_variable

        
        seer = (sumLCST / sumCCSE) * 3.412 if sumCCSE > 0 else 0.0 
        sumCCSE_kwh = sumCCSE / 1000.0 

        
        sumLCST_Wh = sumLCST 


        print(f"SEER: {seer}, Sum LCST (Wh): {sumLCST_Wh}, Sum CCSE (kWh): {sumCCSE_kwh}, Days: {n_days_in_calculation}, Total Hours: {total_hours_in_calculation}")

        return JSONResponse(content={
            "seer": round(seer, 2),
            "sumLCST_Wh": round(sumLCST_Wh, 3), 
            "sumCCSE_kwh": round(sumCCSE_kwh, 3),
            "n_days": n_days_in_calculation,
            "total_hours": total_hours_in_calculation,
            "bin_temp": bin_temp,
            "time_range": time_range
        })

    except HTTPException as e:
        
        raise e
    except Exception as e:
        
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/calculate-seer-range-summary")
async def calculate_seer_range_summary(
    file: Optional[UploadFile] = File(None),
    existing_file_id: Optional[str] = Form(None),
    bin_temp: float = Form(..., description="Reference temperature (float) for calculating the unit's rated performance (CFw, CFc)."),
    time_range: str = Form(...),
    Coil_inlet_wet_bulb: float = Form(...),
    Coil_inlet_dry_bulb: float = Form(...),
    full_Capacity: float = Form(...),
    half_Capacity: float = Form(0.0),
    p_full: float = Form(...),
    p_half: float = Form(0.0),
    Designcoolingload: float = Form(...),
    electricity_rate: float = Form(...),
    working_day_per_year: int = Form(...),
    country: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    year: Optional[int] = Form(None)
):
    
    if db is None or fs is None:
        raise HTTPException(status_code=500, detail="Database service not available.")

    
    if not (-50 <= bin_temp <= 50): 
        raise HTTPException(status_code=400, detail="Reference bin_temp must be between -50 and 50 degrees Celsius.")

    try:
        contents: bytes
        file_name_for_processing: str

        if existing_file_id:
            if file:
                raise HTTPException(status_code=400, detail="Provide either a new file or an existing_file_id, not both.")
            metadata_collection = get_collection(FILE_METADATA_COLLECTION)
            try:
                file_meta_doc = metadata_collection.find_one({"_id": ObjectId(existing_file_id)})
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid existing_file_id format.")
            if not file_meta_doc:
                raise HTTPException(status_code=404, detail=f"File with metadata ID {existing_file_id} not found.")

            try:
                gridfs_id_obj = ObjectId(file_meta_doc["gridfs_id"])
                grid_out = fs.get(gridfs_id_obj)
                contents = grid_out.read()
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error retrieving file from GridFS: {str(e)}")
            file_name_for_processing = file_meta_doc["original_name"]
            grid_out.close()
        elif file:
            contents = await file.read()
            if country and city and year and file.filename:
                original_filename_base = os.path.splitext(file.filename)[0]
                file_extension = os.path.splitext(file.filename)[1]
                file_name_for_processing = f"{country}_{city}_{year}_{original_filename_base}{file_extension}"
            else:
                file_name_for_processing = file.filename
            
            metadata_collection = get_collection(FILE_METADATA_COLLECTION)
            existing_file_check = metadata_collection.find_one({"original_name": file_name_for_processing})
            if existing_file_check:
                raise HTTPException(status_code=409, detail=f"File with name '{file_name_for_processing}' already exists. Please rename the original file or choose different country/city/year.")

            gridfs_id = fs.put(
                contents,
                filename=file_name_for_processing,
                content_type=file.content_type
            )
            file_meta_data = {
                "original_name": file_name_for_processing,
                "content_type": file.content_type,
                "file_size": len(contents),
                "uploaded_at": dt.utcnow().isoformat(),
                "gridfs_id": str(gridfs_id), 
            }
            metadata_collection.insert_one(file_meta_data)

        else:
            raise HTTPException(status_code=400, detail="Either a new file must be uploaded or an existing_file_id must be provided.")

        if file_name_for_processing.lower().endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), skiprows=2, usecols=[0, 1])
        elif file_name_for_processing.lower().endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents), skiprows=2, usecols=[0, 1])
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Only .csv and .xlsx are supported.")

        df.columns = ['datetime', 'temp']
        df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')
        df = df.dropna(subset=['datetime'])
        df['day_of_year'] = df['datetime'].dt.dayofyear
        df['hour'] = df['datetime'].dt.hour
        df.dropna(inplace=True)

        time_hours = TIME_RANGES.get(time_range)
        if time_hours is None:
            raise HTTPException(status_code=400, detail=f"Invalid time_range: {time_range}")

        df_base_time_range = df[df['hour'].isin(time_hours)].copy()

        if df_base_time_range.empty:
            raise HTTPException(status_code=400, detail="No data found for the selected time range in the uploaded file. Please check your file data or select a different time range.")


        CFw_rated = 0.2275475 + 0.0135333 * bin_temp + Coil_inlet_wet_bulb * 0.0155132
        CFc_rated = 0.6781129 - 0.008971 * bin_temp + 0.0325166 * Coil_inlet_wet_bulb + 0.00505006

        CFw_rated = max(CFw_rated, 1e-9)
        CFc_rated = max(CFc_rated, 1e-9)


        q_watt_rated = rd((full_Capacity * 0.2930711) / CFc_rated)
        p_watt_rated = rd(p_full / CFw_rated)
        q_29_rated = rd(q_watt_rated * 1.077)
        p_29_rated = rd(p_watt_rated * 0.914)

        
        total_projected_annual_hours = 0.0
        

        total_sumLCST_fixed = 0.0
        total_sumCCSE_fixed = 0.0
        nj_dict_fixed_mode = {}
        
        fixed_mode_total_annual_operating_hours = 0.0

        for bin_temp_iter in range(21, 41): 
            df_bin_temp = df_base_time_range[(df_base_time_range['temp'] >= bin_temp_iter) & (df_base_time_range['temp'] < bin_temp_iter + 1)].copy()

            hours_in_this_bin = df_bin_temp.shape[0]
            unique_days_in_this_bin = len(df_bin_temp['day_of_year'].unique())

            if hours_in_this_bin == 0 or unique_days_in_this_bin == 0:
                nj_dict_fixed_mode[str(bin_temp_iter)] = hours_in_this_bin
                continue

            projected_annual_hours_for_bin = (hours_in_this_bin / unique_days_in_this_bin) * working_day_per_year
            fixed_mode_total_annual_operating_hours += projected_annual_hours_for_bin

            Designcoolingload_watt_iter = rd(Designcoolingload * 0.2930711) 
            t_iter = (bin_temp_iter - 20) / 15
            t_iter = max(0.0, min(1.0, t_iter)) 
            lc_iter = rd(Designcoolingload_watt_iter * t_iter)

            q_adj_fixed = rd(q_watt_rated + (q_29_rated - q_watt_rated) * (35 - bin_temp_iter) / 6)
            p_adj_fixed = rd(p_watt_rated + (p_29_rated - p_watt_rated) * (35 - bin_temp_iter) / 6)

            q_adj_fixed_safe = max(q_adj_fixed, 1e-9)
            p_adj_fixed_safe = max(p_adj_fixed, 1e-9)

            X_fixed = rd(lc_iter / q_adj_fixed_safe) 
            Fpl_fixed = max(rd(1 - 0.25 * (1 - X_fixed)), 1e-9)

            LCST_fixed_bin = rd(max(min(lc_iter, q_adj_fixed_safe), 0) * unique_days_in_this_bin)
            CCSE_fixed_bin = rd((X_fixed * p_adj_fixed_safe * unique_days_in_this_bin) / Fpl_fixed)

            total_sumLCST_fixed += LCST_fixed_bin
            total_sumCCSE_fixed += CCSE_fixed_bin
            nj_dict_fixed_mode[str(bin_temp_iter)] = hours_in_this_bin


        total_sumLCST_variable = 0.0
        total_sumCCSE_variable = 0.0
        nj_dict_variable_mode = {}

        variable_mode_total_annual_operating_hours = 0.0

        p_full_rated_mode_val = rd(p_full)

        for bin_temp_iter in range(21, 41): 
            df_bin_temp = df_base_time_range[(df_base_time_range['temp'] >= bin_temp_iter) & (df_base_time_range['temp'] < bin_temp_iter + 1)].copy()

            hours_in_this_bin = df_bin_temp.shape[0]
            unique_days_in_this_bin = len(df_bin_temp['day_of_year'].unique())

            if hours_in_this_bin == 0 or unique_days_in_this_bin == 0:
                nj_dict_variable_mode[str(bin_temp_iter)] = hours_in_this_bin
                continue

            projected_annual_hours_for_bin = (hours_in_this_bin / unique_days_in_this_bin) * working_day_per_year
            variable_mode_total_annual_operating_hours += projected_annual_hours_for_bin


            q_full_rated_mode_val = rd(full_Capacity * 0.2930711)
            
            q_half_rated_mode_val = rd(half_Capacity * 0.2930711)
            
            p_full_rated_mode_val = rd(p_full)
            
            p_half_rated_mode_val = rd(p_half)
            

            q_29f_rated_mode_val = rd(q_full_rated_mode_val * 1.077)
            
            p_29f_rated_mode_val = rd(p_full_rated_mode_val * 0.914)
            
            q_29h_rated_mode_val = rd(q_half_rated_mode_val * 1.077)
            
            p_29h_rated_mode_val = rd(p_half_rated_mode_val * 0.914)
            

            Designcoolingload_watt_iter = rd(Designcoolingload * 0.2930711) 
            t_iter = (bin_temp_iter - 20) / 15
            t_iter = max(0.0, min(1.0, t_iter)) 
            lc_iter = rd(Designcoolingload_watt_iter * t_iter)

            qf_adj_variable = rd(q_full_rated_mode_val + (q_29f_rated_mode_val - q_full_rated_mode_val) * (35 - bin_temp_iter) / 6)
            pf_adj_variable = rd(p_full_rated_mode_val + (p_29f_rated_mode_val - p_full_rated_mode_val) * (35 - bin_temp_iter) / 6)
            qh_adj_variable = rd(q_half_rated_mode_val + (q_29h_rated_mode_val - q_half_rated_mode_val) * (35 - bin_temp_iter) / 6)
            ph_adj_variable = rd(p_half_rated_mode_val + (p_29h_rated_mode_val - p_half_rated_mode_val) * (35 - bin_temp_iter) / 6)
            

            qf_adj_variable_safe = max(qf_adj_variable, 1e-9)
            pf_adj_variable_safe = max(pf_adj_variable, 1e-9)
            qh_adj_variable_safe = max(qh_adj_variable, 1e-9)
            ph_adj_variable_safe = max(ph_adj_variable, 1e-9)

            X_variable = rd(lc_iter / qh_adj_variable_safe)
            
            Fpl_variable = max(rd(1 - 0.25 * (1 - X_variable)), 1e-9)
            

            LCST_variable_bin = rd(min(lc_iter, qf_adj_variable_safe) * unique_days_in_this_bin)
            
            CCSE_variable_bin = 0.0


            if lc_iter <= qh_adj_variable_safe:
                CCSE_variable_bin = (X_variable * ph_adj_variable_safe * unique_days_in_this_bin) / Fpl_variable
            elif lc_iter <= qf_adj_variable_safe:
                tc_var = (6 * q_full_rated_mode_val * 20 + 6 * q_half_rated_mode_val * 15 + 35 * (q_29h_rated_mode_val - q_half_rated_mode_val) * 15) / (6 * q_full_rated_mode_val + (q_29h_rated_mode_val - q_half_rated_mode_val) * 15)
                
                tb_var = (6 * q_full_rated_mode_val * 20 + 6 * q_full_rated_mode_val * 15 + 35 * (q_29f_rated_mode_val - q_full_rated_mode_val) * 15) / (6 * q_full_rated_mode_val + (q_29f_rated_mode_val - q_full_rated_mode_val) * 15)
                

                tc_var_safe_den = max(6 * q_full_rated_mode_val + (q_29h_rated_mode_val - q_half_rated_mode_val) * 15, 1e-9)
            
                tb_var_safe_den = max(6 * q_full_rated_mode_val + (q_29f_rated_mode_val - q_full_rated_mode_val) * 15, 1e-9)
            

                tc_var = rd((6 * q_full_rated_mode_val * 20 + 6 * q_half_rated_mode_val * 15 + 35 * (q_29h_rated_mode_val - q_half_rated_mode_val) * 15) / tc_var_safe_den)
            
                tb_var = rd((6 * q_full_rated_mode_val * 20 + 6 * q_full_rated_mode_val * 15 + 35 * (q_29f_rated_mode_val - q_full_rated_mode_val) * 15) / tb_var_safe_den)
            


                q_half_tc_var = q_half_rated_mode_val + (q_29h_rated_mode_val - q_half_rated_mode_val) * (35 - tc_var) / 6
                
                p_half_tc_var = p_half_rated_mode_val + (p_29h_rated_mode_val - p_half_rated_mode_val) * (35 - tc_var) / 6
                
                EER_tc_var = q_half_tc_var / max(p_half_tc_var, 1e-9)
            

                q_full_tb_var = q_full_rated_mode_val + (q_29h_rated_mode_val - q_full_rated_mode_val) * (35 - tb_var) / 6
                
                p_full_tb_var = p_full_rated_mode_val + (p_29f_rated_mode_val - p_full_rated_mode_val) * (35 - tb_var) / 6
                
                EER_tb_var = q_full_tb_var / max(p_full_tb_var, 1e-9)
                
                

                EER_adj_variable = EER_tc_var + (EER_tb_var - EER_tc_var) * (bin_temp_iter - tc_var) / max((tb_var - tc_var), 1e-9)
            

                phr_variable = lc_iter / max(EER_adj_variable, 1e-9)
                
                CCSE_variable_bin = phr_variable * unique_days_in_this_bin
            else:
                CCSE_variable_bin = pf_adj_variable_safe * unique_days_in_this_bin

            total_sumLCST_variable += LCST_variable_bin
            total_sumCCSE_variable += CCSE_variable_bin
            nj_dict_variable_mode[str(bin_temp_iter)] = hours_in_this_bin


        overall_seer_fixed = (total_sumLCST_fixed / total_sumCCSE_fixed) * 3.412 if total_sumCCSE_fixed > 0 else 0.0
        total_sumCCSE_fixed_kwh = total_sumCCSE_fixed / 1000.0
        lcst_totalfix = total_sumLCST_fixed / 0.2930711 
        total_cost_fixed = total_sumCCSE_fixed_kwh * electricity_rate
        
        energy_consumption_fixed = total_sumCCSE_fixed_kwh

        peak_demand_kW_fixed = p_watt_rated / 1000.0
        peak_demand_kW_fixed = max(peak_demand_kW_fixed, 1e-9)

        load_factor_fixed = 0.0
        if fixed_mode_total_annual_operating_hours > 0 and peak_demand_kW_fixed > 0:
            load_factor_fixed = energy_consumption_fixed / (peak_demand_kW_fixed * fixed_mode_total_annual_operating_hours)
            load_factor_fixed = min(load_factor_fixed, 1.0) 


        overall_seer_variable = (total_sumLCST_variable / total_sumCCSE_variable) * 3.412 if total_sumCCSE_variable > 0 else 0.0
        total_sumCCSE_variable_kwh = total_sumCCSE_variable / 1000.0
        lcst_totalvar = total_sumLCST_variable / 0.2930711 
        total_cost_variable = total_sumCCSE_variable_kwh * electricity_rate

        energy_consumption_variable = total_sumCCSE_variable_kwh

        peak_demand_kW_variable = p_full_rated_mode_val / 1000.0 
        peak_demand_kW_variable = max(peak_demand_kW_variable, 1e-9)

        load_factor_variable = 0.0
        if variable_mode_total_annual_operating_hours > 0 and peak_demand_kW_variable > 0:
            load_factor_variable = energy_consumption_variable / (peak_demand_kW_variable * variable_mode_total_annual_operating_hours)
            load_factor_variable = min(load_factor_variable, 1.0) 


        print(f"Aggregated Fixed SEER: {overall_seer_fixed:.2f}, Total Fixed LCST (BTU): {lcst_totalfix:.2f}, Total Fixed CCSE (kWh): {total_sumCCSE_fixed_kwh:.2f}")
        print(f"Load Factor Fixed: {load_factor_fixed:.2f}, Load Factor Variable: {load_factor_variable:.2f}")
        print(f"Energy Consumption Fixed (kWh): {energy_consumption_fixed:.2f}, Energy Consumption Variable (kWh): {energy_consumption_variable:.2f}")
        print(f"Aggregated Variable SEER: {overall_seer_variable:.2f}, Total Variable LCST (BTU): {lcst_totalvar:.2f}, Total Variable CCSE (kWh): {total_sumCCSE_variable_kwh:.2f}")
        print(f"Fixed Mode Total Projected Annual Operating Hours: {fixed_mode_total_annual_operating_hours:.2f}")
        print(f"Variable Mode Total Projected Annual Operating Hours: {variable_mode_total_annual_operating_hours:.2f}")
        print(f"Peak Demand kW (Fixed Mode): {peak_demand_kW_fixed:.2f}")
        print(f"Peak Demand kW (Variable Mode): {peak_demand_kW_variable:.2f}")
        print("")

        return JSONResponse(content={
            "fixed_mode_results": {
                "overall_seer": round(overall_seer_fixed, 2),
                "total_sumLCST_Wh": round(lcst_totalfix, 2),
                "total_sumCCSE_kwh": round(total_sumCCSE_fixed_kwh, 2),
                "total_cost_per_year": round(total_cost_fixed, 2),
                "temperature_distribution_hours": nj_dict_fixed_mode,
                "load_factor": round(load_factor_fixed, 2), 
                "energy_consumption_kwh": round(energy_consumption_fixed, 2),
                "total_annual_operating_hours": round(fixed_mode_total_annual_operating_hours, 2)
            },
            "variable_mode_results": {
                "overall_seer": round(overall_seer_variable, 2),
                "total_sumLCST_Wh": round(lcst_totalvar, 2),
                "total_sumCCSE_kwh": round(total_sumCCSE_variable_kwh, 2), 
                "total_cost_per_year": round(total_cost_variable, 2),
                "temperature_distribution_hours": nj_dict_variable_mode,
                "load_factor": round(load_factor_variable, 2), 
                "energy_consumption_kwh": round(energy_consumption_variable, 2),
                "total_annual_operating_hours": round(variable_mode_total_annual_operating_hours, 2)
            },
        })
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")