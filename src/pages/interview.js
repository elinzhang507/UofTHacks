import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from "react-webcam";
import '../css/interview.css';

const Interview = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recording, setRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    const storedQuestions = localStorage.getItem("generatedQuestions");
    if(storedQuestions){
      setQuestions(JSON.parse(storedQuestions));
    }
  }, []);

  // Start recording video
  const startRecording = async () => {
    if (!webcamRef.current) return;

    try {
      const stream = webcamRef.current.stream;  // Use webcamRef.current.stream instead of getMediaStream

      if (!stream) {
        console.log("Failed to obtain stream");
        return;
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        setVideoFile(blob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            stopRecording(); // Automatically stop when timer is up
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting recording: " + error.message);
      setRecording(false);
    }
  };

  // Stop recording video
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setTimeRemaining(120);
      setRecordedChunks([]);
      setVideoFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      alert('No file selected.');
      return;
    }

    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file.');
      return;
    }

    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      alert('Please upload a video before submitting.');
      return;
    }

    const jobDescription = localStorage.getItem('jobDescription');
    if (!jobDescription) {
      alert('Job description is missing.');
      return;
    }

    setLoading(true);

    const promptText = "Analyze the following job description and evaluate the interviewee's answer. Provide detailed feedback on the following categories with a score out of 10 for each subcategory:" + 
    " 1. **Presentation Skills**: " + 
    "- **Eye Contact**: Evaluate the interviewee's eye contact during the answer." + 
    "- **Pacing**: Assess the pacing of the response (whether it's too fast, too slow, or just right)." + 
    "- **Clarity**: Rate how clearly the interviewee expresses their ideas." + 
    "- **Tone**: Rate the tone used during the interview (whether it is appropriate, engaging, and professional)." + 
    " 2. **Answer Quality**: " + 
    "- **Sentence Structure**: Evaluate the grammatical correctness and coherence of the answer." + 
    "- **Relation to Job Description**: Assess how well the answer aligns with the job description and its requirements." + 
    "- **Professionalism**: Rate the level of professionalism in the interviewee’s language and demeanor." + 
    " Provide a score out of 10 for each subcategory, along with qualitative feedback to help improve performance. At the end," +
    " provide an overall score for the interviewee's performance based on the categories above.";


    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append(
      'text',
      promptText + `Job description: ${jobDescription}`
    );
    formData.append('providers', 'google');

    try {
      const response = await axios.post('https://api.edenai.run/v2/video/question_answer', formData, {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiODdiYzA3MTQtNWVkMS00OTk2LTkyOTMtYjY3MmRjYWZlYmVjIiwidHlwZSI6ImFwaV90b2tlbiJ9.DS_e4JhpwHwiqPw1rCHnLW20Ri4Krlne8fXVylFV-vE', // Use your valid API key
        },
      });

      if (response.data && response.data.google && response.data.google.answer) {
        setFeedback(response.data.google.answer);
      } else {
        setFeedback('No feedback available.');
      }
    } catch (error) {
      console.error('Error uploading video:', error);

      if (error.response) {
        console.log('Response data:', error.response.data);
        setFeedback(`API Error: ${error.response.data.message || 'Permission error. Check your API key and permissions.'}`);
      } else if (error.request) {
        setFeedback('No response from the server. Please check your network connection.');
      } else {
        setFeedback(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const goToFeedback = () => {
    localStorage.setItem('feedback', feedback);
    navigate('../feedback');
  };

  // Allow users to download the video file once the recording is done
  const handleDownload = () => {
    if (!videoFile) return;

    const url = URL.createObjectURL(videoFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'interview-video.webm';  // Set default filename
    link.click();
    URL.revokeObjectURL(url);  // Clean up URL object after download
  };

  return (
    <div className="interview-container">
      <h1 className="header">Interview Analysis</h1>
      {questions.length > 0 ? (
        <>
          <h2>Question {currentQuestionIndex + 1}/{questions.length}</h2>
          <p>{questions[currentQuestionIndex]}</p>
          <Webcam
            audio={true}
            ref={webcamRef}
            style={{ width: '400px', height: '300px', margin: '10px auto', display: 'block' }}
          />
          <p>Time Remaining: {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</p>

          {!recording ? (
            <button onClick={startRecording} disabled={loading}>
              Start Recording
            </button>
          ) : (
            <button onClick={stopRecording} disabled={loading}>
              Stop Recording
            </button>
          )}

          <input type="file" accept="video/*" onChange={handleFileChange} disabled={loading} />
        
          <button onClick={handleSubmit} disabled={!videoFile || loading}>
            {loading ? 'Analyzing...' : 'Submit Video'}
          </button>

          {currentQuestionIndex < questions.length - 1 && (
            <button onClick={handleNextQuestion} disabled={loading || recording}>
              Next Question
            </button>
          )}

          {videoFile && !loading && !recording && (
            <button onClick={handleDownload}>Download Video</button>
          )}

          {feedback ? (
            <div className="feedback-container">
              <h2>Feedback</h2>
              {/* <pre>{feedback}</pre> */}
              <button onClick={goToFeedback}>Go to Feedback</button>
            </div>
          ) : (
            <div className="feedback-container">
              <p>No feedback available yet.</p>
              <button onClick={goToFeedback}>Go to Feedback</button>
            </div>
          )}
        </>
      ) : (
        <p>Loading questions...</p>
      )}
    </div>
  );
};

export default Interview;
