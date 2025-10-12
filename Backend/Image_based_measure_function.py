import json
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Union, Tuple

# --- helpers เดิมที่เคยให้ไว้ (ย่อให้ครบใช้ได้ทันที) ---
def _find_peaks(hist, min_height, min_dist):
    peaks = []
    for i in range(1, len(hist)-1):
        if hist[i] >= hist[i-1] and hist[i] >= hist[i+1] and hist[i] >= min_height:
            if all(abs(i - p) >= min_dist for p in peaks):
                peaks.append(i)
    if len(peaks) >= 2:
        peaks = sorted(peaks)
        if (peaks[0] + 180) - peaks[-1] < min_dist:
            peaks = peaks[:-1] if hist[peaks[0]] >= hist[peaks[-1]] else peaks[1:]
    return peaks

def _estimate_k_from_hue(H, mask, min_dist=8):
    hue_vals = H[mask]
    if hue_vals.size == 0:
        return 0
    hist, _ = np.histogram(hue_vals, bins=180, range=(0, 180))
    min_height = max(int(0.01 * hue_vals.size), 20)
    peaks = _find_peaks(hist, min_height=min_height, min_dist=min_dist)
    k = len(peaks)
    if k < 2:
        k = 5
    return int(max(5, min(12, k)))

def _kmeans_segment(hsv, color_mask, k, attempts=10):
    H, S, V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
    data = hsv[color_mask].astype(np.float32)
    if data.size == 0:
        raise RuntimeError("ไม่พบพิกเซลที่มีสี (ลองลด s_thr หรือ v_thr).")

    theta = (data[:,0].astype(np.float32) / 180.0) * (2*np.pi)
    h_cos = np.cos(theta)
    h_sin = np.sin(theta)
    sv = data[:,1:3].astype(np.float32) / 255.0
    data_w = np.column_stack((h_cos, h_sin, sv[:,0], sv[:,1]))
    data_w *= np.array([3.0, 3.0, 0.5, 0.5], dtype=np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 1e-3)
    _, labels, _ = cv2.kmeans(data_w, k, None, criteria, attempts, cv2.KMEANS_PP_CENTERS)

    label_map = np.full(H.shape, -1, dtype=np.int32)
    label_map[color_mask] = labels.flatten()
    return label_map

def _measure_lengths(mask, method="skeleton", min_area=30):
    results, total_len_px = [], 0.0
    _, bw = cv2.threshold(mask, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = np.ones((3,3), np.uint8)
    bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN, kernel, iterations=1)
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if method == "skeleton":
        try:
            from skimage.morphology import skeletonize
            sk = skeletonize((bw > 0).astype(np.uint8)).astype(np.uint8)
            num_labels, labeled = cv2.connectedComponents(sk, connectivity=8)
            for comp_id in range(1, num_labels):
                length_px = float((labeled == comp_id).sum())
                total_len_px += length_px
                results.append({"length_px": length_px})
            return results, total_len_px
        except Exception:
            print("please install skipy-image , pip install skipy-image")

    for c in contours:
        area = cv2.contourArea(c)
        if area < float(min_area):
            continue
        (w, h) = cv2.minAreaRect(c)[1]
        length = float(max(w, h))
        total_len_px += length
        results.append({"length_px": length})
    return results, total_len_px

def _compute_ref_m_per_px(img_bgr, roi_xyxy: Tuple[int,int,int,int], ref_length_m: float) -> float:
    x1, y1, x2, y2 = roi_xyxy
    roi = img_bgr[y1:y2, x1:x2].copy()
    if roi.size == 0:
        raise ValueError("ROI ว่างหรือเกินขอบภาพ")

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (0,0,0), (179,255,50))  # จับเส้นอ้างอิงสีดำ/มืด
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise RuntimeError("ไม่พบเส้นอ้างอิงสีดำใน ROI")

    (w, h) = cv2.minAreaRect(max(contours, key=cv2.contourArea))[1]
    pix_len = max(float(w), float(h))
    if pix_len <= 0:
        raise RuntimeError("ความยาวพิกเซลของเส้นอ้างอิงเป็นศูนย์")
    return float(ref_length_m) / pix_len

# --- ฟังก์ชัน one-shot ที่คืน JSON ---
def analyze_single_image(
    image: Union[str, Path, np.ndarray],
    ref_roi_xyxy: Tuple[int,int,int,int],
    ref_length_m: float,
    *,
    k: int = None,
    s_thr: int = 60,
    v_thr: int = 40,
    min_dist: int = 8,
    measure: str = "box",
    min_area: int = 30,
    return_json: bool = True,         # <<<< เพิ่มพารามิเตอร์นี้
    json_indent: int = 2              # <<<< และตั้งค่า indent ได้
):
    # 1) โหลดภาพ
    if isinstance(image, (str, Path)):
        img_bgr = cv2.imread(str(image))
        if img_bgr is None:
            raise FileNotFoundError(f"ไม่พบรูป: {image}")
    elif isinstance(image, np.ndarray):
        img_bgr = image.copy()
        if img_bgr.ndim != 3 or img_bgr.shape[2] != 3:
            raise ValueError("คาดหวังภาพ BGR 3 ช่อง")
    else:
        raise TypeError("image ต้องเป็น path หรือ numpy.ndarray")

    # 2) scale เมตร/พิกเซลจากเส้นอ้างอิง
    m_per_px = _compute_ref_m_per_px(img_bgr, ref_roi_xyxy, ref_length_m)

    # 3) เลือกพิกเซลที่มีสี + เดา/กำหนด K
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
    color_mask = (S > s_thr) & (V > v_thr)

    if k is None:
        k_auto = _estimate_k_from_hue(H, color_mask, min_dist=min_dist)
        if k_auto == 0:
            raise RuntimeError("เดา K ไม่ได้ เพราะไม่เจอพิกเซลที่มีสี")
        k = k_auto
    else:
        k = int(max(2, min(24, k)))

    # 4) K-means segment
    label_map = _kmeans_segment(hsv, color_mask, k)

    # 5) วัดความยาว + หา dominant color (HEX)
    clusters = []
    for i in range(k):
        mask = (label_map == i).astype(np.uint8) * 255

        kernel = np.ones((3,3), np.uint8)
        k_h = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
        k_v = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 25))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_h,    iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_v,    iterations=1)

        _, total_len_px = _measure_lengths(mask, method=measure, min_area=min_area)

        cluster_pixels = img_bgr[mask > 0]
        if cluster_pixels.size == 0:
            dominant_hex = "#000000"
        else:
            rgb = np.median(cluster_pixels[:, ::-1], axis=0)  # BGR->RGB
            rgb = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
            dominant_hex = f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

        clusters.append({
            "cluster_id": int(i + 1),
            "sum_length_m": float(total_len_px) * float(m_per_px),
            "dominant_hex": str(dominant_hex)
        })

    result = {
        "m_per_px": float(m_per_px),
        "k": int(k),
        "measure": str(measure),
        "clusters": clusters
    }

    # 6) คืนเป็น JSON string หรือ dict ตามต้องการ
    if return_json:
        return json.dumps(result, ensure_ascii=False, indent=json_indent)
    else:
        return result
