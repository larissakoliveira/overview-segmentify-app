import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { CanvasProps } from '../../types';


interface CustomPolygon extends fabric.Polygon {
  metadata?: { classId?: number };
}

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

          if (!activeClass) return; // Evita erro de null

          const polygon = new fabric.Polygon(polygonPoints.current, {
            fill: `${activeClass.color}40`,
            stroke: activeClass.color,
            strokeWidth: 2,
            selectable: false,
            evented: false,
          } as CustomPolygon);
          
          (polygon as CustomPolygon).metadata = { classId: activeClass.id };
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

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
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

    // Lógica para fechar o polígono se clicar próximo ao primeiro ponto
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
            polygonPoints.current[0].y,
          ],
          {
            stroke: activeClass.color,
            strokeWidth: 2,
            selectable: false,
            evented: false,
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
          objectCaching: false,
        });

        // const imageGroup = canvas.getObjects().find((obj) => obj.type === 'group') as fabric.Group;

        // if (imageGroup) {
        //   imageGroup.addWithUpdate(polygon);
        // } else {
        //   canvas.add(polygon);
        // }

        // Encontra o grupo da imagem mais próximo do clique
const relatedGroup = canvas.getObjects().find(
  (obj) => obj.type === 'group' && obj.containsPoint(polygon.getCenterPoint())
) as fabric.Group;

