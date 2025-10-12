import Image_based_measure_function

ROI_area = (690, 650, 940, 670)  # x1,y1,x2,y2
REF_LEN_M = 5.0                  # ความยาวจริงของเส้นอ้างอิงสีดำ (เมตร)

out_json = Image_based_measure_function.analyze_single_image(
    image="test.jpg",
    ref_roi_xyxy=ROI_area,
    ref_length_m=REF_LEN_M,
    k=None,                # ให้เดาอัตโนมัติ
    s_thr=60, v_thr=40,
    measure="skeleton", 
    min_area=30,
    return_json=True,      # <<< คืนเป็น JSON string
    json_indent=2
)

print(out_json)  # ได้สตริง JSON พร้อมใช้งาน
