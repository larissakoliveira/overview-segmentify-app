import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, message, Button, Drawer, Space, Tooltip, Select, Slider } from 'antd';
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
  ClearOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { AnnotationMode, COCOFormat, SegmentationClass } from './types';
import Canvas from './components/Canvas';
// import Toolbar from './components/Toolbar';
import ClassManager from './components/ClassManager';
import { exportToCOCO, downloadJSON } from './utils/cocoExport';
import 'antd/dist/reset.css';
import './styles/main.scss';

const { Header, Content } = Layout;
const { Option } = Select;

const TABLET_BREAKPOINT = 768;

const App: React.FC = () => {
  const [mode, setMode] = useState<AnnotationMode>('select');
  const [brushSize, setBrushSize] = useState(10);
  const [classes, setClasses] = useState<SegmentationClass[]>([]);
  const [activeClass, setActiveClass] = useState<SegmentationClass | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [images, setImages] = useState<{ src: string; name: string }[]>([]);
  const [isCompact, setIsCompact] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [visible, setVisible] = useState(true);
  const fabricCanvasRef = useRef<any>(null);

  const metaData = {
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
  };
  
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
  
        setImages((prevImages) => [
          ...prevImages,
          { src: result, name: fileName },
        ]);
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
        info: metaData,
        licenses: metaData.licenses,
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
          height: fabricCanvasRef.current.imageHeight || 0,
          width: fabricCanvasRef.current.imageWidth || 0,
          license: metaData.licenses[0].id,
          coco_url: metaData.coco_url.replace('{fileName}', image.name),
          date_captured: metaData.date_created,
          flickr_url: metaData.flickr_url.replace('{fileName}', image.name),
        });
  
        const annotations = exportToCOCO(
          fabricCanvasRef.current,
          classes,
          image.name,
          metaData
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
  }, [images, classes, fabricCanvasRef, metaData]);

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
    setVisible(!visible);
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
            disabled={!images}
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
            icon={<ClearOutlined />}
            onClick={() => setMode('eraser')}
          />
        </Tooltip>
        <Slider
            className="brush-size-slider"
            min={1}
            max={50}
            value={brushSize}
            onChange={setBrushSize}
          />
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
          disabled={!images}
        />
      </Tooltip>
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

  return (
    <div className="app-container">
      <Header className="header">
        <div className="header-content">
        <Button className="btn-segmentation-class" type="text" icon={visible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} onClick={toggleSidebar} style={{ color: "#fff" }}>ADD Segmentation Class</Button>
        {/* </Header>
          {/* <Button
            className="menu-trigger"
            icon={<MenuOutlined />}
            onClick={toggleSidebar}
          /> */} 
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
