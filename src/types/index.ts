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
  info: {
    description: string;
    url: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string;
  };
  licenses: {
    id: number;
    name: string;
    url: string;
  }[];
  images: {
    id: number;
    file_name: string;
    height: number;
    width: number;
    license: number;
    coco_url: string;
    date_captured: string;
    flickr_url: string;
  }[];
  annotations: Annotation[];
  categories: {
    id: number;
    name: string;
    supercategory?: string;
  }[];
}

export type AnnotationMode = 'brush' | 'polygon' | 'eraser' | 'pan' | 'select';

export interface CanvasState {
  mode: AnnotationMode;
  brushSize: number;
  activeClass: SegmentationClass | null;
  history: string[];
  currentHistoryIndex: number;
}

declare module 'fabric/fabric-impl' {
  export interface Canvas {
    imageWidth?: number;
    imageHeight?: number;
  }
}
