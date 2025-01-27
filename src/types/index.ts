export interface SegmentationClass {
  id: number;
  name: string;
  color: string;
}

export interface Annotation {
  id: number;
  image_id: number;
  category_id: number;
  segmentation: number[][];
  area: number;
  bbox: number[];
  iscrowd: number;
}

export interface COCOFormat {
  images: {
    id: number;
    file_name: string;
    height: number;
    width: number;
  }[];
  annotations: Annotation[];
  categories: {
    id: number;
    name: string;
    supercategory?: string;
  }[];
}

export type AnnotationMode = 'brush' | 'polygon' | 'eraser' | 'pan';

export interface CanvasState {
  mode: AnnotationMode;
  brushSize: number;
  activeClass: SegmentationClass | null;
  history: string[];
  currentHistoryIndex: number;
}
