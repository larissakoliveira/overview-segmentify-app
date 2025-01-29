import React, { useState } from 'react';
import { Button, Input, List, Popover, message } from 'antd';
import { ChromePicker, ColorResult } from 'react-color';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { SegmentationClass } from '../types';

interface ClassManagerProps {
  classes: SegmentationClass[];
  activeClass: SegmentationClass | null;
  onAddClass: (className: string, color: string) => void;
  onDeleteClass: (classId: number) => void;
  onSelectClass: (classId: number) => void;
}

const ClassManager: React.FC<ClassManagerProps> = ({
  classes,
  activeClass,
  onAddClass,
  onDeleteClass,
  onSelectClass,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF0000');

  const handleAddClass = () => {
    if (!newClassName.trim()) {
      message.error('Please enter a class name');
      return;
    }

    if (classes.some(c => c.name.toLowerCase() === newClassName.trim().toLowerCase())) {
      message.error('A class with this name already exists');
      return;
    }

    if (classes.some(c => c.color.toLowerCase() === selectedColor.toLowerCase())) {
      message.error('This color is already assigned to another class');
      return;
    }

    onAddClass(newClassName.trim(), selectedColor);
    setNewClassName('');
    setSelectedColor('#FF0000');
    setIsAdding(false);
  };

  const handleDeleteClass = (classId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClass(classId);
  };

  const colorPicker = (
    <ChromePicker
      color={selectedColor}
      onChange={(color: ColorResult) => setSelectedColor(color.hex)}
      disableAlpha={true}
    />
  );

  return (
    <div className="class-manager">
      {!isAdding && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAdding(true)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          Add New Class
        </Button>
      )}

      {isAdding && (
        <div className="add-class-form">
          <Input
            placeholder="Enter class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onPressEnter={handleAddClass}
            autoFocus
          />
          <div className='add-class-form-actions'>
            <Popover
              content={colorPicker}
              trigger="click"
              placement="right"
              title="Select Class Color"
            >
              <Button
                style={{
                  backgroundColor: selectedColor,
                  width: '32px',
                  height: '32px',
                  margin: '0 8px',
                  border: '2px solid #d9d9d9',
                }}
              />
            </Popover>
            <Button type="primary" onClick={handleAddClass}>
              Add
            </Button>
            <Button onClick={() => {
              setIsAdding(false);
              setNewClassName('');
              setSelectedColor('#FF0000');
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <List
        className="class-list"
        dataSource={classes}
        renderItem={(item) => (
          <List.Item
            className={`class-item ${activeClass?.id === item.id ? 'active' : ''}`}
            onClick={() => onSelectClass(item.id)}
          >
            <div className="class-item-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                className="class-color"
                style={{
                  backgroundColor: item.color,
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9',
                }}
              />
              <span className="class-name">{item.name}</span>
            </div>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={(e) => handleDeleteClass(item.id, e)}
              className="delete-button"
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default ClassManager;
