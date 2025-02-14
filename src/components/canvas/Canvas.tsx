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
  const isPanning = useRef(false);
  const polygonPoints = useRef<fabric.Point[]>([]);
  const firstPoint = useRef<fabric.Circle | null>(null);
  const lines = useRef<fabric.Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // handle interactions with a canvas element when drawing polygons using the Fabric.js
  const handlePolygonInteraction = (e: fabric.IEvent, isMouseDown: boolean = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (mode !== 'polygon') return;
    if (isMouseDown && (isDrawing.current || !activeClass)) return;
    if (!isMouseDown && isPanning.current) return;

    const pointer = canvas.getPointer(e.e);
    const point = new fabric.Point(pointer.x, pointer.y);
    const color = activeClass?.color || '#000000';

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
            stroke: color,
            strokeWidth: 2,
            selectable: false,
            evented: false
          }
        );
        canvas.add(lastLine);
        lines.current.push(lastLine);

        const polygon = new fabric.Polygon(polygonPoints.current, {
          fill: `${color}40`,
          stroke: color,
          strokeWidth: 2,
          selectable: false,
          evented: false,
          objectCaching: isMouseDown
        });
        canvas.add(polygon);

        if (isMouseDown) {
          onHistoryUpdate(JSON.stringify(canvas));
        }

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
      fill: color,
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
          stroke: color,
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

   // initialize fabric.Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || fabricCanvasRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // initialize fabric.Canvas
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

    // set up free drawing brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = brushSize;
    canvas.freeDrawingBrush.color = activeClass?.color || '#000000';

    // to update canvas size on window resize
    const updateCanvasSize = () => {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.setWidth(width);
      canvas.setHeight(height);
      
      const objects = canvas.getObjects();
      // ensures that existing images are resized and positioned correctly when the canvas size changes
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

    let lastPosX: number;
    let lastPosY: number;

    // to move elements pressing space bar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning.current) {
        isPanning.current = true;
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      }
    };

    // to stop panning when the space bar is released
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isPanning.current = false;
        canvas.defaultCursor = 'default';
        canvas.selection = false;
      }
    };

    // to grab the elements of the canvas using the mouse
    const handleMouseDown = (e: fabric.IEvent) => {
      if (isPanning.current) {
        canvas.defaultCursor = 'grabbing';
        const pointer = canvas.getPointer(e.e);
        lastPosX = pointer.x;
        lastPosY = pointer.y;
      }
    };

    // to move the elements of the canvas when the mouse is pressed and the space bar is pressed
    const handleMouseMove = (e: fabric.IEvent) => {
      if (isPanning.current && (e.e as MouseEvent).buttons === 1) {
        const pointer = canvas.getPointer(e.e);
        const deltaX = pointer.x - lastPosX;
        const deltaY = pointer.y - lastPosY;

        canvas.relativePan(new fabric.Point(deltaX, deltaY));

        lastPosX = pointer.x;
        lastPosY = pointer.y;
      }
    };

    // handle click events on the canvas and delegate the interaction logic
    const handleCanvasClick = (e: fabric.IEvent) => {
      handlePolygonInteraction(e, false);
    };

    //  passive: true is optional but for performance is good, the browser that the event listener will not call preventDefault()
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

  // handle the creation of polygons on the canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    const handleMouseDown = (e: fabric.IEvent) => {
      handlePolygonInteraction(e, true);
    };

    canvas.on('mouse:down', handleMouseDown);
  
    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [mode, activeClass, onHistoryUpdate, fabricCanvasRef]);

  // handle the zoom of the canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom / 100);
  }, [zoom, fabricCanvasRef]);

  // use the image handler hook to render the image on the canvas
  useImageHandler({
      fabricCanvasRef,
      currentImage,
    });
  
    // handle the brush size, mode, and active class changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    canvas.isDrawingMode = mode === 'brush';
    canvas.selection = mode !== 'brush';
  
    const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
    if (brush) {
      brush.width = brushSize * (5 / zoom);
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

  // handle the onHistoryUpdate when a path is created or the mouseup, updates the history state when the eraser mode is active.
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

  // handle the eraser mode, removes objects from the canvas when the eraser mode is active, onHistoryUpdate when mousedown
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
