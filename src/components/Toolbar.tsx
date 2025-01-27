import React from 'react';
import { Button, Slider, Upload, message } from 'antd';
import {
  EditOutlined,
  BorderOutlined,
  UndoOutlined,
  ClearOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { AnnotationMode } from '../types';

interface ToolbarProps {
  mode: AnnotationMode;
  brushSize: number;
  onModeChange: (mode: AnnotationMode) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onImageUpload: (fileOrDataUrl: string) => void;
  onExport: () => void;
  canUndo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  brushSize,
  onModeChange,
  onBrushSizeChange,
  onUndo,
  onImageUpload,
  onExport,
  canUndo,
}) => {
  const handleUpload = (info: any) => {
    const file = info.file.originFileObj;
  
    if (file) {
      const reader = new FileReader();
  
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageUpload(e.target.result as string);
        }
      };
  
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="toolbar">
      <div className="tool-group">
        <Button
          type={mode === 'brush' ? 'primary' : 'default'}
          icon={<EditOutlined />}
          onClick={() => onModeChange('brush')}
        >
          Brush
        </Button>
        <Button
          type={mode === 'polygon' ? 'primary' : 'default'}
          icon={<BorderOutlined />}
          onClick={() => onModeChange('polygon')}
        >
          Polygon
        </Button>
        <Button
          type={mode === 'eraser' ? 'primary' : 'default'}
          icon={<ClearOutlined />}
          onClick={() => onModeChange('eraser')}
        >
          Eraser
        </Button>
        <Button
          icon={<UndoOutlined />}
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </Button>
      </div>

      {(mode === 'brush' || mode === 'eraser') && (
        <div className="tool-group">
          <span>Brush Size:</span>
          <Slider
            className="brush-size-slider"
            min={1}
            max={50}
            value={brushSize}
            onChange={onBrushSizeChange}
          />
        </div>
      )}

      <div className="tool-group">
        <Upload
          showUploadList={false}
          customRequest={({ file, onSuccess }: any) => {
            setTimeout(() => {
              onSuccess('ok');
            }, 0);
          }}
          onChange={handleUpload}
        >
          <Button icon={<UploadOutlined />}>Upload Image</Button>
        </Upload>
        <Button
          icon={<DownloadOutlined />}
          onClick={onExport}
        >
          Export COCO
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
