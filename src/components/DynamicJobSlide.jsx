import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';

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

const DynamicJobSlide = ({ allJobs, internalInterval, duration, currentIndex, title }) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // Calculate starting job group based on the main currentIndex to ensure variety
  const initialJobOffset = (currentIndex * 4) % (allJobs.length || 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setInternalIndex(prev => prev + 1);
      setIsLightTheme(prev => !prev);
    }, internalInterval * 1000);

    return () => clearInterval(interval);
  }, [internalInterval]);

  if (!allJobs || allJobs.length === 0) return null;

  // Get current 4 jobs based on internal rotation
  const getJobs = () => {
    const totalJobs = allJobs.length;
    const currentOffset = (initialJobOffset + internalIndex * 4) % totalJobs;

    // Handle wrap around
    let jobs = allJobs.slice(currentOffset, currentOffset + 4);
    if (jobs.length < 4) {
      jobs = [...jobs, ...allJobs.slice(0, 4 - jobs.length)];
    }
    return jobs;
  };

  const currentJobs = getJobs();

  return (
    <div className={`dynamic-job-container ${isLightTheme ? 'light-theme' : 'dark-theme'}`}>
      <header className="slide-header">
        <motion.h1
          className="main-heading"
          key={isLightTheme ? 'light' : 'dark'}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {title}
        </motion.h1>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={internalIndex}
          className="job-grid"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {currentJobs.map((job, index) => (
            <div
              key={job.id || index}
              className="glass-card job-item"
            >
              <div className="card-content">
                <h2 className="job-title-large" dangerouslySetInnerHTML={{ __html: job.title.rendered }}></h2>
              </div>

              <div className="card-footer">
                <Calendar className="footer-icon" size={32} />
                <p className="deadline-text">
                  আবেদনের শেষ সময়: <span className="deadline-highlight">{formatBengaliDate(job.meta?._deadline_date)}</span>
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="decor-blob-1"></div>
      <div className="decor-blob-2"></div>
    </div>
  );
};

export default DynamicJobSlide;
