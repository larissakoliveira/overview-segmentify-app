import { fabric } from 'fabric';
import { SegmentationClass, COCOFormat, Annotation } from '../types';

interface FabricObject extends fabric.Object {
  path?: any[];
  points?: { x: number; y: number }[];
}

function getPathPoints(path: FabricObject): number[][] {
  const points: number[][] = [];
  const pathData = path.path;
  
  if (!pathData) return points;

  let currentPoints: number[] = [];
  
  pathData.forEach((command: any[]) => {
    if (command[0] === 'M' || command[0] === 'L') {
      currentPoints.push(command[1], command[2]);
    } else if (command[0] === 'Q') {
      currentPoints.push(command[3], command[4]);
    }
  });

  if (currentPoints.length > 0) {
    points.push(currentPoints);
  }

  return points;
}

function getPolygonPoints(polygon: FabricObject): number[][] {
  const points: number[][] = [];
  const polygonPoints = polygon.points;
  
  if (!polygonPoints) return points;

  const flatPoints = polygonPoints.reduce((acc: number[], point: { x: number; y: number }) => {
    acc.push(point.x, point.y);
    return acc;
  }, []);

  points.push(flatPoints);
  return points;
}

function getBoundingBox(points: number[][]): number[] {
  if (!points.length || !points[0].length) {
    return [0, 0, 0, 0];
  }

  const flatPoints = points[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < flatPoints.length; i += 2) {
    const x = flatPoints[i];
    const y = flatPoints[i + 1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return [
    minX,
    minY,
    maxX - minX, // width
    maxY - minY  // height
  ];
}

function calculateArea(points: number[][]): number {
  if (!points.length || !points[0].length) return 0;

  const flatPoints = points[0];
  let area = 0;

  for (let i = 0; i < flatPoints.length; i += 2) {
    const x1 = flatPoints[i];
    const y1 = flatPoints[i + 1];
    const x2 = flatPoints[(i + 2) % flatPoints.length];
    const y2 = flatPoints[(i + 3) % flatPoints.length];
    area += (x1 * y2) - (x2 * y1);
  }

  return Math.abs(area) / 2;
}

export function exportToCOCO(canvas: fabric.Canvas, classes: SegmentationClass[], imageName: string): COCOFormat {
  const objects = canvas.getObjects();
  const imageWidth = canvas.getWidth();
  const imageHeight = canvas.getHeight();

  const cocoData: COCOFormat = {
    images: [{
      id: 1,
      file_name: imageName,
      height: imageHeight,
      width: imageWidth,
    }],
    annotations: [],
    categories: classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      supercategory: 'object'
    }))
  };

  let annotationId = 1;

  objects.forEach((obj: FabricObject) => {
    // Skip the background image
    if (obj.type === 'image') return;

    const classId = classes.find(cls => cls.color === obj.fill)?.id;
    if (!classId) return;

    let segmentation: number[][];
    if (obj.type === 'path') {
      segmentation = getPathPoints(obj);
    } else if (obj.type === 'polygon') {
      segmentation = getPolygonPoints(obj);
    } else {
      return;
    }

    if (segmentation.length === 0) return;

    const bbox = getBoundingBox(segmentation);
    const area = calculateArea(segmentation);

    const annotation: Annotation = {
      id: annotationId++,
      image_id: 1,
      category_id: classId,
      segmentation,
      area,
      bbox,
      iscrowd: 0
    };

    cocoData.annotations.push(annotation);
  });

  return cocoData;
}

export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
