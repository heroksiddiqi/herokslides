import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Play, Pause, SkipForward, SkipBack, Shuffle, List, Maximize, Minimize, Layout, Tv } from 'lucide-react';
import slideData from './slides.json';
import Organizer from './Organizer';
import DynamicJobSlide from './components/DynamicJobSlide';
import './index.css';

const JOB_FETCH_INTERVAL = 10; // Show a job slide every 10 images

function App() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [jobs, setJobs] = useState({ prebd: [], faridpur: [], govt: [], exams: [], deadline: [], deadline3: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOrganizerMode, setIsOrganizerMode] = useState(false);
  const [settings, setSettings] = useState({
    duration: 5,
    dynamicDuration: 30,
    internalInterval: 10,
    isRandom: false,
  });

  const timerRef = useRef(null);

  // Initialize and load settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('slideshow-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    const savedOrder = localStorage.getItem('custom-slide-order');
    if (savedOrder) {
      let parsedOrder = JSON.parse(savedOrder);
      // Migration: Update any old .png paths and names to .webp
      parsedOrder = parsedOrder.map(slide => {
        let updatedSlide = { ...slide };
        if (updatedSlide.path && updatedSlide.path.endsWith('.png')) {
          updatedSlide.path = updatedSlide.path.replace('.png', '.webp');
        }
        if (updatedSlide.name && updatedSlide.name.endsWith('.png')) {
          updatedSlide.name = updatedSlide.name.replace('.png', '.webp');
        }
        return updatedSlide;
      });
      setSlides(parsedOrder);
    } else {
      setSlides(slideData.map(s => ({ ...s, tempId: `sortable-${s.id}-${Math.random()}` })));
    }

    fetchJobs();

    // Refresh jobs every 30 minutes
    const jobRefreshInterval = setInterval(fetchJobs, 30 * 60 * 1000);

    // Initial preloading of first 10
    const initialPreload = slideData.slice(0, 10).map(slide => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = slide.path;
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(initialPreload).then(() => {
      setIsLoading(false);
    });

    return () => clearInterval(jobRefreshInterval);
  }, []);

  // Fetch jobs from Prebd API
  const fetchJobs = async () => {
    try {
      // Helper function to get formatted date (YYYY-MM-DD)
      const getDeadlineDate = (daysAhead) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const date1 = getDeadlineDate(1);
      const date2 = getDeadlineDate(2);
      const date3 = getDeadlineDate(3);

      const [prebdRes, faridpurRes, govtRes, examsRes, d1Res, d2Res, d3Res] = await Promise.all([
        fetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=189'),
        fetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=73'),
        fetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=13'),
        fetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=132'),
        fetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date1}&page=1`),
        fetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date2}&page=1`),
        fetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date3}&page=1`)
      ]);

      const prebdData = await prebdRes.json();
      const faridpurData = await faridpurRes.json();
      const govtData = await govtRes.json();
      const examsData = await examsRes.json();
      const d1Data = await d1Res.json();
      const d2Data = await d2Res.json();
      const d3Data = await d3Res.json();

      // ৩ দিনের ডাটা মার্জ করা এবং ডুপ্লিকেট রিমুভ করা
      const mergedDeadline3 = [...d1Data, ...d2Data, ...d3Data].reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        else return acc;
      }, []);

      setJobs({
        prebd: prebdData,
        faridpur: faridpurData,
        govt: govtData,
        exams: examsData,
        deadline: d1Data,
        deadline3: mergedDeadline3
      });
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    }
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      let nextIdx = prev;
      const totalSlides = slides.length;
      
      if (totalSlides === 0) return 0;

      // Find the next non-hidden slide
      for (let i = 1; i <= totalSlides; i++) {
        const potentialIdx = settings.isRandom 
          ? Math.floor(Math.random() * totalSlides)
          : (prev + i) % totalSlides;
          
        if (!slides[potentialIdx]?.hidden) {
          nextIdx = potentialIdx;
          break;
        }
      }
      return nextIdx;
    });
  }, [slides, settings.isRandom]);

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const totalSlides = slides.length;
      if (totalSlides === 0) return 0;
      
      let prevIdx = prev;
      for (let i = 1; i <= totalSlides; i++) {
        const potentialIdx = (prev - i + totalSlides) % totalSlides;
        if (!slides[potentialIdx]?.hidden) {
          prevIdx = potentialIdx;
          break;
        }
      }
      return prevIdx;
    });
  };

  // Slideshow timer
  useEffect(() => {
    if (isPlaying && slides.length > 0) {
      const currentSlide = slides[currentIndex];
      
      // 1. Individual slide duration override
      // 2. Default to dynamic or static global duration
      let currentDuration = currentSlide?.duration;
      
      if (!currentDuration) {
        const isJob = currentSlide?.type === 'dynamic-job';
        currentDuration = isJob ? settings.dynamicDuration : settings.duration;
      }

      timerRef.current = setInterval(nextSlide, currentDuration * 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, nextSlide, settings.duration, settings.dynamicDuration, slides, currentIndex]);

  // Handle skip if current slide is hidden
  useEffect(() => {
    if (slides.length > 0 && slides[currentIndex]?.hidden) {
      nextSlide();
    }
  }, [currentIndex, slides, nextSlide]);

  // Preloading logic
  useEffect(() => {
    if (slides.length === 0) return;

    // Preload next 10 images
    for (let i = 1; i <= 10; i++) {
      const nextIdx = (currentIndex + i) % slides.length;
      const img = new Image();
      img.src = slides[nextIdx].path;
    }
  }, [currentIndex, slides]);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('slideshow-settings', JSON.stringify(newSettings));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    if (isOrganizerMode) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        nextSlide();
      } else if (e.code === 'ArrowLeft') {
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOrganizerMode, nextSlide, prevSlide]);

  const isJobSlide = false; // Disable automatic injection as user wants manual control

  // Logic for 4 jobs per slide
  const getJobGroup = () => {
    if (!jobs.length) return [];
    const groupIndex = settings.onlyJobs
      ? currentIndex % Math.ceil(jobs.length / 4)
      : Math.floor(currentIndex / JOB_FETCH_INTERVAL) % Math.ceil(jobs.length / 4);
    const start = groupIndex * 4;
    return jobs.slice(start, start + 4);
  };

  const currentJobsGroup = getJobGroup();

  const updateOrder = (newOrder) => {
    setSlides(newOrder);
    localStorage.setItem('custom-slide-order', JSON.stringify(newOrder));
  };

  if (isOrganizerMode) {
    return (
      <>
        <div className="mode-toggle" style={{ top: 'auto', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }} onClick={() => setIsOrganizerMode(false)}>
          <Tv size={20} /> Watch Slideshow
        </div>
        <Organizer
          allSlides={slideData}
          currentSlides={slides}
          onUpdateOrder={updateOrder}
        />
      </>
    );
  }

  return (
    <div className="slideshow-container">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="modal-backdrop"
            style={{ zIndex: 2000, background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ width: 50, height: 50, border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%' }}
            />
            <p style={{ marginTop: 20, color: '#94a3b8' }}>Loading Slides...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {slides[currentIndex]?.type === 'dynamic-job' ? (
          <motion.div
            key={`dynamic-${currentIndex}-${slides[currentIndex]?.id}`}
            className="slide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <DynamicJobSlide
              allJobs={
                slides[currentIndex]?.subType === 'faridpur' ? jobs.faridpur :
                  slides[currentIndex]?.subType === 'govt' ? jobs.govt :
                    slides[currentIndex]?.subType === 'exams' ? jobs.exams :
                      slides[currentIndex]?.subType === 'deadline' ? jobs.deadline :
                        slides[currentIndex]?.subType === 'deadline3' ? jobs.deadline3 :
                          jobs.prebd
              }
              title={
                slides[currentIndex]?.subType === 'faridpur' ? 'ফরিদপুরের সরকারী চাকরী' :
                  slides[currentIndex]?.subType === 'govt' ? 'সরকারী চাকরী' :
                    slides[currentIndex]?.subType === 'exams' ? 'পরীক্ষার সময়সূচী' :
                      slides[currentIndex]?.subType === 'deadline' ? 'আগামীকালের ডেডলাইন' :
                        slides[currentIndex]?.subType === 'deadline3' ? 'আগামী ৩ দিনের ডেডলাইন' :
                          'বাছাইকৃত সার্কুলার'
              }
              duration={settings.dynamicDuration}
              internalInterval={settings.internalInterval}
              currentIndex={currentIndex}
            />
          </motion.div>
        ) : (
          slides.length > 0 && (
            <motion.div
              key={slides[currentIndex]?.id}
              className="slide"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 1 }}
            >
              <img src={slides[currentIndex]?.path} alt={slides[currentIndex]?.name} />
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      {isPlaying && (
        <motion.div 
          className="progress-bar"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          key={`progress-${currentIndex}`}
          transition={{ 
            duration: slides[currentIndex]?.duration || (slides[currentIndex]?.type === 'dynamic-job' ? settings.dynamicDuration : settings.duration), 
            ease: "linear" 
          }}
        />
      )}

      {/* Controls */}
      <div className="controls-overlay">
        <button className="control-btn" onClick={prevSlide}><SkipBack size={20} /></button>
        <button className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="control-btn" onClick={nextSlide}><SkipForward size={20} /></button>
        <button
          className="control-btn"
          onClick={() => updateSetting('isRandom', !settings.isRandom)}
          style={{ color: settings.isRandom ? '#3b82f6' : 'white' }}
        >
          <Shuffle size={20} />
        </button>
        <button className="control-btn" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        <button className="control-btn" onClick={() => setIsOrganizerMode(true)} title="Organize Slides">
          <Layout size={20} />
        </button>
        <button className="control-btn" onClick={() => setShowSettings(true)}>
          <SettingsIcon size={20} />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSettings(false)} />
          <div className="settings-modal">
            <h3 style={{ marginTop: 0 }}>Settings</h3>
            <div className="settings-group">
              <label className="settings-label">Slide Duration (seconds)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.duration}
                onChange={(e) => updateSetting('duration', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="settings-group">
              <label className="settings-label">Dynamic Slide Duration (seconds)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.dynamicDuration}
                onChange={(e) => updateSetting('dynamicDuration', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="settings-group">
              <label className="settings-label">Internal Update Interval (seconds)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.internalInterval}
                onChange={(e) => updateSetting('internalInterval', parseInt(e.target.value) || 1)}
              />
            </div>
            <button
              className="settings-input"
              style={{ background: '#3b82f6', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
