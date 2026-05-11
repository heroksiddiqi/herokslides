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

const TableJobSlide = ({ allJobs = [], title, isLoading, internalInterval = 10 }) => {
  const [pageIndex, setPageIndex] = React.useState(0);
  const itemsPerPage = 10;

  // Internal pagination logic
  React.useEffect(() => {
    if (allJobs.length <= itemsPerPage) return;

    const interval = setInterval(() => {
      setPageIndex(prev => (prev + itemsPerPage) % allJobs.length);
    }, internalInterval * 1000);

    return () => clearInterval(interval);
  }, [allJobs.length, internalInterval]);

  // Get current 10 jobs
  const displayJobs = [];
  for (let i = 0; i < itemsPerPage; i++) {
    const job = allJobs[(pageIndex + i) % allJobs.length];
    if (job) displayJobs.push(job);
  }

  if (isLoading && allJobs.length === 0) {
    return (
      <div className="dynamic-job-container table-mode dark-theme">
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="loading-text">ডাটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (allJobs.length === 0) return null;

  return (
    <div className="dynamic-job-container table-mode dark-theme">
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
        key={pageIndex}
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
