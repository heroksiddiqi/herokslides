import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Play, Pause, SkipForward, SkipBack, Shuffle, List, Maximize, Minimize, Layout, Tv } from 'lucide-react';
import slideData from './slides.json';
import Organizer from './Organizer';
import DynamicJobSlide from './components/DynamicJobSlide';
import TableJobSlide from './components/TableJobSlide';
import './index.css';

const JOB_FETCH_INTERVAL = 10; // Show a job slide every 10 images

const getImagePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

function App() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [jobs, setJobs] = useState({ prebd: [], faridpur: [], govt: [], exams: [], deadline: [], deadline3: [], hot: [], latest: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOrganizerMode, setIsOrganizerMode] = useState(false);
  const [settings, setSettings] = useState({
    duration: 20,
    dynamicDuration: 60,
    internalInterval: 20,
    isRandom: false,
    bannedWords: 'bank,ngo,ব্যাংক,Insurance,বীমা,ইন্সুরেন্স,ইন্স্যুরেন্স,Microfinance,ক্ষুদ্রঋণ,ঋণ,Tobacco,তামাক,Credit,ক্রেডিট',
  });
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const timerRef = useRef(null);

  // Initialize and load settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('slideshow-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    const savedOrder = localStorage.getItem('custom-slide-order');
    if (savedOrder) {
      const parsedOrder = JSON.parse(savedOrder);
      // Sync names from slideData to ensure renames reflect even in saved orders
      const syncedOrder = parsedOrder.map(slide => {
        const original = slideData.find(s => s.id === slide.id);
        return original ? { ...slide, name: original.name } : slide;
      });
      setSlides(syncedOrder);
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

    Promise.all(initialPreload).finally(() => {
      setIsLoading(false);
    });

    // Fallback: Force loading to end after 5 seconds
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearInterval(jobRefreshInterval);
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Fetch jobs from Prebd API and Blogspot
  const fetchJobs = async () => {
    const safeFetch = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
      } catch (e) {
        return [];
      }
    };

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

      // Fetch all WP data in parallel safely
      const [prebdData, faridpurData, govtData, examsData, d1Data, d2Data, d3Data] = await Promise.all([
        safeFetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=189'),
        safeFetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=73'),
        safeFetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=13'),
        safeFetch('https://prebd.com/wp-json/wp/v2/posts?per_page=20&_embed=true&page=1&categories=132'),
        safeFetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date1}&page=1`),
        safeFetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date2}&page=1`),
        safeFetch(`https://prebd.com/wp-json/wp/v2/posts?per_page=15&_embed=true&categories=188&meta_key=_deadline_date&meta_value=${date3}&page=1`)
      ]);

      // ৩ দিনের ডাটা মার্জ করা এবং ডুপ্লিকেট রিমুভ করা
      const mergedDeadline3 = [...(d1Data || []), ...(d2Data || []), ...(d3Data || [])].reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        else return acc;
      }, []);

      setJobs({
        prebd: prebdData || [],
        faridpur: faridpurData || [],
        govt: govtData || [],
        exams: examsData || [],
        deadline: d1Data || [],
        deadline3: mergedDeadline3 || [],
        hot: [],
        latest: []
      });
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    }
  };

  const filteredJobs = useMemo(() => {
    const banned = (settings.bannedWords || '')
      .split(',')
      .map(w => w.trim().toLowerCase())
      .filter(w => w !== '');

    if (banned.length === 0) return jobs;

    const decodeHTML = (html) => {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    };

    const filterList = (list) => {
      if (!list || !Array.isArray(list)) return [];
      return list.filter(item => {
        const title = decodeHTML(item.title?.rendered || item.title || '').toLowerCase();
        const content = decodeHTML(item.content?.rendered || item.content || '').toLowerCase();
        const excerpt = decodeHTML(item.excerpt?.rendered || '').toLowerCase();

        return !banned.some(word =>
          title.includes(word) ||
          content.includes(word) ||
          excerpt.includes(word)
        );
      });
    };

    return {
      prebd: filterList(jobs.prebd),
      faridpur: filterList(jobs.faridpur),
      govt: filterList(jobs.govt),
      exams: filterList(jobs.exams),
      deadline: filterList(jobs.deadline),
      deadline3: filterList(jobs.deadline3),
      hot: filterList(jobs.hot),
      latest: filterList(jobs.latest)
    };
  }, [jobs, settings.bannedWords]);

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

  // Bottom dock auto-hide logic
  useEffect(() => {
    const handleMouseMove = () => {
      setIsControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    // Initial timer
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const resetToDisk = () => {
    if (window.confirm("This will refresh the library with any new or renamed files from disk. Your current playlist order will be preserved. Continue?")) {
      window.location.reload();
    }
  };

  const updateOrder = (newOrder) => {
    setSlides(newOrder);
    localStorage.setItem('custom-slide-order', JSON.stringify(newOrder));
  };

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1920;
      const targetHeight = 1080;
      const widthScale = window.innerWidth / targetWidth;
      const heightScale = window.innerHeight / targetHeight;
      // Use the smaller scale to ensure content fits both dimensions
      // For digital signage, we usually want to fill 1080p exactly.
      // If the screen is 1080p but scaled, this will compensate.
      setScale(Math.min(widthScale, heightScale));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          onReset={resetToDisk}
        />
      </>
    );
  }

  return (
    <div className="slideshow-container">
      <div
        className="resolution-protector"
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          left: '50%',
          top: '50%',
          marginLeft: `-${(1920 * scale) / 2}px`,
          marginTop: `-${(1080 * scale) / 2}px`,
          overflow: 'hidden'
        }}
      >
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

        <AnimatePresence>
          {slides[currentIndex]?.type === 'dynamic-job' ? (
            <motion.div
              key={`dynamic-${currentIndex}-${slides[currentIndex]?.id}`}
              className="slide"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            >
              {slides[currentIndex]?.subType?.startsWith('table-') ? (
                <TableJobSlide
                  allJobs={
                    slides[currentIndex]?.subType === 'table-faridpur' ? filteredJobs.faridpur :
                      slides[currentIndex]?.subType === 'table-govt' ? filteredJobs.govt :
                        slides[currentIndex]?.subType === 'table-exams' ? filteredJobs.exams :
                          slides[currentIndex]?.subType === 'table-deadline' ? filteredJobs.deadline :
                            slides[currentIndex]?.subType === 'table-deadline3' ? filteredJobs.deadline3 :
                              (slides[currentIndex]?.subType === 'table-hot' || slides[currentIndex]?.subType === 'table-latest') ? [] :
                                filteredJobs.prebd
                  }
                  subType={slides[currentIndex]?.subType}
                  title={slides[currentIndex]?.name}
                  isLoading={isLoading}
                  internalInterval={settings.internalInterval}
                  bannedWords={settings.bannedWords}
                />
              ) : (
                <DynamicJobSlide
                  allJobs={
                    slides[currentIndex]?.subType === 'faridpur' ? filteredJobs.faridpur :
                      slides[currentIndex]?.subType === 'govt' ? filteredJobs.govt :
                        slides[currentIndex]?.subType === 'exams' ? filteredJobs.exams :
                          slides[currentIndex]?.subType === 'deadline' ? filteredJobs.deadline :
                            slides[currentIndex]?.subType === 'deadline3' ? filteredJobs.deadline3 :
                              slides[currentIndex]?.subType === 'hot' ? filteredJobs.hot :
                                slides[currentIndex]?.subType === 'latest' ? filteredJobs.latest :
                                  filteredJobs.prebd
                  }
                  subType={slides[currentIndex]?.subType}
                  title={slides[currentIndex]?.name}
                  isLoading={isLoading}
                  internalInterval={settings.internalInterval}
                  bannedWords={settings.bannedWords}
                />
              )}
            </motion.div>
          ) : (
            slides.length > 0 && (
              <motion.div
                key={slides[currentIndex]?.id}
                className="slide"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              >
                <img src={getImagePath(slides[currentIndex]?.path)} alt={slides[currentIndex]?.name} />
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
      </div>

      {/* Controls - These should NOT be scaled, or scaled differently, but keep them on top */}
      <div className={`controls-overlay ${isControlsVisible ? 'visible' : ''}`}>
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
            <div className="settings-group">
              <label className="settings-label">Banned Words (comma separated)</label>
              <textarea
                className="settings-input"
                style={{ height: '80px', paddingTop: '8px', resize: 'vertical' }}
                value={settings.bannedWords}
                placeholder="e.g. bank, ngo, ব্যাংক, এনজিও"
                onChange={(e) => updateSetting('bannedWords', e.target.value)}
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
