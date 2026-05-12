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
import { Trash2, GripVertical, Download, Plus, Eye, EyeOff, Clock, RefreshCcw } from 'lucide-react';

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
      <div className="thumbnail-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 8px' }}>
        <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'left', display: 'block' }} title={slide.name}>
          {slide.name}
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(slide, 'top'); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ flex: 1, background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', padding: '8px 0', fontSize: '11px', fontWeight: '900', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            title="Add to Top"
          >
            TOP
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(slide, 'bottom'); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ flex: 1, background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', padding: '8px 0', fontSize: '11px', fontWeight: '900', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            title="Add to Bottom"
          >
            END
          </button>
        </div>
      </div>
    </div>
  );
}

// Sortable item for the Slides List (Left side)
function SortableSlide({ id, slide, onRemove, onUpdate, zoomLevel }) {
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
    opacity: isDragging ? 0.5 : (slide.hidden ? 0.4 : 1),
    background: slide.hidden ? '#1e293b' : undefined,
    border: slide.hidden ? '1px dashed #475569' : undefined
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
      <div className="slide-item-info" style={{ fontSize: `${0.8 * zoomLevel}rem`, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {slide.type === 'dynamic-job' ? slide.name : (slide.path ? slide.path.replace('/slides/', '') : slide.name)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={10} color="#94a3b8" />
          <input 
            type="number" 
            value={slide.duration || ''} 
            placeholder="Auto"
            onChange={(e) => onUpdate(id, { duration: parseInt(e.target.value) || null })}
            style={{ width: '40px', fontSize: '10px', background: '#334155', border: '1px solid #475569', color: 'white', padding: '0 2px', borderRadius: '2px' }}
          />
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>sec</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          onClick={() => onUpdate(id, { hidden: !slide.hidden })}
          style={{ background: 'none', border: 'none', color: slide.hidden ? '#94a3b8' : '#3b82f6', cursor: 'pointer' }}
          title={slide.hidden ? 'Show Slide' : 'Hide Slide'}
        >
          {slide.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button 
          onClick={() => onRemove(id)}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Organizer({ allSlides, currentSlides, onUpdateOrder, onReset }) {
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
    { id: 'dynamic-job-deadline3', name: 'আগামী ৩ দিনের ডেডলাইন', type: 'dynamic-job', category: 'Dynamic', subType: 'deadline3' },
    { id: 'dynamic-job-hot', name: 'হট জবস', type: 'dynamic-job', category: 'Dynamic', subType: 'hot' },
    { id: 'dynamic-job-latest', name: 'লেটেস্ট জব ইনফো', type: 'dynamic-job', category: 'Dynamic', subType: 'latest' },
    {id: 'table-job-prebd', name: 'বাছাইকৃত সার্কুলার - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-prebd'},
    {id: 'table-job-faridpur', name: 'ফরিদপুরের সরকারী চাকরী - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-faridpur'},
    {id: 'table-job-govt', name: 'সরকারী চাকরী - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-govt'},
    {id: 'table-job-exams', name: 'পরীক্ষার সময়সূচী - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-exams'},
    {id: 'table-job-deadline', name: 'আগামীকালের ডেডলাইন - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-deadline'},
    {id: 'table-job-deadline3', name: 'আগামী ৩ দিনের ডেডলাইন - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-deadline3'},
    {id: 'table-job-hot', name: 'হট জবস - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-hot'},
    {id: 'table-job-latest', name: 'লেটেস্ট জব ইনফো - টেবিল', type: 'dynamic-job', category: 'Dynamic', subType: 'table-latest'}
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

  const addSlide = (slide, position = 'bottom') => {
    const newSlide = { ...slide, tempId: `sortable-${slide.id}-${Date.now()}` };
    if (position === 'top') {
      onUpdateOrder([newSlide, ...currentSlides]);
    } else {
      onUpdateOrder([...currentSlides, newSlide]);
    }
  };

  const removeSlide = (tempId) => {
    onUpdateOrder(currentSlides.filter(s => s.tempId !== tempId));
  };

  const updateSlide = (tempId, updates) => {
    const newSlides = currentSlides.map(s => s.tempId === tempId ? { ...s, ...updates } : s);
    onUpdateOrder(newSlides);
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
            <button onClick={onReset} className="control-btn" title="Sync from Disk (Reset Order)">
              <RefreshCcw size={18} />
            </button>
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
                  onUpdate={updateSlide}
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
              <div className="slide-item-info">
                {activeSlide?.type === 'dynamic-job' ? activeSlide?.name : (activeSlide?.path ? activeSlide.path.replace('/slides/', '') : activeSlide?.name)}
              </div>
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