if (relatedGroup) {
  relatedGroup.addWithUpdate(polygon); // Adiciona ao grupo correspondente
} else {
  canvas.add(polygon); // Adiciona diretamente ao canvas se não houver grupo
}

        lines.current.forEach((line) => canvas.remove(line));
        polygonPoints.current.forEach((point) => {
          const dot = canvas.getObjects().find(
            (obj) => obj.left === point.x - 4 && obj.top === point.y - 4
          );
          if (dot) canvas.remove(dot);
        });

        onHistoryUpdate(JSON.stringify(canvas));

        // Resetar estado
        polygonPoints.current = [];
        firstPoint.current = null;
        lines.current = [];
        canvas.renderAll();
        return;
      }
    }

    // Adiciona ponto atual ao array de pontos do polígono
    polygonPoints.current.push(point);

    const dot = new fabric.Circle({
      left: point.x - 4,
      top: point.y - 4,
      radius: 4,
      fill: activeClass.color,
      selectable: false,
      evented: false,
    });

    // Adiciona o ponto ao grupo ativo, se existir
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'group') {
      const group = activeObject as fabric.Group;
      group.addWithUpdate(dot);
    } else {
      canvas.add(dot);
    }

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
          evented: false,
        }
      );

      // Adiciona a linha ao grupo ativo, se existir
      if (activeObject && activeObject.type === 'group') {
        const group = activeObject as fabric.Group;
        group.addWithUpdate(line);
      } else {
        canvas.add(line);
      }

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

  const updateObjectSelection = () => {
    const isSelectMode = mode === 'select';
  
    // canvas.getObjects().forEach((obj) => {
    //   if (obj.type === 'group' || obj.type === 'image') {
    //     obj.selectable = isSelectMode;
    //     obj.evented = isSelectMode;
    //   }
    // });


    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'group') {
        obj.selectable = isSelectMode;
        obj.evented = isSelectMode;
    
        // Atualiza todos os elementos dentro do grupo
        const group = obj as fabric.Group;
        group._objects.forEach((child) => {
          child.selectable = false; // Apenas o grupo pode ser selecionado
        });
      }
    });
    
  
    canvas.renderAll();
  };
  

      updateObjectSelection();
    }, [mode, fabricCanvasRef]);


    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
    
      let isPanning = false;
      let lastPosX: number, lastPosY: number;
    
      const handleMouseDown = (e: fabric.IEvent) => {
        if (mode === 'pan') {
          isPanning = true;
          const pointer = canvas.getPointer(e.e);
          lastPosX = pointer.x;
          lastPosY = pointer.y;
        }
      };
    
      const handleMouseMove = (e: fabric.IEvent) => {
        if (isPanning && mode === 'pan') {
          const pointer = canvas.getPointer(e.e);
          const deltaX = pointer.x - lastPosX;
          const deltaY = pointer.y - lastPosY;
    
          canvas.relativePan(new fabric.Point(deltaX, deltaY));
          lastPosX = pointer.x;
          lastPosY = pointer.y;
        }
      };
    
      const handleMouseUp = () => {
        if (isPanning) isPanning = false;
      };
    
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    
      return () => {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
    }, [mode, fabricCanvasRef]);
    
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom / 100);
  }, [zoom, fabricCanvasRef]);

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

        // const existingGroup = canvas.getObjects().find((obj) => obj.type === 'group') as fabric.Group;
  
        // // Cria um grupo com a imagem inicial
        // if (!existingGroup) {
        //   const group = new fabric.Group([img], {
        //     left: randomLeft,
        //     top: randomTop,
        //     selectable: true,
        //     evented: true,
        //   });
        //   canvas.add(group);
        // } else {
        //   existingGroup.addWithUpdate(img);
        // }


        // Sempre cria um novo grupo para cada imagem
      const newGroup = new fabric.Group([img], {
        left: randomLeft,
        top: randomTop,
        selectable: true,
        evented: true,
      });

      // Adiciona o novo grupo ao canvas
      canvas.add(newGroup);
      canvas.renderAll();
        
        // canvas.renderAll();
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
  }, [mode, brushSize, activeClass?.color, zoom, fabricCanvasRef]);
  

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    const handlePathCreated = (e: fabric.IEvent & { path?: fabric.Path }) => {
      const path = e.path;
      if (!path) return;
    
      path.selectable = false;
      path.evented = false;
    
      // const imageGroup = canvas.getObjects().find((obj) => obj.type === 'group') as fabric.Group;
    
      // if (imageGroup) {
      //   imageGroup.addWithUpdate(path);
      // } else {
      //   canvas.add(path);
      // }

      // Encontra o grupo mais próximo do ponto em que o desenho foi criado
const relatedGroup = canvas.getObjects().find(
  (obj) => obj.type === 'group' && obj.containsPoint(path.getCenterPoint())
) as fabric.Group;

if (relatedGroup) {
  relatedGroup.addWithUpdate(path); // Adiciona ao grupo específico
} else {
  canvas.add(path); // Adiciona diretamente ao canvas se não houver grupo
}
    
      canvas.renderAll();
      onHistoryUpdate(JSON.stringify(canvas));
    };
    
  
    canvas.on('path:created', handlePathCreated);
  
    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [onHistoryUpdate, fabricCanvasRef]);
  

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
  
    const handleMouseDown = (e: fabric.IEvent) => {
      if (mode !== 'eraser') return;
  
      const pointer = canvas.getPointer(e.e);
  
      // Encontrar o objeto mais alto sob o clique
      const clickedObjects = canvas.getObjects().filter((obj) =>
        obj.containsPoint(new fabric.Point(pointer.x, pointer.y))
      );
  
      if (clickedObjects.length === 0) return;
  
      let objectToRemove = clickedObjects[clickedObjects.length - 1]; // Último da pilha (mais acima)
  
      if (objectToRemove instanceof fabric.Group) {
        // Verifica se o grupo contém desenhos
        const objectsInGroup = objectToRemove.getObjects();
  
        let objectFound = false;
        objectsInGroup.forEach((obj) => {
          if (
            (obj instanceof fabric.Path && mode === 'eraser') ||
            obj instanceof fabric.Polygon ||
            obj instanceof fabric.Line
          ) {
            objectToRemove.remove(obj); // Remove apenas o objeto específico dentro do grupo
            objectFound = true;
          }
        });
  
        if (objectFound) {
          canvas.renderAll();
          return;
        }
      }
  
      // Se for um desenho de brush, apaga apenas ele
      if (objectToRemove instanceof fabric.Path) {
        canvas.remove(objectToRemove);
      } 
      // Se for um polígono, remove apenas o polígono e suas linhas conectadas
      else if (objectToRemove instanceof fabric.Polygon) {
        const relatedLines = canvas.getObjects().filter(
          (obj) =>
            obj instanceof fabric.Line &&
            polygonPoints.current.some(
              (point) =>
                (obj as fabric.Line).x1 === point.x &&
                (obj as fabric.Line).y1 === point.y
            )
        );
        relatedLines.forEach((line) => canvas.remove(line));
        canvas.remove(objectToRemove);
      } 
      // Se for uma linha, apaga apenas a linha
      else if (objectToRemove instanceof fabric.Line) {
        canvas.remove(objectToRemove);
      } 
      // Se for uma imagem, remove apenas a imagem
      else if (objectToRemove instanceof fabric.Image) {
        canvas.remove(objectToRemove);
      }
  
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