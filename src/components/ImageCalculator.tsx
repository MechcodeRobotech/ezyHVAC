import React, { useState, useRef, ChangeEvent, useEffect } from 'react';

import { Upload, X, Calculator, Eye, Download, Plus, Trash2, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "../contexts/LanguageContext";

interface ColorInput {
  id: string;
  color: string;
  cfm: string;
  length: string;
  width: string;
  height: string;
  friction: string;
  isManualWidth: boolean;
  isManualHeight: boolean;
}

interface CalculationResult {
  id: string;
  color: string;
  cfm: number;
  length: number;
  width: number;
  height: number;
  friction: number;
  velocity: number;
  giSheetArea: number;
  giNumber: string;
}

interface SummaryTableRow {
  id: string;
  zincNumber: string;
  totalArea: string;
  sheetCount: string;
  extraPercent: string;
}

interface VentHeaderItem {
  width: string;
  height: string;
  dustSize: string;
  headCount: string;
  zincAmount: string;
}

const ImageCalculator = () => {
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastUploadedFileRef = useRef<File | null>(null);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detectedColors, setDetectedColors] = useState<string[]>([]);
  const [colorInputs, setColorInputs] = useState<ColorInput[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [frictionRate, setFrictionRate] = useState<string>('');
  const [refLengthM, setRefLengthM] = useState<string>('5');
  // New: store last backend ROI used (for debug/transparency) and toggle
  const [backendROI, setBackendROI] = useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const [useBackendAnalyzer, setUseBackendAnalyzer] = useState<boolean>(true);
  const [summaryRows, setSummaryRows] = useState<SummaryTableRow[]>([
    { id: 'summary-1', zincNumber: '26', totalArea: '', sheetCount: '', extraPercent: '25' },
    { id: 'summary-2', zincNumber: '24', totalArea: '', sheetCount: '', extraPercent: '25' },
    { id: 'summary-3', zincNumber: '22', totalArea: '', sheetCount: '', extraPercent: '25' },
    { id: 'summary-4', zincNumber: '20', totalArea: '', sheetCount: '', extraPercent: '25' },
    { id: 'summary-5', zincNumber: '18', totalArea: '', sheetCount: '', extraPercent: '25' }
  ]);
  const [ventHeaders, setVentHeaders] = useState<VentHeaderItem[]>([
    { width: '', height: '', dustSize: '', headCount: '', zincAmount: '' }
  ]);

  const text = {
    en: {
      title: "Image-Based Calculator",
      description: "Upload an image to calculate values based on colors and CFM inputs",
      uploadImage: "Upload Image",
      dragDrop: "Drag and drop an image here, or click to select",
      colorDetected: "Colors Detected",
      cfmInput: "CFM Value",
      lengthInput: "Length (m)",
      widthInput: "Width (in)",
      heightInput: "Height (in)",
      frictionInput: "Friction",
      velocityResult: "velocity (fpm)",
      giSheetAreaResult: "GI.Sheet Area",
      giNumberResult: "GI Number NO.",
      calculate: "Calculate All",
      results: "Calculation Results",
      color: "Color",
      cfm: "CFM",
      length: "Length (m)",
      result: "Result",
      noImage: "Please upload an image first",
      clear: "Clear All",
      downloadResults: "Download Results",
  downloadSummary: "Download Summary",
      addRow: "Add Row",
      deleteRow: "Delete Row",
      actions: "Actions",
      editColor: "Click to edit color",
      frictionRateInput: "Friction rate",
      frictionRateUnit: "in. of water/100 ft",
      summaryTable: "Summary Table",
      zincNumber: "GI Number NO.",
      totalArea: "Total Area",
  extraPercent: "Add %",
  adjustedTotal: "Total with %",
      sheetCount: "Number of Sheets",
      ventHeaderSize: "Vent header size",
      headCount: "Number of heads",
  dustSize: "Dust Size (in.)",
      zincAmountFromCalc: "Zinc amount",
      squareFeet: "square feet",
      ventHeaderDropdown: "Vent Header Information"
    },
    th: {
      title: "เครื่องคำนวณจากภาพ",
      description: "อัพโหลดภาพเพื่อคำนวณค่าจากสีและ CFM ที่ป้อนเข้า",
      uploadImage: "อัพโหลดภาพ",
      dragDrop: "ลากและวางภาพที่นี่ หรือคลิกเพื่อเลือก",
      colorDetected: "สีที่ตรวจพบ",
      cfmInput: "ค่า CFM",
      lengthInput: "ความยาว (ม.)",
      widthInput: "ความกว้าง (นิ้ว)",
      heightInput: "ความสูง (นิ้ว)",
      frictionInput: "ค่าความเสียดทาน (Friction)",
      velocityResult: "ความเร็ว (fpm)",
      giSheetAreaResult: "ปริมาณสังกะสี (GI.Sheet Area)",
      giNumberResult: "GI Number NO. (เบอร์สังกะสี)",
      calculate: "คำนวณทั้งหมด",
      results: "ผลการคำนวณ",
      color: "สี",
      cfm: "CFM",
      length: "ความยาว (ม.)",
      result: "ผลลัพธ์",
      noImage: "กรุณาอัพโหลดภาพก่อน",
      clear: "ล้างทั้งหมด",
      downloadResults: "ดาวน์โหลดผลลัพธ์",
  downloadSummary: "ดาวน์โหลดสรุป",
      addRow: "เพิ่มแถว",
      deleteRow: "ลบแถว",
      actions: "การจัดการ",
      editColor: "คลิกเพื่อแก้ไขสี",
      frictionRateInput: "ค่าความเสียดทาน",
      frictionRateUnit: "นิ้วน้ำ/100 ฟุต",
      summaryTable: "ตารางสรุป",
      zincNumber: "เบอร์สังกะสี",
      totalArea: "พื้นที่รวม",
  extraPercent: "เพิ่ม %",
  adjustedTotal: "พื้นที่รวมหลังเพิ่ม %",
      sheetCount: "จำนวนแผ่น",
      ventHeaderSize: "หัวจ่ายลมขนาด",
      headCount: "จำนวนหัว",
  dustSize: "Dust Size (นิ้ว)",
      zincAmountFromCalc: "ปริมาณสังกะสี",
      squareFeet: "ตารางฟุต",
      ventHeaderDropdown: "ข้อมูลหัวจ่ายลม"
    }
  };

  // Helper to update only lengths from backend clusters while preserving existing CFM and manual flags
  const applyMeasuredClustersToRows = (clusters: Array<{ dominant_hex?: string; sum_length_m?: number }>) => {
    setDetectedColors(clusters.map((c) => String(c.dominant_hex || '#808080')));
    setColorInputs((prev) => {
      // Map existing rows by color for quick lookup
      const byColor = new Map<string, ColorInput>();
      prev.forEach((row) => byColor.set(row.color.toLowerCase(), row));

      const nextRows: ColorInput[] = [];
      clusters.forEach((c, idx) => {
        const color = String(c.dominant_hex || '#808080').toLowerCase();
        const lengthVal = c && typeof c.sum_length_m === 'number' && c.sum_length_m > 0
          ? String(Number(c.sum_length_m).toFixed(2))
          : '';

        const existing = byColor.get(color);
        if (existing) {
          nextRows.push({ ...existing, length: lengthVal });
        } else {
          nextRows.push({
            id: `color-${idx}`,
            color,
            cfm: '',
            length: lengthVal,
            width: '',
            height: '',
            friction: '',
            isManualWidth: false,
            isManualHeight: false,
          });
        }
      });

      return nextRows.length > 0 ? nextRows : prev;
    });
  };

  // Centralized backend measurement call
  const measureWithBackend = async (file: File, refLength: string) => {
    try {
      const form = new FormData();
      form.append('file', file);
      if (refLength && !isNaN(Number(refLength))) {
        form.append('ref_length_m', String(refLength));
      }
      const resp = await fetch('/api/measure-image', {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) throw new Error(`backend ${resp.status}`);
      const data = await resp.json();
      const clusters = Array.isArray(data?.clusters) ? (data.clusters as any[]) : [];
      if (clusters.length > 0) {
        applyMeasuredClustersToRows(clusters);
      }
      if (data?.roi) setBackendROI(data.roi);
    } catch (err) {
      console.warn('Backend analyzer failed:', err);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target?.result as string;
        setUploadedImage(imageSrc);
        // Always extract local dominant colors for the color chips (UI unchanged)
        // This also initializes blank rows; we'll override rows with measured data if backend succeeds
        analyzeImageColors(imageSrc);
        // Prefer backend analyzer; fallback to local color analysis if backend fails
        if (useBackendAnalyzer) {
          lastUploadedFileRef.current = file;
          await measureWithBackend(file, refLengthM);
          setIsLoading(false);
          return;
        }
        // Fallback path
        // Local analysis already invoked above; just finish loading state
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Re-measure automatically when reference length changes
  useEffect(() => {
    const file = lastUploadedFileRef.current;
    if (!file || !uploadedImage || !useBackendAnalyzer) return;
    if (!refLengthM || isNaN(Number(refLengthM)) || Number(refLengthM) <= 0) return;
    setIsLoading(true);
    measureWithBackend(file, refLengthM).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refLengthM]);

  const analyzeImageColors = (imageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const colors = extractDominantColors(imageData);
      
      setDetectedColors(colors);
      initializeColorInputs(colors);
      setIsLoading(false);
    };
    img.src = imageSrc;
  };

  const extractDominantColors = (imageData: ImageData) => {
    const data = imageData.data;
    const colorMap = new Map<string, number>();
    
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      
      if (alpha < 128) continue;
      
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      const similarColor = findSimilarColor(hex, Array.from(colorMap.keys()));
      const key = similarColor || hex;
      
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => entry[0]);
  };

  const findSimilarColor = (color: string, existingColors: string[]) => {
    const threshold = 30;
    const [r1, g1, b1] = hexToRgb(color);
    
    for (const existing of existingColors) {
      const [r2, g2, b2] = hexToRgb(existing);
      const distance = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
      if (distance < threshold) {
        return existing;
      }
    }
    return null;
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Helper: coerce a number to the nearest positive even integer (min 2 to avoid zero-area)
  const toEvenInt = (x: number): number => {
    if (!isFinite(x)) return NaN;
    const ev = Math.round(x / 2) * 2;
    return ev <= 0 ? 2 : ev;
  };

  // IP (18): D = ( FR / (0.12317 * Q^1.82) )^(-1/4.86)
  // FR: in. of water/100 ft, Q: cfm, returns D in inches (equivalent diameter)
  const computeEquivalentDiameterIP = (FR_in_wg_per_100ft: number, Q_cfm: number): number => {
    if (!(FR_in_wg_per_100ft > 0) || !(Q_cfm > 0)) return NaN;
    const denom = 0.12317 * Math.pow(Q_cfm, 1.82);
    const base = FR_in_wg_per_100ft / denom;
    return Math.pow(base, -1 / 4.86);
  };

  const initializeColorInputs = (colors: string[]) => {
    const inputs: ColorInput[] = colors.map((color, index) => ({
      id: `color-${index}`,
      color,
      cfm: '',
      length: '',
      width: '',
      height: '',
      friction: '',
      isManualWidth: false,
      isManualHeight: false
    }));
    setColorInputs(inputs);
  };
  
  useEffect(() => {
    if (colorInputs.length > 0) {
      const updatedResults: CalculationResult[] = [];
      
      colorInputs.forEach(input => {
        if (input.cfm && input.length) {
          const cfm = parseFloat(input.cfm);
          const length = parseFloat(input.length);
          
          // Compute De from FR and Q using IP formula (18)
          const FR = parseFloat(frictionRate) || 0.1; // in.wg/100 ft
          const De = computeEquivalentDiameterIP(FR, cfm);
          if (!isFinite(De) || De <= 0) return;
          
          // Compute width and height (auto/manual)
          let width: number;
          let height: number;
          
          if (input.isManualHeight && input.height) {
            height = parseFloat(input.height);
            
            if (input.isManualWidth && input.width) {
              width = parseFloat(input.width);
            } else if (!input.isManualWidth) {
              // Solve width from De and given height (Newton)
              const target = De;
              let a = height;
              for (let i = 0; i < 10; i++) {
                const f = 1.30 * Math.pow(a * height, 0.625) / Math.pow(a + height, 0.25) - target;
                const df = 1.30 * (
                  0.625 * Math.pow(a * height, -0.375) * height / Math.pow(a + height, 0.25) -
                  0.25 * Math.pow(a * height, 0.625) / Math.pow(a + height, 1.25)
                );
                if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
                a = Math.max(0.1, a - f / df);
              }
              width = Math.max(0.1, a);
              // Enforce even integers
              width = toEvenInt(width);
              updateColorInputWithoutTrigger(input.id, 'width', String(width));
            } else {
              return;
            }
          } else if (input.isManualWidth && input.width) {
            width = toEvenInt(parseFloat(input.width));
            
            if (!input.isManualHeight) {
              // Solve height from De and given width (Newton)
              const target = De;
              let b = width;
              for (let i = 0; i < 10; i++) {
                const f = 1.30 * Math.pow(width * b, 0.625) / Math.pow(width + b, 0.25) - target;
                const df = 1.30 * (
                  0.625 * Math.pow(width * b, -0.375) * width / Math.pow(width + b, 0.25) -
                  0.25 * Math.pow(width * b, 0.625) / Math.pow(width + b, 1.25)
                );
                if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
                b = Math.max(0.1, b - f / df);
              }
              height = Math.max(0.1, b);
              height = toEvenInt(height);
              updateColorInputWithoutTrigger(input.id, 'height', String(height));
            } else {
              return;
            }
          } else if (!input.isManualWidth && !input.isManualHeight) {
            // Auto select rectangle with AR=2:1, W ≈ 1.317*De, H = W/2
            width = 1.317 * De;
            height = width / 2;
            // Enforce even integers
            width = toEvenInt(width);
            height = toEvenInt(height);
            updateColorInputWithoutTrigger(input.id, 'width', String(width));
            updateColorInputWithoutTrigger(input.id, 'height', String(height));
          } else {
            // Manual mode but missing value
            return;
          }

          const area = (width * height);
          const velocity = 144 * cfm / (area);
          // giSheetArea uses fixed formula: [0.545*(W+H)+1]*L
          const giSheetArea = (0.545 * (width + height) + 1) * length;
          
          let giNumber = '';
          if (width <= 12 && height <= 12) {
            giNumber = '26';
          } else if (width <= 30 && height <= 30) {
            giNumber = '24';
          } else if (width <= 54 && height <= 54) {
            giNumber = '22';
          } else if (width <= 84 && height <= 84) {
            giNumber = '20';
          } else {
            giNumber = '18';
          }
          
          const newResult: CalculationResult = {
            id: input.id,
            color: input.color,
            cfm,
            length,
            width,
            height,
            friction: FR, // keep FR as the friction rate shown
            velocity,
            giSheetArea,
            giNumber
          };
          
          updatedResults.push(newResult);
        }
      });
      
      setResults(updatedResults);
    }
  }, [frictionRate, colorInputs]);

  const updateColorInputWithoutTrigger = (id: string, field: 'width' | 'height', value: string) => {
    setColorInputs(prev => prev.map(input =>
      input.id === id ? { ...input, [field]: value } : input
    ));
  };

  const updateColorInput = (id: string, field: 'color' | 'cfm' | 'length' | 'width' | 'height' | 'friction' | 'isManualWidth' | 'isManualHeight', value: string | boolean) => {
    // Sanitize width/height to even integers when user edits them
    let nextValue: string | boolean = value;
    if ((field === 'width' || field === 'height') && typeof value === 'string' && value !== '') {
      const n = Number(value);
      if (!isNaN(n)) {
        const ev = toEvenInt(n);
        nextValue = String(ev);
      }
    }
    let updatedInputs = colorInputs.map(input =>
      input.id === id ? { ...input, [field]: nextValue } : input
    );
    
    // ป้องกันไม่ให้ manual mode เปิดพร้อมกัน
    if (field === 'isManualWidth' && value === true) {
      // เมื่อเปิด manual width ให้ปิด manual height
      updatedInputs = updatedInputs.map(input =>
        input.id === id ? { ...input, isManualWidth: true, isManualHeight: false } : input
      );
    } else if (field === 'isManualHeight' && value === true) {
      // เมื่อเปิด manual height ให้ปิด manual width
      updatedInputs = updatedInputs.map(input =>
        input.id === id ? { ...input, isManualHeight: true, isManualWidth: false } : input
      );
    }
    
    setColorInputs(updatedInputs);
    
    const updatedInput = updatedInputs.find(input => input.id === id);
    if (updatedInput && updatedInput.cfm && updatedInput.length) {
      const cfm = parseFloat(updatedInput.cfm);
      const length = parseFloat(updatedInput.length);
      
      // Compute De from FR and Q using IP formula (18)
      const FR = parseFloat(frictionRate) || 0.1;
      const De = computeEquivalentDiameterIP(FR, cfm);
      if (!isFinite(De) || De <= 0) {
        setResults(prev => prev.filter(result => result.id !== id));
        return;
      }
      
      // คำนวณ width และ height
  let width: number;
  let height: number;
      
      if (updatedInput.isManualHeight && updatedInput.height) {
        height = toEvenInt(parseFloat(updatedInput.height));
        
        if (updatedInput.isManualWidth && updatedInput.width) {
          width = toEvenInt(parseFloat(updatedInput.width));
        } else if (!updatedInput.isManualWidth) {
          // Solve width from De and given height (Newton)
          const target = De;
          let a = height;
          for (let i = 0; i < 10; i++) {
            const f = 1.30 * Math.pow(a * height, 0.625) / Math.pow(a + height, 0.25) - target;
            const df = 1.30 * (
              0.625 * Math.pow(a * height, -0.375) * height / Math.pow(a + height, 0.25) -
              0.25 * Math.pow(a * height, 0.625) / Math.pow(a + height, 1.25)
            );
            if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
            a = Math.max(0.1, a - f / df);
          }
          width = Math.max(0.1, a);
          width = toEvenInt(width);
        } else {
          // manual width แต่ยังไม่ได้กรอกค่า - ไม่คำนวณ
          setResults(prev => prev.filter(result => result.id !== id));
          return;
        }
      } else if (updatedInput.isManualWidth && updatedInput.width) {
        width = toEvenInt(parseFloat(updatedInput.width));
        
        if (!updatedInput.isManualHeight) {
          // Solve height from De and given width (Newton)
          const target = De;
          let b = width;
          for (let i = 0; i < 10; i++) {
            const f = 1.30 * Math.pow(width * b, 0.625) / Math.pow(width + b, 0.25) - target;
            const df = 1.30 * (
              0.625 * Math.pow(width * b, -0.375) * width / Math.pow(width + b, 0.25) -
              0.25 * Math.pow(width * b, 0.625) / Math.pow(width + b, 1.25)
            );
            if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
            b = Math.max(0.1, b - f / df);
          }
          height = Math.max(0.1, b);
          height = toEvenInt(height);
        } else {
          // manual height แต่ยังไม่ได้กรอกค่า - ไม่คำนวณ
          setResults(prev => prev.filter(result => result.id !== id));
          return;
        }
      } else if (!updatedInput.isManualWidth && !updatedInput.isManualHeight) {
        // Auto rectangle AR=2:1
        width = 1.317 * De;
        height = width / 2;
        width = toEvenInt(width);
        height = toEvenInt(height);
      } else {
        // มี manual mode แต่ยังไม่ได้กรอกค่า - ไม่คำนวณ
        setResults(prev => prev.filter(result => result.id !== id));
        return;
      }

      // Write back the coerced even integers to inputs so UI reflects the rule
      updateColorInputWithoutTrigger(updatedInput.id, 'width', isNaN(width) ? '' : String(width));
      updateColorInputWithoutTrigger(updatedInput.id, 'height', isNaN(height) ? '' : String(height));
      
      const area = (width * height);
      const velocity = 144 * cfm / (area);
  // giSheetArea uses fixed formula: [0.545*(W+H)+1]*L
  const giSheetArea = (0.545 * (width + height) + 1) * length;
      
      let giNumber = '';
      if (width <= 12 && height <= 12) {
        giNumber = '26';
      } else if (width <= 30 && height <= 30) {
        giNumber = '24';
      } else if (width <= 54 && height <= 54) {
        giNumber = '22';
      } else if (width <= 84 && height <= 84) {
        giNumber = '20';
      } else {
        giNumber = '22';
      }
      
      const newResult: CalculationResult = {
        id: updatedInput.id,
        color: updatedInput.color,
        cfm,
        length,
        width,
        height,
        friction: FR,
        velocity,
        giSheetArea,
        giNumber
      };
      
      setResults(prev => {
        const filtered = prev.filter(result => result.id !== id);
        return [...filtered, newResult];
      });
    } else {
      setResults(prev => prev.filter(result => result.id !== id));
    }
  };

  const addNewRow = () => {
    const newId = `manual-${Date.now()}`;
    const newRow: ColorInput = {
      id: newId,
      color: '#808080',
      cfm: '',
      length: '',
      width: '',
      height: '',
      friction: '',
      isManualWidth: false,
      isManualHeight: false
    };
    setColorInputs(prev => [...prev, newRow]);
    // Summary row will be automatically added by useEffect
  };

  const deleteRow = (id: string) => {
    setColorInputs(prev => prev.filter(input => input.id !== id));
    setResults(prev => prev.filter(result => result.id !== id));
    // Summary row will be automatically removed by useEffect
  };

  const calculateAllResults = () => {
    if (!uploadedImage && colorInputs.length === 0) {
      alert(text[lang].noImage);
      return;
    }

    const calculatedResults: CalculationResult[] = colorInputs
      .filter(input => input.cfm && input.length)
      .map(input => {
        const cfm = parseFloat(input.cfm);
        const length = parseFloat(input.length);
        const friction = parseFloat(input.friction) || 0;
        
        const FR = parseFloat(frictionRate) || 0.1;
        const De = computeEquivalentDiameterIP(FR, cfm);
        if (!isFinite(De) || De <= 0) {
          return null as unknown as CalculationResult;
        }
        
        let width: number;
        let height: number;
        
        if (input.isManualHeight && input.height) {
          height = toEvenInt(parseFloat(input.height));
          
          if (input.isManualWidth && input.width) {
            width = toEvenInt(parseFloat(input.width));
          } else {
            // คำนวณ width จาก De เมื่อ height เป็น manual
            const target = De;
            let a = height;
            for (let i = 0; i < 10; i++) {
              const f = 1.30 * Math.pow(a * height, 0.625) / Math.pow(a + height, 0.25) - target;
              const df = 1.30 * (
                0.625 * Math.pow(a * height, -0.375) * height / Math.pow(a + height, 0.25) -
                0.25 * Math.pow(a * height, 0.625) / Math.pow(a + height, 1.25)
              );
              if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
              a = Math.max(0.1, a - f / df);
            }
            width = Math.max(0.1, a);
            width = toEvenInt(width);
          }
        } else if (input.isManualWidth && input.width) {
          width = toEvenInt(parseFloat(input.width));
          
          const target = De;
          let b = width;
          for (let i = 0; i < 10; i++) {
            const f = 1.30 * Math.pow(width * b, 0.625) / Math.pow(width + b, 0.25) - target;
            const df = 1.30 * (
              0.625 * Math.pow(width * b, -0.375) * width / Math.pow(width + b, 0.25) -
              0.25 * Math.pow(width * b, 0.625) / Math.pow(width + b, 1.25)
            );
            if (Math.abs(f) < 0.001 || Math.abs(df) < 0.001) break;
            b = Math.max(0.1, b - f / df);
          }
          
          height = Math.max(0.1, b);
          height = toEvenInt(height);
        } else {
          // คำนวณทั้ง width และ height อัตโนมัติ โดยใช้สูตร W = 2*H = 1.317*D
          const D = De;
          
          // จากสูตร W = 1.317*D และ W = 2*H
          width = 1.317 * D;
          height = width / 2;
          width = toEvenInt(width);
          height = toEvenInt(height);
        }

        const area = (width * height);
        const velocity = 144 * cfm / (area);
  // giSheetArea uses fixed formula: [0.545*(W+H)+1]*L
  const giSheetArea = (0.545 * (width + height) + 1) * length;
        
        let giNumber = '';
        if (width <= 12 && height <= 12) {
          giNumber = '26';
        } else if (width <= 30 && height <= 30) {
          giNumber = '24';
        } else if (width <= 54 && height <= 54) {
          giNumber = '22';
        } else if (width <= 84 && height <= 84) {
          giNumber = '20';
        } else {
          giNumber = '22';
        }
        
        return {
          id: input.id,
          color: input.color,
          cfm,
          length,
          width,
          height,
          friction, // keep original friction field from row if used elsewhere
          velocity,
          giSheetArea,
          giNumber
        };
      })
      .filter(Boolean) as CalculationResult[];

    setResults(calculatedResults);
  };

  // Clear all inputs, results, and UI state
  const clearAll = () => {
    setUploadedImage(null);
    setDetectedColors([]);
    setColorInputs([]);
    setResults([]);
    setFrictionRate('');
    setSummaryRows([
      { id: 'summary-1', zincNumber: '26', totalArea: '', sheetCount: '', extraPercent: '25' },
      { id: 'summary-2', zincNumber: '24', totalArea: '', sheetCount: '', extraPercent: '25' },
      { id: 'summary-3', zincNumber: '22', totalArea: '', sheetCount: '', extraPercent: '25' },
      { id: 'summary-4', zincNumber: '20', totalArea: '', sheetCount: '', extraPercent: '25' },
      { id: 'summary-5', zincNumber: '18', totalArea: '', sheetCount: '', extraPercent: '25' }
    ]);
  setVentHeaders([{ width: '', height: '', dustSize: '', headCount: '', zincAmount: '' }]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download results as CSV
  const downloadResults = () => {
    if (results.length === 0) return;
    const headers = ['Color', 'CFM Value', 'Length (m)', 'Width (in)', 'Height (in)', 'Friction', 'Velocity (fpm)', 'GI Sheet Area', 'GI Number'];
    const rows = results.map(r => [
      r.color,
      r.cfm,
      r.length,
      r.width,
      r.height,
      r.friction,
      r.velocity.toFixed(2),
      r.giSheetArea.toFixed(2),
      r.giNumber
    ]);
    const csv = [headers.join(','), ...rows.map(arr => arr.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calculation-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download summary table as CSV (includes Adjusted Total and Sheets)
  const downloadSummary = () => {
    if (summaryRows.length === 0) return;
    const headers = [
      text[lang].zincNumber,
      text[lang].totalArea,
      text[lang].extraPercent,
      text[lang].adjustedTotal,
      text[lang].sheetCount,
    ];

    const rows = summaryRows.map((row) => {
      const base = parseFloat(row.totalArea) || 0;
      const pct = parseFloat(row.extraPercent) || 0;
      const adjusted = base * (1 + pct / 100);
      const sheetsRaw = adjusted > 0 ? (adjusted * 1.25) / 32 : 0;
      const sheets = sheetsRaw > 0 ? Math.floor(sheetsRaw) : 0;
      return [
        row.zincNumber,
        base > 0 ? base.toFixed(2) : '',
        String(pct),
        adjusted > 0 ? adjusted.toFixed(2) : '',
        sheets > 0 ? String(sheets) : '',
      ];
    });

    const csv = [headers.join(','), ...rows.map(arr => arr.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary-table.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Functions for summary table management
  const updateSummaryRow = (index: number, field: keyof Omit<SummaryTableRow, 'id'>, value: string) => {
    // ป้องกันการแก้ไข zincNumber
    if (field === 'zincNumber') return;
    
    setSummaryRows(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  // Functions for vent header management (multi-row)
  const updateVentHeader = (index: number, field: keyof VentHeaderItem, value: string) => {
    setVentHeaders(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as VentHeaderItem;
      return next;
    });
  };

  const addVentHeaderRow = () => {
    setVentHeaders(prev => [...prev, { width: '', height: '', dustSize: '', headCount: '', zincAmount: '' }]);
  };

  const removeVentHeaderRow = (index: number) => {
    setVentHeaders(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  // Auto-calculate zinc amount for each vent header row: 0.545 * (W + H + 4) * DUST_SIZE * N
  useEffect(() => {
    setVentHeaders(prev => {
      let changed = false;
      const next = prev.map(item => {
        const W = parseFloat(item.width);
        const H = parseFloat(item.height);
        const DS = parseFloat(item.dustSize);
        const N = parseFloat(item.headCount);
        let zincAmount = '';
        if (isFinite(W) && isFinite(H) && isFinite(DS) && isFinite(N) && W > 0 && H > 0 && DS > 0 && N > 0) {
          zincAmount = (0.545 * (W + H + 4) * DS * N).toFixed(2);
        }
        if (zincAmount !== item.zincAmount) {
          changed = true;
          return { ...item, zincAmount } as VentHeaderItem;
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [ventHeaders.map(v => `${v.width}|${v.height}|${v.dustSize}|${v.headCount}`).join(',')]);


  // Helper: compute Total Area using fixed formula [0.545*(W+H)+1]*L
  // W, H in inches (from results), L as provided in row length (m). Do not modify constants.
  const computeTotalArea = (W: number, H: number, L: number): number => {
    if (!(W > 0) || !(H > 0) || !(L > 0)) return 0;
    return (0.545 * (W + H) + 1) * L;
  };

  // Auto-calculate and populate Total Area per GI Number NO. in the summary table.
  // This sums the Total Area for all rows whose result.giNumber matches the summary row's GI Number.
  // For GI Number '22', also add the Vent Header zinc amount (from calculation).
  useEffect(() => {
    if (!summaryRows || summaryRows.length === 0) return;
    setSummaryRows(prev => prev.map(row => {
      const gi = String(row.zincNumber || '').trim();
      let sum = results
        .filter(r => String(r.giNumber || '').trim() === gi)
        .reduce((acc, r) => acc + computeTotalArea(r.width, r.height, r.length), 0);
      // Add zinc amount only for GI Number 22 (sum across all vent header rows)
      if (gi === '22') {
        const zincSum = ventHeaders.reduce((acc, vh) => {
          const z = parseFloat(vh.zincAmount);
          return acc + (isFinite(z) && z > 0 ? z : 0);
        }, 0);
        sum += zincSum;
      }
      return {
        ...row,
        totalArea: sum > 0 ? sum.toFixed(2) : ''
      };
    }));
  }, [results, ventHeaders]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Card className="mb-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-700 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            {text[lang].title}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">{text[lang].description}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {text[lang].uploadImage}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="max-w-full h-48 object-contain mx-auto rounded"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-slate-500">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p>{text[lang].dragDrop}</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

      {/* แสดงสีที่ตรวจพบเฉพาะเมื่อมีการอัพโหลดรูป */}
      {uploadedImage && detectedColors.length > 0 && (
        <Card className="bg-white shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {text[lang].colorDetected}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {detectedColors.map((color, index) => (
                <div key={index} className="text-center">
                  <div
                    className="w-full h-16 rounded border shadow-sm mb-2"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-xs font-mono text-slate-600">{color}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* แสดงเฟรมการคำนวณเฉพาะเมื่อมีการอัพโหลดรูปหรือมีข้อมูลในตาราง */}
      {(uploadedImage || colorInputs.length > 0) && (
        <Card className="mb-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-700 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Input Values & Results
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAll} className="text-sm flex items-center gap-2">
              <X className="w-4 h-4" />
              {text[lang].clear}
            </Button>
            {results.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadResults}
                className="text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {text[lang].downloadResults}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
            {/* Reference length (m) - above friction rate */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0">
                <span className="text-sm font-semibold text-blue-700">
                  {lang === 'th' ? 'ความยาวอ้างอิง (ม.)' : 'Reference length (m)'}:
                </span>
              </div>
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  placeholder="5"
                  step="0.01"
                  value={refLengthM}
                  onChange={(e) => setRefLengthM(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Friction rate */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <span className="text-sm font-semibold text-blue-700">
                  {text[lang].frictionRateInput}:
                </span>
              </div>
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  placeholder="0.1"
                  step="0.001"
                  value={frictionRate}
                  onChange={(e) => setFrictionRate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center text-sm text-blue-600 font-medium">
                {text[lang].frictionRateUnit}
                <Dialog>
                  <DialogTrigger asChild>
                    <Info className="ml-2 h-4 w-4 cursor-pointer text-gray-500 hover:text-blue-600" />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[850px]">
                    <h3 className="text-lg font-semibold">Friction Rate</h3>
                    <img src="/fr.png" alt="Friction Rate" className="w-full" />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          
          {colorInputs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].color}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].cfmInput}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].lengthInput}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].widthInput}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].heightInput}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].frictionInput}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">
                        <div className="flex items-center">
                          {text[lang].velocityResult}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Info className="ml-2 h-4 w-4 cursor-pointer text-slate-500 hover:text-blue-600" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[850px]">
                              <h3 className="text-lg font-semibold">Velocity (fpm)</h3>
                              <img src="/velocity.png" alt="Velocity (fpm)" className="w-full" />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].giSheetAreaResult}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">
                        <div className="flex items-center">
                          {text[lang].giNumberResult}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Info className="ml-2 h-4 w-4 cursor-pointer text-slate-500 hover:text-blue-600" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[850px]">
                              <h3 className="text-lg font-semibold">GI Number NO.</h3>
                              <img src="/no.png" alt="GI Number NO." className="w-full" />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colorInputs.map((input) => {
                      const result = results.find(r => r.id === input.id);
                      return (
                        <tr key={input.id} className="hover:bg-slate-50">
                          <td className="border border-gray-200 p-3">
                            <div className="flex items-center">
                              <input
                                type="color"
                                value={input.color}
                                onChange={(e) => updateColorInput(input.id, 'color', e.target.value)}
                                className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors"
                                title={text[lang].editColor}
                              />
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Input
                              type="number"
                              placeholder="0"
                              value={input.cfm}
                              onChange={(e) => updateColorInput(input.id, 'cfm', e.target.value)}
                              className="w-full text-sm"
                            />
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Input
                              type="number"
                              placeholder="0"
                              step="0.1"
                              value={input.length}
                              onChange={(e) => updateColorInput(input.id, 'length', e.target.value)}
                              className="w-full text-sm"
                            />
                          </td>
                          <td className="border border-gray-200 p-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Even"
                                step="2"
                                value={input.width}
                                onChange={(e) => updateColorInput(input.id, 'width', e.target.value)}
                                className={`flex-1 text-sm ${!(input.isManualWidth && input.isManualHeight) ? 'bg-blue-50 border-blue-200' : ''}`}
                                disabled={!(input.isManualWidth && input.isManualHeight)}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setColorInputs(prev => prev.map(r => {
                                    if (r.id !== input.id) return r;
                                    // toggle manual mode for both dimensions
                                    const manual = !(r.isManualWidth && r.isManualHeight);
                                    let newWidth = r.width;
                                    let newHeight = r.height;
                                    if (!manual) {
                                      // revert to auto calculation
                                      const cfm = parseFloat(r.cfm);
                                      const FR = parseFloat(frictionRate) || 0.1;
                                      const De = computeEquivalentDiameterIP(FR, cfm);
                                      if (isFinite(De) && De > 0) {
                                        newWidth = String(toEvenInt(1.317 * De));
                                        newHeight = String(toEvenInt(1.317 * De / 2));
                                      }
                                    }
                                    return {
                                      ...r,
                                      isManualWidth: manual,
                                      isManualHeight: manual,
                                      width: newWidth,
                                      height: newHeight
                                    };
                                  }));
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  (input.isManualWidth && input.isManualHeight)
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                                title={(input.isManualWidth && input.isManualHeight) ? 'Switch to Auto' : 'Switch to Manual'}
                              >
                                {(input.isManualWidth && input.isManualHeight) ? 'M' : 'A'}
                              </button>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Even"
                                step="2"
                                value={input.height}
                                onChange={(e) => updateColorInput(input.id, 'height', e.target.value)}
                                className={`flex-1 text-sm ${!(input.isManualWidth && input.isManualHeight) ? 'bg-blue-50 border-blue-200' : ''}`}
                                disabled={!(input.isManualWidth && input.isManualHeight)}
                              />
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3">
                            {result ? (
                              <span className="font-mono font-bold text-orange-600 text-sm">
                                {result.friction.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {result ? (
                              <span className="font-mono font-bold text-blue-600 text-sm">
                                {result.velocity.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {result ? (
                              <span className="font-mono font-bold text-green-600 text-sm">
                                {result.giSheetArea.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {result ? (
                              <span className="font-mono font-bold text-purple-600 text-sm">
                                {result.giNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRow(input.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-start">
                <Button 
                  onClick={addNewRow} 
                  variant="outline" 
                  className="text-sm flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" />
                  {text[lang].addRow}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-slate-500">
              <p className="mb-4 text-center">{lang === 'th' ? 'ยังไม่มีข้อมูลในตาราง' : 'No data in table'}</p>
              <div className="flex justify-start">
                <Button 
                  onClick={addNewRow} 
                  variant="outline" 
                  className="text-sm flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" />
                  {text[lang].addRow}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Vent Header Information moved to main frame (before Summary Table) */}
      {(uploadedImage || colorInputs.length > 0) && (
        <Card className="mb-6 bg-white shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              {lang === 'th' ? 'ข้อมูลหัวจ่ายลม (Vent Header)' : 'Vent Header Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex flex-col gap-3 text-sm">
                {ventHeaders.map((vh, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-gray-700">
                      {text[lang].ventHeaderSize}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={vh.width}
                        onChange={(e) => updateVentHeader(idx, 'width', e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-gray-600">X</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={vh.height}
                        onChange={(e) => updateVentHeader(idx, 'height', e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-gray-600">in.</span>
                    </div>

                    <span className="font-medium text-gray-700">
                      {text[lang].dustSize}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.35"
                      value={vh.dustSize}
                      onChange={(e) => updateVentHeader(idx, 'dustSize', e.target.value)}
                      className="w-24 h-8 text-sm"
                    />

                    <span className="font-medium text-gray-700">
                      {text[lang].headCount}
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={vh.headCount}
                      onChange={(e) => updateVentHeader(idx, 'headCount', e.target.value)}
                      className="w-24 h-8 text-sm"
                    />
                    <span className="text-gray-600">{lang === 'th' ? 'หัว' : 'heads'}</span>

                    <span className="font-medium text-gray-700">
                      {text[lang].zincAmountFromCalc}
                    </span>
                    <Input
                      type="text"
                      placeholder="0"
                      value={vh.zincAmount}
                      readOnly
                      className="w-28 h-8 text-sm bg-blue-50 text-blue-800 font-mono font-semibold"
                    />
                    <span className="text-gray-600">{text[lang].squareFeet}</span>

                    {ventHeaders.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeVentHeaderRow(idx)} className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-1" /> {text[lang].deleteRow}
                      </Button>
                    )}
                  </div>
                ))}
                <div>
                  <Button variant="outline" size="sm" onClick={addVentHeaderRow} className="text-green-700 border-green-200 hover:bg-green-50">
                    <Plus className="w-4 h-4 mr-1" /> {text[lang].addRow}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table - แสดงเฉพาะเมื่อมีการอัพโหลดรูปหรือมีข้อมูลในตาราง */}
      {(uploadedImage || colorInputs.length > 0) && (
      <Card className="mb-6 bg-white shadow-lg border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            {text[lang].summaryTable}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadSummary}
              className="text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {text[lang].downloadSummary}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summaryRows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].zincNumber}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].totalArea}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].extraPercent}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].adjustedTotal}</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-semibold text-slate-700">{text[lang].sheetCount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="text"
                            value={row.zincNumber}
                            readOnly
                            className="w-full text-sm bg-slate-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="text"
                            placeholder={lang === 'th' ? 'คำนวณอัตโนมัติ' : 'Auto-calculated'}
                            value={row.totalArea}
                            readOnly
                            className="w-full text-sm bg-slate-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="25"
                              step="1"
                              value={row.extraPercent}
                              onChange={(e) => updateSummaryRow(index, 'extraPercent', e.target.value)}
                              className="w-full text-sm"
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                        </td>
                        <td className="border border-gray-200 p-3">
                          {(() => {
                            const base = parseFloat(row.totalArea) || 0;
                            const pct = parseFloat(row.extraPercent) || 0;
                            const adjusted = base * (1 + pct / 100);
                            const display = adjusted > 0 ? adjusted.toFixed(2) : '';
                            return (
                              <Input
                                type="text"
                                placeholder={lang === 'th' ? 'คำนวณอัตโนมัติ' : 'Auto-calculated'}
                                value={display}
                                readOnly
                                className="w-full text-sm bg-slate-50 cursor-not-allowed"
                              />
                            );
                          })()}
                        </td>
                        <td className="border border-gray-200 p-3">
                          {(() => {
                            const base = parseFloat(row.totalArea) || 0;
                            const pct = parseFloat(row.extraPercent) || 0;
                            const adjusted = base * (1 + pct / 100);
                            // Sheets = floor((Adjusted Total * 1.25) / 32)
                            const sheetsRaw = adjusted > 0 ? (adjusted * 1.25) / 32 : 0;
                            const sheets = sheetsRaw > 0 ? Math.floor(sheetsRaw) : 0;
                            const display = sheets > 0 ? String(sheets) : '';
                            return (
                              <Input
                                type="text"
                                placeholder={lang === 'th' ? 'คำนวณอัตโนมัติ' : 'Auto-calculated'}
                                value={display}
                                readOnly
                                className="w-full text-sm bg-slate-50 cursor-not-allowed"
                              />
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>{lang === 'th' ? 'ตารางสรุปจะปรากฏเมื่อมีข้อมูลในตารางหลัก' : 'Summary table will appear when main table has data'}</p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <canvas ref={canvasRef} className="hidden" />
      
      {isLoading && (
        <Alert className="mt-4">
          <AlertDescription>
            กำลังวิเคราะห์ภาพ กรุณารอสักครู่...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageCalculator;