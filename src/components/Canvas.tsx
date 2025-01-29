import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { AnnotationMode, SegmentationClass } from '../types';

interface CanvasProps {
  mode: AnnotationMode;
  brushSize: number;
  activeClass: SegmentationClass | null;
  currentImage: { src: string; name: string } | null;
  onHistoryUpdate: (canvasState: string) => void;
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  zoom: number;
}

const Canvas: React.FC<CanvasProps> = ({
  mode,
  brushSize,
  activeClass,
  currentImage,
  onHistoryUpdate,
  fabricCanvasRef,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPolygon = useRef<fabric.Polygon | null>(null);
  const polygonPoints = useRef<fabric.Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: mode === 'brush',
      selection: false,
      width,
      height,
      backgroundColor: '#f0f0f0',
    });

    fabricCanvasRef.current = canvas;

    // Set up brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = brushSize;
    canvas.freeDrawingBrush.color = activeClass?.color || '#000000';

    const updateCanvasSize = () => {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.setWidth(width);
      canvas.setHeight(height);
      
      const objects = canvas.getObjects();
      objects.forEach(obj => {
        if (obj.type === 'image') {
          const img = obj as fabric.Image;
          const imgAspectRatio = img.width! / img.height!;
          const canvasAspectRatio = width / height;
          
          let scaleX, scaleY;
          if (imgAspectRatio > canvasAspectRatio) {
            scaleX = width / img.width!;
            scaleY = scaleX;
          } else {
            scaleY = height / img.height!;
            scaleX = scaleY;
          }
          
          img.set({
            scaleX,
            scaleY,
            left: (width - img.width! * scaleX) / 2,
            top: (height - img.height! * scaleY) / 2,
          });
        }
      });

      canvas.renderAll();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Enable panning when spacebar is held
    let isPanning = false;
    let lastPosX: number;
    let lastPosY: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning) {
        isPanning = true;
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isPanning = false;
        canvas.defaultCursor = 'default';
        canvas.selection = false;
      }
    };

    const handleMouseDown = (e: fabric.IEvent) => {
      if (isPanning) {
        canvas.defaultCursor = 'grabbing';
        const pointer = canvas.getPointer(e.e);
        lastPosX = pointer.x;
        lastPosY = pointer.y;
      }
    };

    const handleMouseMove = (e: fabric.IEvent) => {
      if (isPanning && (e.e as MouseEvent).buttons === 1) {
        const pointer = canvas.getPointer(e.e);
        const deltaX = pointer.x - lastPosX;
        const deltaY = pointer.y - lastPosY;

        canvas.relativePan(new fabric.Point(deltaX, deltaY));

        lastPosX = pointer.x;
        lastPosY = pointer.y;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom / 100);
  }, [zoom]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentImage) return;
  
    fabric.Image.fromURL(
      currentImage.src,
      (img) => {
        if (!img) return;
  
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const imgAspectRatio = img.width! / img.height!;
        const maxWidth = canvasWidth * 0.3;
        const maxHeight = canvasHeight * 0.3;

        let scaleX, scaleY;
        if (imgAspectRatio > 1) {
          scaleX = maxWidth / img.width!;
          scaleY = scaleX;
        } else {
          scaleY = maxHeight / img.height!;
          scaleX = scaleY;
        }

        const randomLeft = Math.random() * (canvasWidth - img.width! * scaleX);
        const randomTop = Math.random() * (canvasHeight - img.height! * scaleY);
  
        img.set({
          left: randomLeft,
          top: randomTop,
          scaleX,
          scaleY,
          selectable: true,
          evented: true,
        });
  
        canvas.add(img);
        canvas.isDrawingMode = false;
        canvas.renderAll();
      },
      { crossOrigin: 'anonymous' }
    );
  }, [currentImage, fabricCanvasRef]);
  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    canvas.isDrawingMode = mode === 'brush';
    canvas.selection = mode !== 'brush';
  
    const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
    if (brush) {
      brush.width = brushSize * (1 / zoom);
      brush.color = activeClass?.color || '#000000';
    }
  
    if (mode === 'eraser') {
      canvas.defaultCursor = 'crosshair';
    } else if (mode === 'pan') {
      canvas.defaultCursor = 'grab';
    } else {
      canvas.defaultCursor = 'default';
    }
  }, [mode, brushSize, activeClass, zoom, fabricCanvasRef]);

  // Handle polygon drawing
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    const handleMouseDown = (e: fabric.IEvent) => {
      if (mode !== 'polygon' || !activeClass) return;
  
      const pointer = canvas.getPointer(e.e);
      polygonPoints.current.push(new fabric.Point(pointer.x, pointer.y));
  
      if (polygonPoints.current.length === 1) {
        // Create a new polygon
        currentPolygon.current = new fabric.Polygon([...polygonPoints.current], {
          fill: activeClass.color,
          opacity: 0.5,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        canvas.add(currentPolygon.current);
      } else if (currentPolygon.current) {
        // Update the existing polygon
        currentPolygon.current.set({ points: [...polygonPoints.current] });
        canvas.renderAll();
      }
    };
  
    const handleDblClick = () => {
      if (mode !== 'polygon' || polygonPoints.current.length < 3) return;
  
      if (currentPolygon.current) {
        currentPolygon.current.set({
          points: [...polygonPoints.current],
          selectable: false,
          evented: false,
        });
        canvas.renderAll();
  
        onHistoryUpdate(JSON.stringify(canvas));
        currentPolygon.current = null;
        polygonPoints.current = [];
        isDrawing.current = false;
      }
    };
  
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:dblclick', handleDblClick);
  
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:dblclick', handleDblClick);
    };
  }, [mode, activeClass, onHistoryUpdate, fabricCanvasRef]);

useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const handlePathCreated = (e: fabric.IEvent & { path?: fabric.Path }) => {
    const path = e.path;
    if (path) {
      path.selectable = false;
      path.evented = false;
    }
    onHistoryUpdate(JSON.stringify(canvas));
  };

  const handleMouseUp = () => {
    if (mode === 'eraser') {
      onHistoryUpdate(JSON.stringify(canvas));
    }
  };

  canvas.on('path:created', handlePathCreated);
  canvas.on('mouse:up', handleMouseUp);

  return () => {
    canvas.off('path:created', handlePathCreated);
    canvas.off('mouse:up', handleMouseUp);
  };
}, [mode, onHistoryUpdate, fabricCanvasRef]);

useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const handleMouseDown = (e: fabric.IEvent) => {
    if (mode !== 'eraser') return;

    const pointer = canvas.getPointer(e.e);
    const point = new fabric.Point(pointer.x, pointer.y);

    const objectsToRemove = canvas.getObjects().filter((obj) => {
      if (obj.type === 'image') return false;
      return obj.containsPoint(point);
    });

    objectsToRemove.forEach((obj) => {
      canvas.remove(obj);
    });

    onHistoryUpdate(JSON.stringify(canvas));
    canvas.renderAll();
  };

  canvas.on('mouse:down', handleMouseDown);

  return () => {
    canvas.off('mouse:down', handleMouseDown);
  };
}, [mode, onHistoryUpdate, fabricCanvasRef]);
  
  return (
    <div ref={containerRef} className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Canvas;
