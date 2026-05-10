import React, { useState, useEffect, useCallback } from 'react';
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

const DynamicJobSlide = ({ allJobs = [], title, subType, internalInterval = 10 }) => {
  const [internalJobs, setInternalJobs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeJobs = allJobs.length > 0 ? allJobs : internalJobs;

  // JSONP Callback handler
  const handleJobData = useCallback((data) => {
    const entries = data.feed.entry || [];
    const processedJobs = entries.map(entry => {
      const content = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : '');

      // Extract deadline if present in content (e.g., Deadline: 24 May 2026)
      const deadlineMatch = content.match(/Deadline:\s*([^<]+)/i);
      const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;

      return {
        id: entry.id.$t,
        title: entry.title.$t, // Blogger structure
        published: entry.published.$t,
        deadline: deadline,
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

  useEffect(() => {
    if (activeJobs.length <= 4) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 4) % activeJobs.length);
    }, internalInterval * 1000);

    return () => clearInterval(interval);
  }, [activeJobs.length, internalInterval]);

  if (loading && activeJobs.length === 0) {
    return (
      <div className="dynamic-job-container dark-theme">
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="loading-text">ডাটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!loading && activeJobs.length === 0) return null;

  // Get current 4 jobs
  const displayJobs = [];
  for (let i = 0; i < 4; i++) {
    const job = activeJobs[(currentIndex + i) % activeJobs.length];
    if (job) displayJobs.push(job);
  }

  return (
    <div className="dynamic-job-container dark-theme">
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

            return (
              <div key={job.id} className="glass-card">
                <h2 className="job-title-large" dangerouslySetInnerHTML={{ __html: jobTitle }}></h2>

                <div className="card-footer">
                  <p className="deadline-text">
                    ডেডলাইন: <span className="deadline-highlight">{formatBengaliDate(jobDate)}</span>
                  </p>
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

