import React, { useState, useEffect } from 'react';
import '../css/feedback.css';

const FeedbackPage = () => {
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // Retrieve the saved feedback from local storage
    const savedFeedback = localStorage.getItem('feedback');
    if (savedFeedback) {
      // Use regular expression to remove '*' from feedback
      const cleanedFeedback = savedFeedback.replace(/\*/g, '');
      setFeedback(cleanedFeedback);
    }
  }, []);

  // Split the feedback into paragraphs for better structure
  const feedbackParagraphs = feedback ? feedback.split("\n") : [];

  return (
    <div className="feedback-container">
      <h2 className="feedback-title">Interview Feedback</h2>
      {feedback ? (
        <div className="feedback-content">
          {feedbackParagraphs.length > 0 && feedbackParagraphs.map((paragraph, index) => (
            <p key={index} className="feedback-text">{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="no-feedback">No feedback available.</p>
      )}
    </div>
  );
};

export default FeedbackPage;
