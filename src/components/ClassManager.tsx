import { useCallback, useMemo, useState } from 'react';
import { Button, Input, List, Popover, message } from 'antd';
import { ChromePicker, ColorResult } from 'react-color';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { ClassManagerProps } from '../types';

const DEFAULT_COLOR = '#FF0000';

const ClassManager = ({
  classes,
  activeClass,
  onAddClass,
  onDeleteClass,
  onSelectClass,
}: ClassManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);

  const resetForm = useCallback(() => {
    setIsAdding(false);
    setNewClassName('');
    setSelectedColor(DEFAULT_COLOR);
  }, []);

  const handleAddClass = useCallback(() => {
    const trimmedName = newClassName.trim();
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

    onAddClass(trimmedName, selectedColor);
    resetForm();
  }, [newClassName, selectedColor, classes, resetForm]);

  const handleDeleteClass = useCallback( (classId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClass(classId);
  },
  [onDeleteClass]
  );

  const colorPicker = useMemo(() => (
    <ChromePicker
      color={selectedColor}
      onChange={(color: ColorResult) => setSelectedColor(color.hex)}
      disableAlpha={true}
    />
  ), [selectedColor]);

  return (
    <div className="class-manager">
      {!isAdding ? (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAdding(true)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          Add New Class
        </Button>
      ) : (
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
            <Button onClick={resetForm}>
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
            <div className="class-item-content">
              <div
                className="class-color"
                style={{ 
                  backgroundColor: item.color,
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
