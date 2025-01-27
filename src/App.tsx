import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, message, Button, Drawer, Space, Tooltip, Select } from 'antd';
import {
  MenuOutlined,
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  BorderOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { AnnotationMode, SegmentationClass } from './types';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import ClassManager from './components/ClassManager';
import { exportToCOCO, downloadJSON } from './utils/cocoExport';
import 'antd/dist/reset.css';
import './styles/main.scss';

const { Header, Sider, Content } = Layout;
const { Option } = Select;

const TABLET_BREAKPOINT = 994;

const App: React.FC = () => {
  const [mode, setMode] = useState<AnnotationMode>('brush');
  const [brushSize, setBrushSize] = useState(10);
  const [classes, setClasses] = useState<SegmentationClass[]>([]);
  const [activeClass, setActiveClass] = useState<SegmentationClass | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const fabricCanvasRef = useRef<any>(null);

  useEffect(() => {
    const checkViewport = () => {
      setIsCompact(window.innerWidth <= TABLET_BREAKPOINT);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const handleAddClass = useCallback((className: string, color: string) => {
    const newClass: SegmentationClass = {
      id: classes.length + 1,
      name: className,
      color: color,
    };
    setClasses(prev => [...prev, newClass]);
    setActiveClass(newClass);
    if (isCompact) {
      setDrawerVisible(false);
    }
  }, [classes.length, isCompact]);

  const handleDeleteClass = useCallback((classId: number) => {
    setClasses(prev => prev.filter(cls => cls.id !== classId));
    setActiveClass(prev => prev?.id === classId ? null : prev);
  }, []);

  const handleSelectClass = useCallback((classId: number) => {
    setActiveClass(prev => classes.find(cls => cls.id === classId) || prev);
    if (isCompact) {
      setDrawerVisible(false);
    }
  }, [classes, isCompact]);

  const handleHistoryUpdate = useCallback((canvasState: string) => {
    setHistory(prev => {
      const newHistory = [...prev.slice(0, currentHistoryIndex + 1), canvasState];
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      return newHistory;
    });
  }, [currentHistoryIndex]);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => {
        const newIndex = prev - 1;
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
            fabricCanvasRef.current.renderAll();
          });
        }
        return newIndex;
      });
    }
  }, [currentHistoryIndex, history]);
  
  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(prev => {
        const newIndex = prev + 1;
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
            fabricCanvasRef.current.renderAll();
          });
        }
        return newIndex;
      });
    }
  }, [currentHistoryIndex, history]);
  
  const handleImageUpload = useCallback((file: File) => {
    if (!file) {
      message.error('Please select an image file');
      return;
    }
  
    if (!file.type.startsWith('image/')) {
      message.error('Please upload an image file');
      return;
    }
  
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result && typeof result === 'string') {
        setCurrentImage(result);
        setHistory([]);
        setCurrentHistoryIndex(-1);
      }
    };
    reader.onerror = () => {
      message.error('Error reading the image file');
    };
    reader.readAsDataURL(file);
  }, []);
  

  const handleExport = useCallback(() => {
    if (!currentImage) {
      message.error('Please upload an image first');
      return;
    }

    if (classes.length === 0) {
      message.error('Please create at least one class');
      return;
    }

    if (fabricCanvasRef.current) {
      const cocoData = exportToCOCO(fabricCanvasRef.current, classes, 'image.jpg');
      downloadJSON(cocoData, 'annotations.json');
    }
  }, [currentImage, classes]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 50));
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const backgroundImage = canvas.backgroundImage;
      canvas.clear();
      if (backgroundImage) {
        canvas.setBackgroundImage(backgroundImage, canvas.renderAll.bind(canvas));
      }
      handleHistoryUpdate(JSON.stringify(canvas));
    }
  }, [handleHistoryUpdate]);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const renderToolbar = () => (
    <Space className="toolbar">
      <Space>
        <Tooltip title="Upload Image">
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('image-upload')?.click()}
          />
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
          />
        </Tooltip>
        <Tooltip title="Export Annotations">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!currentImage}
          />
        </Tooltip>
      </Space>

      <Space>
        <Tooltip title="Undo">
          <Button
            icon={<UndoOutlined />}
            onClick={handleUndo}
            disabled={currentHistoryIndex <= 0}
          />
        </Tooltip>
        <Tooltip title="Redo">
          <Button
            icon={<RedoOutlined />}
            onClick={handleRedo}
            disabled={currentHistoryIndex >= history.length - 1}
          />
        </Tooltip>
      </Space>

      <Space>
        <Tooltip title="Brush Tool">
          <Button
            type={mode === 'brush' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => setMode('brush')}
          />
        </Tooltip>
        <Tooltip title="Polygon Tool">
          <Button
            type={mode === 'polygon' ? 'primary' : 'default'}
            icon={<BorderOutlined />}
            onClick={() => setMode('polygon')}
          />
        </Tooltip>
        <Tooltip title="Eraser">
          <Button
            type={mode === 'eraser' ? 'primary' : 'default'}
            icon={<DeleteOutlined />}
            onClick={() => setMode('eraser')}
          />
        </Tooltip>
        <Select
          value={brushSize}
          onChange={setBrushSize}
          style={{ width: 90 }}
          disabled={mode !== 'brush'}
        >
          <Option value={5}>Small</Option>
          <Option value={10}>Medium</Option>
          <Option value={50}>Large</Option>
        </Select>
      </Space>

      <Space>
        <Tooltip title="Zoom In">
          <Button
            icon={<ZoomInOutlined />}
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          />
        </Tooltip>
        <Tooltip title="Zoom Out">
          <Button
            icon={<ZoomOutOutlined />}
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          />
        </Tooltip>
        <Select
          value={zoom}
          onChange={setZoom}
          style={{ width: 100 }}
        >
          <Option value={50}>50%</Option>
          <Option value={100}>100%</Option>
          <Option value={150}>150%</Option>
          <Option value={200}>200%</Option>
        </Select>
      </Space>

      <Tooltip title="Clear Canvas">
        <Button
          icon={<DeleteOutlined />}
          onClick={handleClearCanvas}
          disabled={!currentImage}
        />
      </Tooltip>
    </Space>
  );

  const renderClassManager = () => (
    <div className="class-manager">
      <div className="class-manager-header">
        <h3>Segmentation Classes</h3>
        {isCompact && (
          <Button
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(false)}
          />
        )}
      </div>
      <div className="class-manager-content">
        <ClassManager
          classes={classes}
          activeClass={activeClass}
          onAddClass={handleAddClass}
          onDeleteClass={handleDeleteClass}
          onSelectClass={handleSelectClass}
        />
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Header className="header">
        <div className="header-content">
          <Button
            className="menu-trigger"
            icon={<MenuOutlined />}
            onClick={toggleSidebar}
          />
          {renderToolbar()}
        </div>
      </Header>

      <Layout className="main-content">
        <Content>
          <div className="canvas-container">
            <Canvas
              mode={mode}
              brushSize={brushSize}
              activeClass={activeClass}
              onHistoryUpdate={handleHistoryUpdate}
              currentImage={currentImage}
              fabricCanvasRef={fabricCanvasRef}
              zoom={zoom}
            />
          </div>
        </Content>
        <div className={`sidebar ${isSidebarVisible ? 'visible' : ''}`}>
          {renderClassManager()}
        </div>
      </Layout>
    </div>
  );
};

export default App;
