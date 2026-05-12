import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const formatBengaliDate = (dateStr) => {
  if (!dateStr) return 'চলমান';
  try {
    const date = new Date(dateStr);
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    const toBengaliNumber = (num) => num.toString().replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    return `${toBengaliNumber(day)} ${month} ${toBengaliNumber(year)}`;
  } catch (e) {
    return dateStr;
  }
};

const DynamicJobSlide = ({ allJobs = [], title, subType, internalInterval = 10, bannedWords = '', isLoading: externalLoading }) => {
  const [internalJobs, setInternalJobs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const banned = useMemo(() => {
    return (bannedWords || '')
      .split(',')
      .map(w => w.trim().toLowerCase())
      .filter(w => w !== '');
  }, [bannedWords]);

  const activeJobs = useMemo(() => {
    const sourceJobs = allJobs.length > 0 ? allJobs : internalJobs;
    if (banned.length === 0) return sourceJobs;

    const textarea = document.createElement('textarea');
    const decodeHTML = (html) => {
      textarea.innerHTML = html;
      return textarea.value;
    };

    return sourceJobs.filter(job => {
      const jobTitle = decodeHTML(job.isBlogger ? job.title : (job.title?.rendered || job.title || '')).toLowerCase();
      const jobContent = decodeHTML(job.isBlogger ? job.content : (job.content?.rendered || job.content || '')).toLowerCase();
      
      return !banned.some(word => jobTitle.includes(word) || jobContent.includes(word));
    });
  }, [allJobs, internalJobs, banned]);

  const isLoading = externalLoading || loading;

  // JSONP Callback handler
  const handleJobData = useCallback((data) => {
    const entries = data.feed.entry || [];
    const processedJobs = entries.map(entry => {
      const content = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : '');
      const title = entry.title.$t;
      const deadlineMatch = content.match(/Deadline:\s*([^<]+)/i);
      const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;
      const postLink = entry.link?.find(l => l.rel === 'alternate')?.href;

      return {
        id: entry.id.$t,
        title: title,
        content: content,
        published: entry.published.$t,
        deadline: deadline,
        view_circular: postLink,
        isBlogger: true
      };
    }).filter(job => job.title.trim() !== 'চাকরির খবর');
    
    setInternalJobs(processedJobs);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Only fetch if no jobs are passed and it's a hot job or other blogger type
    if (allJobs.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const callbackName = `jsonp_callback_${Math.round(Math.random() * 1000000)}`;
    window[callbackName] = (data) => {
      handleJobData(data);
      delete window[callbackName];
    };

    let label = "Hot job";
    if (subType === 'govt') label = "Govt job";
    if (subType === 'faridpur') label = "Faridpur job";
    if (subType === 'latest') label = "aaab";

    const script = document.createElement('script');
    script.src = `https://fearyourcreatorndonotwasteothersright.blogspot.com/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json-in-script&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      setError("ফিড লোড করা সম্ভব হয়নি");
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      delete window[callbackName];
    };
  }, [subType, allJobs.length, handleJobData]);

  const [isPaused, setIsPaused] = useState(false);

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 4) % activeJobs.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => {
      const nextIndex = prev - 4;
      return nextIndex < 0 ? (activeJobs.length - (activeJobs.length % 4 || 4)) : nextIndex;
    });
  };

  // Handle 'K' key to pause/resume internal rotation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'k') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeJobs.length <= 4 || isPaused) return;

    const interval = setInterval(() => {
      handleNext();
    }, internalInterval * 1000);

    return () => clearInterval(interval);
  }, [activeJobs.length, internalInterval, isPaused]);

  if (isLoading && activeJobs.length === 0) {
    return (
      <div className="dynamic-job-container dark-theme">
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="loading-text">ডাটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && activeJobs.length === 0) return null;

  // Get current 4 jobs
  const displayJobs = [];
  for (let i = 0; i < 4; i++) {
    const job = activeJobs[(currentIndex + i) % activeJobs.length];
    if (job) displayJobs.push(job);
  }

  return (
    <div className="dynamic-job-container dark-theme">
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="pause-indicator"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            Paused
          </motion.div>
        )}
      </AnimatePresence>
      {activeJobs.length > 4 && (
        <>
          <button className="nav-arrow left" onClick={handlePrev} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className="nav-arrow right" onClick={handleNext} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </>
      )}

      <header className="slide-header">
        <motion.h1
          className="main-heading"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          key={title}
        >
          {title || "চাকরির খবর"}
        </motion.h1>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="job-grid"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
        >
          {displayJobs.map((job, index) => {
            const jobTitle = job.isBlogger ? job.title : job.title.rendered;
            const jobDate = job.isBlogger ? job.deadline : (job.meta?._deadline_date || job.date);
            const circularUrl = job.view_circular || job.meta?.view_circular;

            return (
              <div key={`${job.id}-${index}`} className="glass-card">
                <h2 className="job-title-large" dangerouslySetInnerHTML={{ __html: jobTitle }}></h2>

                <div className="card-footer">
                  <div className="footer-left">
                    <p className="deadline-text">
                      ডেডলাইন: <span className="deadline-highlight">{formatBengaliDate(jobDate)}</span>
                    </p>
                  </div>
                  {circularUrl && (
                    <div className="footer-right">
                      <a
                        href={circularUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="details-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        বিস্তারিত
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="decor-blob-1"></div>
      <div className="decor-blob-2"></div>
    </div>
  );
};


export default DynamicJobSlide;

