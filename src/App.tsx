import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout, message, Button, Drawer, Space, Tooltip, Select, Slider } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  BorderOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { AnnotationMode, COCOFormat, SegmentationClass } from './types';
import Canvas from './components/Canvas';
import ClassManager from './components/ClassManager';
import { exportToCOCO, downloadJSON } from './utils/cocoExport';
import 'antd/dist/reset.css';
import './styles/main.scss';

const { Header, Content } = Layout;
const { Option } = Select;

const TABLET_BREAKPOINT = 768;

const App = () => {
  const [mode, setMode] = useState<AnnotationMode>('select');
  const [brushSize, setBrushSize] = useState(10);
  const [classes, setClasses] = useState<SegmentationClass[]>([]);
  const [activeClass, setActiveClass] = useState<SegmentationClass | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [images, setImages] = useState<{ src: string; name: string; width?: number; height?: number }[]>([]);
  const [isCompact, setIsCompact] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [visible, setVisible] = useState(false);
  const fabricCanvasRef = useRef<any>(null);


  const memoizedMetaData = useMemo(() => ({
    description: "Semantic Segmentation Dataset",
    url: "http://example.com",
    version: "1.0",
    year: new Date().getFullYear(),
    contributor: "Your Name/Organization",
    date_created: new Date().toISOString(),
    licenses: [
      {
        id: 1,
        name: "Creative Commons Attribution 4.0 License",
        url: "https://creativecommons.org/licenses/by/4.0/",
      },
    ],
    coco_url: "http://example.com/images/{fileName}",
    flickr_url: "http://example.com/images/{fileName}",
  }), []);  
  
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
    if (currentHistoryIndex >= 0) {
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
        const fileName = file.name;
        
        const img = new Image();
        img.onload = () => {
          setImages((prevImages) => [
            ...prevImages,
            { 
              src: result, 
              name: fileName,
              width: img.width,
              height: img.height
            },
          ]);
        };
        img.src = result;
        
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
    if (images.length === 0) {
      message.error('Please upload at least one image');
      return;
    }
  
    if (!classes.length) {
      message.error('Please create at least one class');
      return;
    }
  
    if (fabricCanvasRef.current) {
      const cocoData: COCOFormat = {
        info: memoizedMetaData,
        licenses: memoizedMetaData.licenses,
        images: [],
        annotations: [],
        categories: classes.map((cls) => ({
          id: cls.id,
          name: cls.name,
          supercategory: 'object',
        })),
      };
  
      images.forEach((image, index) => {
        const imageId = index + 1;
  
        cocoData.images.push({
          id: imageId,
          file_name: image.name,
          height: image.height || 0,
          width: image.width || 0,
          license: memoizedMetaData.licenses[0].id,
          coco_url: memoizedMetaData.coco_url.replace('{fileName}', image.name),
          date_captured: memoizedMetaData.date_created,
          flickr_url: memoizedMetaData.flickr_url.replace('{fileName}', image.name),
        });
  
        const annotations = exportToCOCO(
          fabricCanvasRef.current,
          classes,
          image.name,
          memoizedMetaData
        ).annotations;
  
        cocoData.annotations.push(
          ...annotations.map((annotation) => ({
            ...annotation,
            image_id: imageId,
          }))
        );
      });
  
      downloadJSON(cocoData, 'annotations.json');
    }
  }, [images, classes, fabricCanvasRef, memoizedMetaData]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 50));
  }, []);

  const handleModeChange = useCallback((newMode: AnnotationMode) => {
    if ((newMode === 'brush' || newMode === 'polygon') && !activeClass) {
      message.warning('Please select a class before using the brush or polygon tools');
      return;
    }
    setMode(newMode);
  }, [activeClass]);

  const toggleSidebar = () => {
    setVisible(!visible);
  };

  const renderToolbar = () => (
    <Space className="toolbar">
      <Space>
        <Tooltip title="Polygon Tool">
          <Button
            type={mode === 'polygon' ? 'primary' : 'default'}
            icon={<BorderOutlined />}
            onClick={() => handleModeChange('polygon')}
          />
        </Tooltip>
        <Tooltip title="Brush Tool">
          <Button
            type={mode === 'brush' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleModeChange('brush')}
          />
        </Tooltip>
        <Slider
            className="brush-size-slider"
            min={1}
            max={100}
            value={brushSize}
            onChange={setBrushSize}
          />
      </Space>
      <Space>
        <Tooltip title="Eraser">
          <Button
            type={mode === 'eraser' ? 'primary' : 'default'}
            icon={<ClearOutlined />}
            onClick={() => handleModeChange('eraser')}
          />
        </Tooltip>
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
          style={{ width: 80 }}
        >
          <Option value={50}>50%</Option>
          <Option value={100}>100%</Option>
          <Option value={150}>150%</Option>
          <Option value={200}>200%</Option>
        </Select>
        <Tooltip title="Zoom In">
          <Button
            icon={<ZoomInOutlined />}
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          />
        </Tooltip>
      </Space>
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
            disabled={!images}
          />
        </Tooltip>
      </Space>
    </Space>
  );

  const renderClassManager = () => (
    <div className="class-manager">
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

  const getContrastTextColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  return (
    <div className="app-container">
      <Header className="header">
        <div className="header-content">
        <Button type="text" onClick={toggleSidebar}>Select Class</Button>
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
              currentImage={images.length > 0 ? images[images.length - 1] : null}
              fabricCanvasRef={fabricCanvasRef}
              zoom={zoom}
            />
          </div>
          <div className="status-label">
            <span>Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)} | </span>
            {activeClass && (
              <span>
                Class: <span style={{
                  border: '1px solid #000000',
                  backgroundColor: activeClass.color,
                  color: getContrastTextColor(activeClass.color),
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>{activeClass.name}</span>
              </span>
            )}
          </div>
        </Content>
        <Drawer
        title="Segmentation Classes"
        placement="right"
        mask={false} 
        closable
        onClose={toggleSidebar}
        open={visible}
      >
          {renderClassManager()}
          </Drawer>
      </Layout>
    </div>
  );
};

export default App;
