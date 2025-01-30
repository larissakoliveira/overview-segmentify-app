import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { CanvasProps } from '../../types';
import { useImageHandler } from '../../hooks/useImageHandler';

const Canvas = ({
  mode,
  brushSize,
  activeClass,
  currentImage,
  onHistoryUpdate,
  fabricCanvasRef,
  zoom,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const polygonPoints = useRef<fabric.Point[]>([]);
  const firstPoint = useRef<fabric.Circle | null>(null);
  const lines = useRef<fabric.Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || fabricCanvasRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: mode === 'brush',
      selection: false,
      width,
      height,
      backgroundColor: '#f0f0f0',
      renderOnAddRemove: true,
      stateful: false,
    });

    fabricCanvasRef.current = canvas;

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

    const handleCanvasClick = (e: fabric.IEvent) => {
      if (mode !== 'polygon' || isPanning) return;

      const pointer = canvas.getPointer(e.e);
      const point = new fabric.Point(pointer.x, pointer.y);

      if (firstPoint.current && polygonPoints.current.length > 2) {
        const firstPointCoords = firstPoint.current.getCenterPoint();
        const distance = Math.sqrt(
          Math.pow(firstPointCoords.x - point.x, 2) + 
          Math.pow(firstPointCoords.y - point.y, 2)
        );

        if (distance < 10) {
          const lastLine = new fabric.Line(
            [
              polygonPoints.current[polygonPoints.current.length - 1].x,
              polygonPoints.current[polygonPoints.current.length - 1].y,
              polygonPoints.current[0].x,
              polygonPoints.current[0].y
            ],
            {
              stroke: activeClass?.color || '#000000',
              strokeWidth: 2,
              selectable: false,
              evented: false
            }
          );
          canvas.add(lastLine);
          lines.current.push(lastLine);

          const polygon = new fabric.Polygon(polygonPoints.current, {
            fill: activeClass?.color ? `${activeClass.color}40` : '#00000040',
            stroke: activeClass?.color || '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false
          });
          canvas.add(polygon);

          polygonPoints.current = [];
          firstPoint.current = null;
          lines.current = [];
          canvas.renderAll();
          return;
        }
      }

      polygonPoints.current.push(point);

      const dot = new fabric.Circle({
        left: point.x - 4,
        top: point.y - 4,
        radius: 4,
        fill: activeClass?.color || '#000000',
        selectable: false,
        evented: false
      });
      canvas.add(dot);

      if (!firstPoint.current) {
        firstPoint.current = dot;
      }

      if (polygonPoints.current.length > 1) {
        const lastPoint = polygonPoints.current[polygonPoints.current.length - 2];
        const line = new fabric.Line(
          [lastPoint.x, lastPoint.y, point.x, point.y],
          {
            stroke: activeClass?.color || '#000000',
            strokeWidth: 2,
            selectable: false,
            evented: false
          }
        );
        canvas.add(line);
        lines.current.push(line);
      }

      canvas.renderAll();
    };

    document.addEventListener('keydown', handleKeyDown, { passive: true });
    document.addEventListener('keyup', handleKeyUp, { passive: true });
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:down', handleCanvasClick);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:down', handleCanvasClick);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    const handleMouseDown = (e: fabric.IEvent) => {
      if (mode !== 'polygon' || isDrawing.current || !activeClass) return;

      const pointer = canvas.getPointer(e.e);
      const point = new fabric.Point(pointer.x, pointer.y);

      if (firstPoint.current && polygonPoints.current.length > 2) {
        const firstPointCoords = firstPoint.current.getCenterPoint();
        const distance = Math.sqrt(
          Math.pow(firstPointCoords.x - point.x, 2) + 
          Math.pow(firstPointCoords.y - point.y, 2)
        );

        if (distance < 10) { 
          const lastLine = new fabric.Line(
            [
              polygonPoints.current[polygonPoints.current.length - 1].x,
              polygonPoints.current[polygonPoints.current.length - 1].y,
              polygonPoints.current[0].x,
              polygonPoints.current[0].y
            ],
            {
              stroke: activeClass.color,
              strokeWidth: 2,
              selectable: false,
              evented: false
            }
          );
          canvas.add(lastLine);
          lines.current.push(lastLine);

          const polygon = new fabric.Polygon(polygonPoints.current, {
            fill: `${activeClass.color}40`,
            stroke: activeClass.color,
            strokeWidth: 2,
            selectable: false,
            evented: false,
            objectCaching: false
          });
          canvas.add(polygon);

          onHistoryUpdate(JSON.stringify(canvas));

          polygonPoints.current = [];
          firstPoint.current = null;
          lines.current = [];
          canvas.renderAll();
          return;
        }
      }

      polygonPoints.current.push(point);

      const dot = new fabric.Circle({
        left: point.x - 4,
        top: point.y - 4,
        radius: 4,
        fill: activeClass.color,
        selectable: false,
        evented: false
      });
      canvas.add(dot);

      if (!firstPoint.current) {
        firstPoint.current = dot;
      }

      if (polygonPoints.current.length > 1) {
        const lastPoint = polygonPoints.current[polygonPoints.current.length - 2];
        const line = new fabric.Line(
          [lastPoint.x, lastPoint.y, point.x, point.y],
          {
            stroke: activeClass.color,
            strokeWidth: 2,
            selectable: false,
            evented: false
          }
        );
        canvas.add(line);
        lines.current.push(line);
      }

      canvas.renderAll();
    };

    canvas.on('mouse:down', handleMouseDown);
  
    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [mode, activeClass, onHistoryUpdate, fabricCanvasRef]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom / 100);
  }, [zoom, fabricCanvasRef]);

  useImageHandler({
      fabricCanvasRef,
      currentImage,
    });
  
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
