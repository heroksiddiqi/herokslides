import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable, rectIntersection } from '@dnd-kit/core';
import { Trash2, GripVertical, Download, Plus } from 'lucide-react';

// Draggable item for the Library (Right side)
function LibraryItem({ slide, onAdd, usedCount }) {
  const isDynamic = slide.type === 'dynamic-job';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${slide.id}`,
    data: slide
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    zIndex: isDragging ? 1000 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="thumbnail-card"
      style={{
        ...style,
        opacity: (usedCount > 0 && !isDragging) ? 0.3 : (isDragging ? 0.5 : 1),
        filter: (usedCount > 0 && !isDragging) ? 'grayscale(80%)' : 'none'
      }}
    >
      {isDynamic ? (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '2rem' }}>📋</div>
          <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{slide.name}</div>
        </div>
      ) : (
        <img src={slide.path} alt={slide.name} />
      )}
      {usedCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: '#3b82f6',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '10px'
        }}>
          {usedCount}x
        </div>
      )}
      <div className="thumbnail-info">
        <span style={{ fontSize: '0.7rem' }}>{slide.name}</span>
        <button
          onMouseDown={(e) => { e.stopPropagation(); onAdd(slide); }}
          style={{ float: 'right', background: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// Sortable item for the Slides List (Left side)
function SortableSlide({ id, slide, onRemove, zoomLevel }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbStyle = {
    width: `${60 * zoomLevel}px`,
    height: `${35 * zoomLevel}px`,
  };

  return (
    <div ref={setNodeRef} style={style} className="slide-item">
      <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
        <GripVertical size={16} color="#94a3b8" />
      </div>
      {slide.type === 'dynamic-job' ? (
        <div style={{ ...thumbStyle, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
          📋
        </div>
      ) : (
        <img src={slide.path} style={thumbStyle} className="slide-item-thumb" alt="" />
      )}
      <div className="slide-item-info" style={{ fontSize: `${0.8 * zoomLevel}rem` }}>{slide.name}</div>
      <button
        onClick={() => onRemove(id)}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function Organizer({ allSlides, currentSlides, onUpdateOrder }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeId, setActiveId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 to 3
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categories = useMemo(() => {
    const cats = ['All', 'Dynamic', ...new Set(allSlides.map(s => s.category))];
    return cats;
  }, [allSlides]);

  const dynamicSlides = [
    { id: 'dynamic-job-prebd', name: 'বাছাইকৃত সার্কুলার', type: 'dynamic-job', category: 'Dynamic', subType: 'prebd' },
    { id: 'dynamic-job-faridpur', name: 'ফরিদপুরের সরকারী চাকরী', type: 'dynamic-job', category: 'Dynamic', subType: 'faridpur' },
    { id: 'dynamic-job-govt', name: 'সরকারী চাকরী', type: 'dynamic-job', category: 'Dynamic', subType: 'govt' },
    { id: 'dynamic-job-exams', name: 'পরীক্ষার সময়সূচী', type: 'dynamic-job', category: 'Dynamic', subType: 'exams' },
    { id: 'dynamic-job-deadline', name: 'আগামীকালের ডেডলাইন', type: 'dynamic-job', category: 'Dynamic', subType: 'deadline' },
    { id: 'dynamic-job-deadline3', name: 'আগামী ৩ দিনের ডেডলাইন', type: 'dynamic-job', category: 'Dynamic', subType: 'deadline3' }
  ];

  const libraryWithDynamic = useMemo(() => {
    return [...dynamicSlides, ...allSlides];
  }, [allSlides]);

  const filteredLibrary = useMemo(() => {
    if (selectedCategory === 'All') return libraryWithDynamic;
    if (selectedCategory === 'Dynamic') return dynamicSlides;
    return allSlides.filter(s => s.category === selectedCategory);
  }, [allSlides, libraryWithDynamic, selectedCategory]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // If dragging from library to list
    if (activeIdStr.startsWith('library-') && overIdStr.startsWith('sortable-')) {
      // We don't actually change the list in real-time here to avoid flickering,
      // but this event ensures dnd-kit knows we are hovering over the list.
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    const activeIndex = currentSlides.findIndex(s => s.tempId === active.id);
    const overIndex = currentSlides.findIndex(s => s.tempId === over.id);

    // Case 1: Reordering an existing slide
    if (activeIndex !== -1) {
      if (overIdStr === 'playlist-droppable') {
        // Move to end
        const newSlides = arrayMove(currentSlides, activeIndex, currentSlides.length - 1);
        onUpdateOrder(newSlides);
      } else if (activeIndex !== overIndex && overIndex !== -1) {
        const newSlides = arrayMove(currentSlides, activeIndex, overIndex);
        onUpdateOrder(newSlides);
      }
    }
    // Case 2: Adding a new slide from library
    else if (activeIdStr.startsWith('library-')) {
      const slide = active.data.current;
      const newSlide = { ...slide, tempId: `sortable-${slide.id}-${Date.now()}` };
      const newSlides = [...currentSlides];

      if (overIdStr === 'playlist-droppable' || overIndex === -1) {
        newSlides.push(newSlide);
      } else {
        newSlides.splice(overIndex, 0, newSlide);
      }

      onUpdateOrder(newSlides);
    }

    setActiveId(null);
  };

  const addSlide = (slide) => {
    const newSlide = { ...slide, tempId: `sortable-${slide.id}-${Date.now()}` };
    onUpdateOrder([...currentSlides, newSlide]);
  };

  const removeSlide = (tempId) => {
    onUpdateOrder(currentSlides.filter(s => s.tempId !== tempId));
  };

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSlides.map(({ tempId, ...rest }) => rest), null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "slides.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const startResizing = useCallback((mouseDownEvent) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing) {
      setSidebarWidth(mouseMoveEvent.clientX);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const activeSlide = useMemo(() => {
    if (!activeId) return null;
    const activeIdStr = activeId.toString();
    if (activeIdStr.startsWith('library-')) {
      return libraryWithDynamic.find(s => `library-${s.id}` === activeIdStr);
    }
    return currentSlides.find(s => s.tempId === activeId);
  }, [activeId, libraryWithDynamic, currentSlides]);

  const { setNodeRef: setListDroppableRef } = useDroppable({
    id: 'playlist-droppable',
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="organizer-container" style={{ gridTemplateColumns: `${sidebarWidth}px 4px 1fr` }}>
        <div className="organizer-sidebar">
          <div className="organizer-header">
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Order</h2>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: '#334155', borderRadius: '8px', padding: '2px' }}>
              <button className="control-btn" style={{ padding: '4px' }} onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}>-</button>
              <span style={{ fontSize: '10px', minWidth: '30px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
              <button className="control-btn" style={{ padding: '4px' }} onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}>+</button>
            </div>
            <button onClick={downloadJson} className="control-btn" title="Download JSON">
              <Download size={18} />
            </button>
          </div>
          <div className="slides-list" ref={setListDroppableRef}>
            <SortableContext
              items={currentSlides.map(s => s.tempId)}
              strategy={verticalListSortingStrategy}
            >
              {currentSlides.map((slide) => (
                <SortableSlide
                  key={slide.tempId}
                  id={slide.tempId}
                  slide={slide}
                  onRemove={removeSlide}
                  zoomLevel={zoomLevel}
                />
              ))}
            </SortableContext>
          </div>
        </div>

        <div
          className="resize-handle"
          onMouseDown={startResizing}
          style={{
            width: '4px',
            cursor: 'col-resize',
            background: isResizing ? '#3b82f6' : '#334155',
            zIndex: 10,
            transition: 'background 0.2s'
          }}
        />

        <div className="organizer-main">
          <div className="category-tabs">
            {categories.map(cat => (
              <div
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </div>
            ))}
          </div>
          <div className="library-grid">
            {filteredLibrary.map(slide => {
              const usedCount = currentSlides.filter(s => s.id === slide.id).length;
              return (
                <LibraryItem
                  key={slide.id}
                  slide={slide}
                  onAdd={addSlide}
                  usedCount={usedCount}
                />
              );
            })}
          </div>
        </div>
      </div>
      <DragOverlay zIndex={10000}>
        {activeId ? (
          activeId.toString().startsWith('library-') ? (
            <div className="thumbnail-card" style={{
              opacity: 0.9,
              width: '200px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              transform: 'scale(1.05)',
              pointerEvents: 'none'
            }}>
              {activeSlide?.type === 'dynamic-job' ? (
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', border: '1px solid #3b82f6' }}>
                  📋 {activeSlide.name}
                </div>
              ) : (
                <img src={activeSlide?.path} alt="" style={{ width: '100%', borderRadius: '8px' }} />
              )}
            </div>
          ) : (
            <div className="slide-item" style={{
              opacity: 0.9,
              background: '#334155',
              width: `${sidebarWidth - 40}px`,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
              transform: 'scale(1.02)',
              pointerEvents: 'none'
            }}>
              <GripVertical size={16} color="#3b82f6" />
              <div className="slide-item-info">{activeSlide?.name}</div>
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
