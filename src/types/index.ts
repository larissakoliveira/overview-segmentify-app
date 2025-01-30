import { RefObject } from 'react';
import { fabric } from 'fabric';

export interface CanvasProps {
  mode: AnnotationMode;
  brushSize: number;
  activeClass: SegmentationClass | null;
  currentImage: { src: string; name: string } | null;
  onHistoryUpdate: (canvasState: string) => void;
  fabricCanvasRef: RefObject<fabric.Canvas | null>;
  zoom: number;
}

export interface ClassManagerProps {
  classes: SegmentationClass[];
  activeClass: SegmentationClass | null;
  onAddClass: (className: string, color: string) => void;
  onDeleteClass: (classId: number) => void;
  onSelectClass: (classId: number) => void;
}

export interface FabricObject extends fabric.Object {
  path?: any[];
  points?: { x: number; y: number }[];
}

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

export interface ImageHandlerProps {
  fabricCanvasRef: RefObject<fabric.Canvas | null>;
  currentImage: { src: string; name: string } | null;
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
