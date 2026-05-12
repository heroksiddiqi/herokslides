import React from 'react';
import { motion } from 'framer-motion';

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

const toBengaliNumber = (num) => num.toString().replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

const TableJobSlide = ({ allJobs = [], title, subType, isLoading: externalLoading, internalInterval = 10 }) => {
  const [internalJobs, setInternalJobs] = React.useState([]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const itemsPerPage = 10;

  const activeJobs = allJobs.length > 0 ? allJobs : internalJobs;
  const isLoading = externalLoading || loading;

  // JSONP Callback handler
  const handleJobData = React.useCallback((data) => {
    const entries = data.feed.entry || [];
    const processedJobs = entries.map(entry => {
      const content = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : '');
      const deadlineMatch = content.match(/Deadline:\s*([^<]+)/i);
      const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;
      const postLink = entry.link?.find(l => l.rel === 'alternate')?.href;

      return {
        id: entry.id.$t,
        title: entry.title.$t,
        published: entry.published.$t,
        deadline: deadline,
        view_circular: postLink,
        isBlogger: true
      };
    }).filter(job => job.title.trim() !== 'চাকরির খবর');
    setInternalJobs(processedJobs);
    setLoading(false);
  }, []);

  // Fetch Blogger data
  React.useEffect(() => {
    if (allJobs.length > 0 || !subType) {
      setLoading(false);
      return;
    }

    // Only fetch if it's a blogger type (hot or latest) or table versions
    const bloggerTypes = ['hot', 'latest', 'table-hot', 'table-latest'];
    if (!bloggerTypes.includes(subType)) return;

    setLoading(true);
    const callbackName = `jsonp_callback_table_${Math.round(Math.random() * 1000000)}`;
    window[callbackName] = (data) => {
      handleJobData(data);
      delete window[callbackName];
    };

    let label = "Hot job";
    if (subType === 'latest' || subType === 'table-latest') label = "aaab";
    if (subType === 'hot' || subType === 'table-hot') label = "Hot job";

    const script = document.createElement('script');
    script.src = `https://fearyourcreatorndonotwasteothersright.blogspot.com/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json-in-script&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => setLoading(false);

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      delete window[callbackName];
    };
  }, [subType, allJobs.length, handleJobData]);

  const [isPaused, setIsPaused] = React.useState(false);

  const handleNext = () => {
    setPageIndex(prev => (prev + itemsPerPage) % activeJobs.length);
  };

  const handlePrev = () => {
    setPageIndex(prev => {
      const nextIndex = prev - itemsPerPage;
      return nextIndex < 0 ? (activeJobs.length - (activeJobs.length % itemsPerPage || itemsPerPage)) : nextIndex;
    });
  };

  // Handle 'K' key to pause/resume internal rotation
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'k') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Internal pagination logic
  React.useEffect(() => {
    if (activeJobs.length <= itemsPerPage || isPaused) return;

    const interval = setInterval(() => {
      handleNext();
    }, internalInterval * 1000);

    return () => clearInterval(interval);
  }, [activeJobs.length, internalInterval, isPaused]);

  // Get current 10 jobs
  const displayJobs = [];
  for (let i = 0; i < itemsPerPage; i++) {
    const job = activeJobs[(pageIndex + i) % activeJobs.length];
    if (job) displayJobs.push(job);
  }

  if (isLoading && activeJobs.length === 0) {
    return (
      <div className="dynamic-job-container table-mode dark-theme">
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="loading-text">ডাটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (activeJobs.length === 0) return null;

  return (
    <div className="dynamic-job-container table-mode dark-theme">
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            className="pause-indicator"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{ top: '40px', right: '40px', left: 'auto', transform: 'none' }}
          >
            Paused
          </motion.div>
        )}
      </AnimatePresence>
      {activeJobs.length > itemsPerPage && (
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

      <header className="slide-header" style={{ marginBottom: '0.5rem' }}>
        <motion.h1
          className="main-heading table-heading"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          key={title}
        >
          {title || "চাকরির তালিকা"}
        </motion.h1>
      </header>

      <motion.div 
        className="table-wrapper glass-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        key={`${subType}-${pageIndex}`}
        transition={{ duration: 0.5 }}
      >
        <table className="job-table">
          <thead>
            <tr>
              <th width="70">নং</th>
              <th>নিয়োগ বিজ্ঞপ্তির শিরোনাম</th>
              <th width="240" style={{ textAlign: 'right' }}>ডেডলাইন</th>
              <th width="180">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {displayJobs.map((job, index) => {
              const jobTitle = job.isBlogger ? job.title : job.title.rendered;
              const jobDate = job.isBlogger ? job.deadline : (job.meta?._deadline_date || job.date);
              const circularUrl = job.view_circular || job.meta?.view_circular;
              
              return (
                <motion.tr 
                  key={`${job.id}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="idx">{toBengaliNumber((pageIndex + index + 1))}</td>
                  <td className="title" dangerouslySetInnerHTML={{ __html: jobTitle }}></td>
                  <td className="date">{formatBengaliDate(jobDate)}</td>
                  <td className="action">
                    {circularUrl && (
                      <a 
                        href={circularUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="table-details-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        বিস্তারিত
                      </a>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Decorative elements */}
      <div className="decor-blob-1"></div>
      <div className="decor-blob-2"></div>
    </div>
  );
};

export default TableJobSlide;
