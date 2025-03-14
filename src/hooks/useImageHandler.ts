import { useEffect } from 'react';
import { fabric } from 'fabric';
import { ImageHandlerProps } from '../types';

export const useImageHandler = ({
  fabricCanvasRef,
  currentImage,
}: ImageHandlerProps) => {
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
          objectCaching: true,
        });
  
        canvas.add(img);
        canvas.isDrawingMode = false;
        canvas.renderAll();
      },
      { crossOrigin: 'anonymous' }
    );
  }, [currentImage, fabricCanvasRef]);
};
