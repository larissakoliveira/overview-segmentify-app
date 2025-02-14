import { Button, Space, Tooltip, Select, Slider, Drawer } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  BorderOutlined,
  EditOutlined,
  ClearOutlined,
  UploadOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { AnnotationMode, SegmentationClass } from '../../types';
import { Hand } from '@phosphor-icons/react';

const { Option } = Select;

interface ToolbarProps {
  mode: AnnotationMode;
  brushSize: number;
  zoom: number;
  isCompact: boolean;
  currentHistoryIndex: number;
  historyLength: number;
  activeClass: SegmentationClass | null;
  mobileMenuVisible: boolean;
  hasImages: boolean;
  onModeChange: (mode: AnnotationMode) => void;
  onBrushSizeChange: (size: number) => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onImageUpload: (file: File) => void;
  onExport: () => void;
  toggleMobileMenu: () => void;
}

const Toolbar = ({
  mode,
  brushSize,
  zoom,
  isCompact,
  currentHistoryIndex,
  historyLength,
  mobileMenuVisible,
  hasImages,
  onModeChange,
  onBrushSizeChange,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onImageUpload,
  onExport,
  toggleMobileMenu,
}: ToolbarProps) => {
  const toolbarContent = (
    <Space direction={isCompact ? 'vertical' : 'horizontal'} size="middle" style={{ width: '100%' }}>
      <Space>
        <Tooltip title="Image Upload">
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            {isCompact ? 'Upload Image' : ''}
          </Button>
        </Tooltip>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && onImageUpload(e.target.files[0])}
        />
        <Tooltip title="Export to COCO format">
          <Button
            icon={<DownloadOutlined />}
            onClick={onExport}
            disabled={!hasImages}
          >
            {isCompact ? 'Export Annotations' : ''}
          </Button>
        </Tooltip>
      </Space>
      <Space>
      <Tooltip title="Select Tool">
          <Button
            type={mode === 'select' ? 'primary' : 'default'}
            icon={<DragOutlined />}
            onClick={() => onModeChange('select')}
          >
              {isCompact ? 'Select Tool' : ''}
          </Button>
        </Tooltip>
        <Tooltip title="Pan Tool">
          <Button
            type={mode === 'pan' ? 'primary' : 'default'}
            icon={<Hand size={16} weight="regular" />}
            onClick={() => onModeChange('pan')}
            >
            {isCompact ? 'Pan Tool' : ''}
        </Button>
        </Tooltip>
        <Tooltip title="Polygon Tool">
          <Button
            type={mode === 'polygon' ? 'primary' : 'default'}
            icon={<BorderOutlined />}
            onClick={() => onModeChange('polygon')}
          >
            {isCompact ? 'Polygon Tool' : ''}
          </Button>
        </Tooltip>
        <Tooltip title="Brush Tool">
          <Button
            type={mode === 'brush' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => onModeChange('brush')}
          >
            {isCompact ? 'Brush Tool' : ''}
          </Button>
        </Tooltip>
        <Slider
          className="brush-size-slider"
          min={1}
          max={100}
          value={brushSize}
          onChange={onBrushSizeChange}
        />
      </Space>
      <Space>
        <Tooltip title="Eraser Tool">
          <Button
            type={mode === 'eraser' ? 'primary' : 'default'}
            icon={<ClearOutlined />}
            onClick={() => onModeChange('eraser')}
          >
            {isCompact ? 'Eraser' : ''}
          </Button>
        </Tooltip>
        <Tooltip title="Undo">
          <Button
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={currentHistoryIndex <= 0}
          >
            {isCompact ? 'Undo' : ''}
          </Button>
        </Tooltip>
        <Tooltip title="Redo">
          <Button
            icon={<RedoOutlined />}
            onClick={onRedo}
            disabled={currentHistoryIndex >= historyLength - 1}
          >
            {isCompact ? 'Redo' : ''}
          </Button>
        </Tooltip>
      </Space>
      <Space className='zoom-controls'>
        <Tooltip className='zoom-out' title="Zoom Out">
          <Button
            icon={<ZoomOutOutlined />}
            onClick={onZoomOut}
            disabled={zoom <= 50}
          >
          </Button>
        </Tooltip>
        <Select
          value={zoom}
          onChange={onZoomChange}
          style={{ width: isCompact ? '100%' : 80 }}
        >
          <Option value={50}>50%</Option>
          <Option value={100}>100%</Option>
          <Option value={150}>150%</Option>
          <Option value={200}>200%</Option>
        </Select>
        <Tooltip title="Zoom In">
          <Button
            icon={<ZoomInOutlined />}
            onClick={onZoomIn}
            disabled={zoom >= 200}
          >
          </Button>
        </Tooltip>
      </Space>
    </Space>
  );

  if (isCompact) {
    return (
      <>
        <Space>
          <Button
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={currentHistoryIndex < 0}
          />
          <Button
            icon={<RedoOutlined />}
            onClick={onRedo}
            disabled={currentHistoryIndex >= historyLength - 1}
          />
          <Select
            value={zoom}
            onChange={onZoomChange}
            style={{ width: 80 }}
          >
            <Option value={50}>50%</Option>
            <Option value={100}>100%</Option>
            <Option value={150}>150%</Option>
            <Option value={200}>200%</Option>
          </Select>
        </Space>
        <Drawer
          title="Tools"
          placement="right"
          onClose={toggleMobileMenu}
          open={mobileMenuVisible}
          width={300}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px' }}>
            {toolbarContent}
          </Space>
        </Drawer>
      </>
    );
  }

  return toolbarContent;
};

export default Toolbar;