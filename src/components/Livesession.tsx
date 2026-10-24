import { useEffect, useState, useRef } from 'react';
import {
  BrainCircuit, Square,
  Video, Clock, AlertCircle, StopCircle, Sparkles, Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Lottie from "lottie-react";
import childboyAnimation from "../assets/childboy.json";
import Feedback from './Feedback';
import { countInterviews, saveInterview } from '../services/data';
import { feedbackSchema, generateJson, generateText, parseQuestionList } from '../services/ai';

interface SavedSession {
  questions: string[];
  answers: string[];
  currentQuestionIdx: number;
}

// Read an in-progress session (after a page refresh). Used as initial state, not in an effect,
// so React StrictMode's double effects can't overwrite it with empty arrays.
function readSavedSession(): SavedSession {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('liveSessionState') || '{}');
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      currentQuestionIdx: typeof parsed.currentQuestionIdx === 'number' ? parsed.currentQuestionIdx : 0,
    };
  } catch {
    return { questions: [], answers: [], currentQuestionIdx: 0 };
  }
}

export default function Livesession() {
  const navigate = useNavigate();
  // Fetch interview type from sessionStorage (set in previous form)
  const [interviewType, setInterviewType] = useState('');
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [answerTimerStarted, setAnswerTimerStarted] = useState(false);
  const [answerTimeLeft, setAnswerTimeLeft] = useState(2 * 60); // 2 minutes in seconds
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [camAllowed, setCamAllowed] = useState<null | boolean>(null);
  const [camError, setCamError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Session state: questions, answers, timer
  const [savedSession] = useState(readSavedSession);
  const [questions, setQuestions] = useState<string[]>(savedSession.questions);
  const [answers, setAnswers] = useState<string[]>(savedSession.answers);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(savedSession.currentQuestionIdx);

  // Feedback modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  // Fullscreen functionality
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (error) {
      console.log('Fullscreen request failed:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.log('Exit fullscreen failed:', error);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Auto-enter fullscreen when component mounts
  useEffect(() => {
    // Small delay to ensure component is fully loaded
    const timer = setTimeout(() => {
      enterFullscreen();
    }, 500);

    return () => clearTimeout(timer);
  }, []);



  // Persist session state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('liveSessionState', JSON.stringify({
      questions,
      answers,
      currentQuestionIdx
    }));
  }, [questions, answers, currentQuestionIdx]);

  const currentQuestion = questions[currentQuestionIdx] || '';

  const handleNextQuestion = () => {
    if (isAnswering) stopSTT();
    setCurrentQuestionIdx((prev) => (prev + 1) % questions.length);
    // Reset answer timer for next question
    setAnswerTimeLeft(2 * 60);
    setAnswerTimerStarted(false);
  };

  // Function to end session and clear all session data
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);

  const handleEndSession = async () => {
    // Prevent duplicate submissions
    if (isProcessingFeedback || isSessionEnded) {
      console.log('Session already ended or feedback processing in progress');
      return;
    }

    setIsProcessingFeedback(true); // Set processing flag
    setIsSessionEnded(true);
    setIsFeedbackLoading(true);
    setTimerStarted(false); // stop timer
    setAnswerTimerStarted(false); // stop answer timer
    if (window.speechSynthesis) window.speechSynthesis.cancel(); // stop TTS
    sessionStorage.removeItem('liveSessionState');
    sessionStorage.removeItem('liveSessionTimeLeft');
    sessionStorage.removeItem('sessionAnimation'); // Clear animation for next session
    // Only include answered questions
    const answeredPairs = questions
      .map((q, i) => ({ question: q, answer: answers[i] }))
      .filter(pair => pair.answer && pair.answer.trim().length > 0);

    // Check if user provided any answers
    if (answeredPairs.length === 0) {
      console.error('No answers provided during the interview session');
      setShowRatingModal(true);
      setIsProcessingFeedback(false);
      return;
    }

    try {
      const feedback = await generateInterviewFeedback(
        answeredPairs.map(p => p.question),
        answeredPairs.map(p => p.answer)
      );
      const userInputs = (() => {
        try {
          const formData = sessionStorage.getItem('interviewForm');
          return formData ? JSON.parse(formData) : {};
        } catch {
          return {};
        }
      })();

      // Saved before the rating modal opens so the Dashboard always has it.
      // The server attaches the logged-in user and timestamp.
      await saveInterview({
        feedback,
        interviewType: interviewType || userInputs.interviewType || 'Technical',
        questions: answeredPairs.map(p => p.question),
        answers: answeredPairs.map(p => p.answer),
        userInputs,
      });
      setShowRatingModal(true);
    } catch (e) {
      console.error('Error generating or saving feedback:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to generate feedback.';
      alert(errorMessage);
      setShowRatingModal(true);
      setIsFeedbackLoading(false);
    } finally {
      setIsProcessingFeedback(false); // Reset processing flag
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('interviewForm');
    if (saved) {
      try {
        const form = JSON.parse(saved);
        setInterviewType(form.interviewType || '');
      } catch (e: any) { }
    }
  }, []);


  // On mount, restore timeLeft from sessionStorage if available
  useEffect(() => {
    const savedTime = sessionStorage.getItem('liveSessionTimeLeft');
    if (savedTime && !isNaN(Number(savedTime))) {
      setTimeLeft(Number(savedTime));
    }
  }, []);

  // Timer interval effect: decrement timeLeft every second
  useEffect(() => {
    if (!timerStarted) return;
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, timeLeft]);

  // Persist timeLeft to sessionStorage
  useEffect(() => {
    if (timerStarted) {
      sessionStorage.setItem('liveSessionTimeLeft', String(timeLeft));
    }
  }, [timerStarted, timeLeft]);

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start timer only when the first question is displayed
  useEffect(() => {
    if (questions.length > 0 && currentQuestion && !timerStarted) {
      setTimerStarted(true);
    }
  }, [questions.length, currentQuestion, timerStarted]);

  // Answer timer effect - 2 minutes per question
  useEffect(() => {
    if (!answerTimerStarted) return;
    if (answerTimeLeft <= 0) {
      // Auto move to next question when timer expires
      // Only auto-advance if user is actively answering
      if (isAnswering) {
        handleNextQuestion();
      } else {
        // Just stop the timer if user is not answering
        setAnswerTimerStarted(false);
      }
      return;
    }
    const interval = setInterval(() => {
      setAnswerTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [answerTimerStarted, answerTimeLeft, isAnswering]);

  useEffect(() => {
    // Request webcam access
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        setCamAllowed(true);
        setVideoStream(stream);
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setCamAllowed(false);
        setCamError('Webcam access denied or not found.');
      });
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(err => console.log('Video play error:', err));
    }
  }, [videoStream, camAllowed]);

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // No interview form means the user skipped the setup steps
  useEffect(() => {
    if (!sessionStorage.getItem('interviewForm')) {
      navigate('/interview', { replace: true });
    }
  }, [navigate]);

  // Helper to build the interview prompt
  interface InterviewUserData {
    interviewType: string;
    company: string;
    name: string;
    graduation: string;
    role: string;
    experience: string;
    jobDescription: string;
    resumeText: string;
    extraNote?: string;
  }

  function buildInterviewPrompt({ interviewType, company, name, graduation, role, experience, jobDescription, resumeText, extraNote, sessionCount = 0 }: InterviewUserData & { extraNote?: string; sessionCount?: number }) {
    const difficultyNote = sessionCount >= 5 ?
      `\n\nIMPORTANT: This candidate has completed ${sessionCount} previous ${interviewType} interview sessions. Please generate more challenging and advanced questions appropriate for an experienced candidate. Focus on complex scenarios, leadership challenges, crisis management, advanced behavioral situations, and sophisticated problem-solving scenarios.` :
      '';

    return `You are acting as a mock interviewer for a candidate preparing for an interview. The candidate's name is ${name}, and they are a ${graduation} graduate with ${experience} experience. They are applying for the role of ${role} at ${company}. The type of interview you are conducting is: ${interviewType}.

Please tailor your questions based on the interview type:

- If the interview type is Technical, greet the candidate by name and try to use their name at least four times throughout the session. Carefully analyze the resume content and job description provided. Ask the candidate a structured set of questions in the following order:
  1. One introductory question
  2. Two or three questions about experience (if experience is available)
  3. Three project-related questions: one simple, one moderately technical, and one that requires deeper thinking
  4. Up to seven questions based on the candidate's skills from their resume (medium difficulty)
  5. One or two situational or scenario-based questions
  6. Two questions related to the job description
  Resume Content: ${resumeText}
  Job Description: ${jobDescription}

- If the interview type is HR, do not refer to the resume or job description. Ask a total of around ten questions focusing on general HR topics such as self-introduction, strengths and weaknesses, teamwork, time management, handling pressure, conflict resolution, adaptability, career goals, and company fit.

- If the interview type is Behavioral, also ignore the resume and job description. Ask around ten situational or behavioral questions designed to evaluate soft skills and past experiences. Focus on real-world situations where the candidate demonstrated leadership, problem solving, adaptability, initiative, teamwork, or decision-making.

Important Instructions:
- Keep all questions within basic to medium difficulty only.
- Avoid complex case studies, algorithms, deep system design, or highly technical puzzles.
- Focus on real-world, resume-based, and role-relevant questions that freshers or junior professionals can reasonably answer.
- Make the questions sound like a calm, helpful, and curious human interviewer would ask — avoid robotic or scripted tone.
- Don't label the questions with difficulty or type.
- At the end, return only the list of interview questions, one per line, and nothing else. Do not include any extra explanation, headings, or notes.${extraNote ? '\n' + extraNote : ''}${difficultyNote}`;
  }

  // Function to get user's completed interview sessions count
  async function getCompletedSessionsCount(interviewType: string): Promise<number> {
    try {
      if (!interviewType) return 0;
      return await countInterviews(interviewType);
    } catch (error) {
      console.error('Error getting completed sessions count:', error);
      return 0;
    }
  }

  // Function to build continuation questions prompt (no introductory questions)
  function buildContinuationPrompt({ interviewType, company, name, graduation, role, experience, jobDescription, resumeText, sessionCount = 0 }: InterviewUserData & { sessionCount?: number }) {
    const difficultyNote = sessionCount >= 5 ?
      `\n\nIMPORTANT: This candidate has completed ${sessionCount} previous ${interviewType} interview sessions. Please generate more challenging and advanced questions appropriate for an experienced candidate. Focus on complex scenarios, leadership challenges, crisis management, advanced behavioral situations, and sophisticated problem-solving scenarios.` :
      '';

    return `You are continuing a mock interview session. The candidate's name is ${name}, and they are a ${graduation} graduate with ${experience} experience. They are applying for the role of ${role} at ${company}. The type of interview is: ${interviewType}.

The candidate has already answered several questions and we need to continue with fresh questions. Please generate NEW questions that are different from typical introductory questions.

Please tailor your questions based on the interview type:

- If the interview type is Technical, focus on:
  * Advanced technical questions based on the candidate's skills from their resume
  * Project-specific questions that require deeper technical understanding
  * Scenario-based technical problems
  * Questions about specific technologies mentioned in their resume
  * Problem-solving questions related to their field
  Resume Content: ${resumeText}
  Job Description: ${jobDescription}

- If the interview type is HR, focus on:
  * Advanced behavioral scenarios
  * Leadership and management situations
  * Conflict resolution in complex scenarios
  * Career development and growth questions
  * Company culture and values alignment

- If the interview type is Behavioral, focus on:
  * Complex situational questions
  * Leadership challenges
  * Crisis management scenarios
  * Team dynamics in difficult situations
  * Innovation and creativity examples

Important Instructions:
- DO NOT include any introductory questions like "Hi", "Tell me about yourself", or basic introduction questions
- Focus on medium to advanced difficulty questions
- Make questions specific to the candidate's background and role
- Avoid repetition of common basic questions
- Keep questions relevant to the interview type
- Return only the list of questions, one per line, no explanations or formatting${difficultyNote}`;
  }

  // Generate the interview questions with the local Gemma model
  async function generateInterviewQuestions(userData: InterviewUserData) {
    // Get completed sessions count for this interview type
    const sessionCount = await getCompletedSessionsCount(userData.interviewType);
    console.log(`Completed ${sessionCount} sessions for ${userData.interviewType} interviews`);

    const prompt = buildInterviewPrompt({ ...userData, sessionCount });
    const text = await generateText(prompt);
    return parseQuestionList(text);
  }

  // State for loading and error
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [sessionCount, setSessionCount] = useState<number>(0);

  // Prevents a duplicate request (React StrictMode runs effects twice in dev)
  const generatingRef = useRef(false);

  // When there are no questions (new session, or after the rating modal resets), ask Gemma for them
  useEffect(() => {
    if (questions.length > 0) return;
    if (generatingRef.current) return;
    // Gather user data from sessionStorage/interviewForm
    const formRaw = sessionStorage.getItem('interviewForm');
    if (!formRaw) return;
    let form;
    try { form = JSON.parse(formRaw); } catch (e: any) { return; }
    generatingRef.current = true;
    setLoadingQuestions(true);
    setQuestionError('');

    // Get session count and generate questions
    getCompletedSessionsCount(form.interviewType)
      .then(count => {
        setSessionCount(count);
        return generateInterviewQuestions({
          interviewType: form.interviewType,
          company: form.company,
          name: form.name,
          graduation: form.graduation || '',
          role: form.jobRole,
          experience: form.experience,
          jobDescription: form.jobDescription,
          resumeText: form.resumeText || ''
        });
      })
      .then(qs => setQuestions(qs))
      .catch(err => setQuestionError(err.message))
      .finally(() => {
        generatingRef.current = false;
        setLoadingQuestions(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  // Show the completed-session count for this interview type in the header (also after a refresh)
  useEffect(() => {
    try {
      const form = JSON.parse(sessionStorage.getItem('interviewForm') || '{}');
      if (form.interviewType) getCompletedSessionsCount(form.interviewType).then(setSessionCount);
    } catch {
      // ignore malformed form data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TTS: Speech-to-Text logic
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Start STT
  const startSTT = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };
    recognition.onerror = (event: any) => {
      // Optionally handle errors
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsAnswering(true);
    // Start the 2-minute answer timer
    setAnswerTimerStarted(true);
  };

  // Stop STT
  const stopSTT = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsAnswering(false);
    // Stop the answer timer
    setAnswerTimerStarted(false);
    // Save transcript as answer
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentQuestionIdx] = transcript;
      return updated;
    });
    setTranscript('');
  };

  // Stop STT when question changes or on Next
  useEffect(() => {
    if (isAnswering) {
      stopSTT();
    }
    // Reset answer timer when question changes
    setAnswerTimeLeft(2 * 60);
    setAnswerTimerStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIdx]);

  useEffect(() => {
    if (timerStarted && timeLeft === 0) {
      handleEndSession();
    }
  }, [timerStarted, timeLeft]);

  // 1. Add state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 2. Update speakQuestion
  function speakQuestion(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.lang = 'en-US';
    setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  useEffect(() => {
    if (currentQuestion) {
      speakQuestion(currentQuestion);
    }
    return () => window.speechSynthesis && window.speechSynthesis.cancel();
  }, [currentQuestion]);

  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (isSpeaking) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.stop();
    }
  }, [isSpeaking]);

  // Function to generate continuation questions (no introductory questions)
  async function generateContinuationQuestions(userData: InterviewUserData) {
    // Get completed sessions count for this interview type
    const sessionCount = await getCompletedSessionsCount(userData.interviewType);
    console.log(`Completed ${sessionCount} sessions for ${userData.interviewType} interviews (continuation)`);

    const prompt = buildContinuationPrompt({ ...userData, sessionCount });
    const text = await generateText(prompt);
    return parseQuestionList(text);
  }

  const handleGenerateMoreQuestions = async () => {
    setLoadingQuestions(true);
    setQuestionError('');
    const formRaw = sessionStorage.getItem('interviewForm');
    if (!formRaw) {
      setLoadingQuestions(false);
      return;
    }
    let form;
    try { form = JSON.parse(formRaw); } catch (e: any) { setLoadingQuestions(false); return; }

    try {
      const newQuestions = await generateContinuationQuestions({
        interviewType: form.interviewType,
        company: form.company,
        name: form.name,
        graduation: form.graduation || '',
        role: form.jobRole,
        experience: form.experience,
        jobDescription: form.jobDescription,
        resumeText: form.resumeText || ''
      });
      setQuestions(prev => [...prev, ...newQuestions]);
      console.log('Added continuation questions:', newQuestions);
    } catch (err: any) {
      setQuestionError(err.message || 'Failed to generate more questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  async function generateInterviewFeedback(questions: string[], answers: string[]) {
    // Get interview type from sessionStorage
    const formRaw = sessionStorage.getItem('interviewForm');
    let interviewType = 'Technical';
    if (formRaw) {
      try {
        const form = JSON.parse(formRaw);
        interviewType = form.interviewType || 'Technical';
      } catch (e) {
        console.error('Error parsing interview form:', e);
      }
    }

    // Create different prompts based on interview type
    let prompt = '';
    let jsonStructure = '';

    if (interviewType === 'HR' || interviewType === 'Behavioral') {
      // HR and Behavioral interviews - focus on soft skills, no technical scores
      prompt = `
You are acting as an AI interview evaluator for an ${interviewType} interview. The user has completed a mock interview session. During the session, the following data was collected:

- A series of interview questions presented to the candidate
- Transcribed answers spoken by the candidate in response to each question

IMPORTANT: Only analyze the question-answer pairs provided below. Do NOT analyze questions that the user did not answer. Do NOT make up or assume answers for questions that were not answered by the user.

Now, your task is to analyze and evaluate ONLY the answered questions in detail. For each question-answer pair provided, provide a structured and clear evaluation based on the following metrics:

1. Individual Communication Score: (Scale of 1 to 10)
2. Fluency & Grammar Comments:
3. Behavioral Relevance Comment:

Do this for each individual question and response that was actually answered.

After you finish evaluating all answered question-answer pairs, also provide a final overall interview summary, including:

- Overall Score (Scale of 1 to 100)
- Overall Communication Score (0–100)
- Overall Logical & Behavioral Score (0–100) - Combined score for logical thinking and behavioral responses
- General feedback or suggestions to improve their overall performance (list all suggestions at the end, not per question).

Here is the data (only questions that were answered):
${questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]}`).join('\n\n')}

Please return the full output as a valid JSON object structured like this:

{
  "overallScore": 85,
  "communicationScore": 88,
  "logicalBehavioralScore": 82,
  "interviewSummary": "Short paragraph summary...",
  "overallSuggestions": ["...", "..."],
  "questions": [
    {
      "question": "Tell me about a challenging situation you faced.",
      "answer": "User's full transcribed answer...",
      "communicationScore": 8,
      "fluencyComment": "Spoke fluently with a few hesitations.",
      "behavioralComment": "Demonstrated good problem-solving approach."
    }
  ]
}

Note: Only include questions that were actually answered by the user. Do not include questions that were not answered.

IMPORTANT: Return ONLY the JSON object above. Do NOT add any extra text, explanation, markdown, or formatting. Do NOT use triple backticks. Do NOT add any text before or after the JSON. The response must be a valid JSON object only.`;
    } else {
      // Technical interviews - include technical scores
      prompt = `
You are acting as an AI interview evaluator for a Technical interview. The user has completed a mock interview session. During the session, the following data was collected:

- A series of interview questions presented to the candidate
- Transcribed answers spoken by the candidate in response to each question

IMPORTANT: Only analyze the question-answer pairs provided below. Do NOT analyze questions that the user did not answer. Do NOT make up or assume answers for questions that were not answered by the user.

Now, your task is to analyze and evaluate ONLY the answered questions in detail. For each question-answer pair provided, provide a structured and clear evaluation based on the following metrics:

1. Individual Communication Score: (Scale of 1 to 10)
2. Individual Technical Score: (Scale of 1 to 10)
3. Fluency & Grammar Comments:
4. Technical Relevance Comment:

Do this for each individual question and response that was actually answered.

After you finish evaluating all answered question-answer pairs, also provide a final overall interview summary, including:

- Overall Score (Scale of 1 to 100)
- Overall Communication Score (0–100)
- Overall Technical Score (0–100)
- General feedback or suggestions to improve their overall performance (list all suggestions at the end, not per question).

Here is the data (only questions that were answered):
${questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]}`).join('\n\n')}

Please return the full output as a valid JSON object structured like this:

{
  "overallScore": 85,
  "communicationScore": 88,
  "technicalScore": 82,
  "interviewSummary": "Short paragraph summary...",
  "overallSuggestions": ["...", "..."],
  "questions": [
    {
      "question": "Tell me about a project you worked on.",
      "answer": "User's full transcribed answer...",
      "communicationScore": 8,
      "technicalScore": 7,
      "fluencyComment": "Spoke fluently with a few hesitations.",
      "techComment": "Answered with basic understanding, could go deeper."
    }
  ]
}

Note: Only include questions that were actually answered by the user. Do not include questions that were not answered.

IMPORTANT: Return ONLY the JSON object above. Do NOT add any extra text, explanation, markdown, or formatting. Do NOT use triple backticks. Do NOT add any text before or after the JSON. The response must be a valid JSON object only.`;
    }

    // The schema makes Ollama return exactly the fields the Dashboard reads
    const softSkills = interviewType === 'HR' || interviewType === 'Behavioral';
    return generateJson<Record<string, unknown>>(prompt, feedbackSchema(softSkills));
  }

  // Cleanup effect to reset processing flags on unmount
  useEffect(() => {
    return () => {
      setIsProcessingFeedback(false);
      setIsSessionEnded(false);
      setIsFeedbackLoading(false);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#05050A] text-white overflow-hidden flex flex-col font-sans selection:bg-violet-500/30">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + LIVE indicator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-70 group-hover:opacity-100 blur transition-all duration-300"></div>
                  <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <BrainCircuit className="h-5 w-5 text-white" />
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Prep</span>
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Mate</span>
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Right: Session count + End Session */}
            <div className="flex items-center gap-4">
              {sessionCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-violet-400 font-medium">{sessionCount} sessions completed</span>
                </div>
              )}
              <button
                onClick={handleEndSession}
                disabled={isProcessingFeedback || isSessionEnded}
                className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
                      ${isProcessingFeedback || isSessionEnded
                    ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}
                    `}
              >
                <StopCircle className="w-5 h-5" />
                {isProcessingFeedback ? 'Processing...' : isSessionEnded ? 'Ended' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar: Interview Type and Timer */}
      <div className="bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full bg-violet-500"></div>
              <span className="text-sm text-white/60">Interview Type:</span>
              <span className="text-sm font-semibold text-violet-400">{interviewType || 'Technical'}</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-md font-mono font-bold text-red-400">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full relative z-10">

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* AI Avatar Card */}
            <div className="relative bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl group h-[350px]">
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-xs font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                AI Interviewer
              </div>

              {/* Pulsating Circular Rings when Speaking */}
              {isSpeaking && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-[200px] h-[200px] rounded-full border-4 border-violet-500/40 animate-ping"></div>
                    <div className="absolute w-[250px] h-[250px] rounded-full border-4 border-purple-500/30 animate-ping" style={{ animationDelay: '0.3s' }}></div>
                    <div className="absolute w-[300px] h-[300px] rounded-full border-4 border-indigo-500/20 animate-ping" style={{ animationDelay: '0.6s' }}></div>
                  </div>
                  <div className="absolute inset-0 bg-violet-500/10 rounded-3xl animate-pulse"></div>
                </>
              )}

              {/* Lottie Container */}
              <div className={`relative z-10 w-full h-full flex items-center justify-center p-8 transition-all duration-300 ${isSpeaking ? 'opacity-100 scale-105' : 'opacity-90 scale-100'
                } group-hover:opacity-100`}>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={childboyAnimation}
                  loop={true}
                  autoplay={true}
                  className="max-h-[80%] max-w-[80%]"
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="relative bg-slate-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[200px] flex flex-col">
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-lg border border-violet-500/30 shadow-lg shadow-violet-500/10">
                  <span className="text-sm font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">Q{currentQuestionIdx + 1}</span>
                  <span className="text-sm text-slate-300">of {questions.length}</span>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="flex items-center justify-center flex-1 mt-6">
                  <div className="text-slate-400 animate-pulse text-sm text-center" role="status">
                    Gemma is preparing your questions...
                    <br />
                    <span className="text-xs">Running locally, this can take up to a minute.</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 mt-6">
                  <h2 className="text-xl md:text-lg font-semibold text-white leading-relaxed">
                    {currentQuestion}
                  </h2>
                  {questionError && <p className="text-red-400 text-sm mt-3">{questionError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* User Webcam Card */}
            <div className="relative bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl h-[350px]">
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-xs font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-green-400" />
                You
              </div>

              {camAllowed === true ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  {camError || 'Camera Access Required'}
                </div>
              )}
            </div>

            {/* Your Answer / Transcript Card */}
            <div className="relative bg-slate-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[200px] flex flex-col">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {isAnswering && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                <span className="text-md font-semibold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">Your Answer</span>
              </div>
              {isAnswering && answerTimerStarted && (
                <div className="absolute top-4 right-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${answerTimeLeft <= 30 ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                    <Clock className="w-3 h-3" />
                    <span className={`text-xs font-mono font-bold ${answerTimeLeft <= 30 ? 'text-red-400' : 'text-blue-400'}`}>
                      {formatTime(answerTimeLeft)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex-1 mt-6">
                {isAnswering ? (
                  <p className="text-base text-white/90 leading-relaxed">{transcript || "Listening..."}</p>
                ) : (
                  <p className="text-slate-500 text-sm">Click "Start Answering" to begin recording your response</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Control Buttons */}
        <div className="flex items-center justify-center gap-3 mt-6">

          {/* Repeat Button */}
          <button
            onClick={() => speakQuestion(currentQuestion)}
            disabled={isSessionEnded}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Repeat Question"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-medium">Repeat Question</span>
          </button>

          {/* Record / Stop Button (Primary) */}
          {!isAnswering ? (
            <button
              onClick={startSTT}
              disabled={isSessionEnded || loadingQuestions}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              <span>Start Answering</span>
            </button>
          ) : (
            <button
              onClick={stopSTT}
              disabled={isSessionEnded || loadingQuestions}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Answering</span>
            </button>
          )}

          {/* Next Question */}
          <button
            onClick={handleNextQuestion}
            disabled={isSessionEnded || loadingQuestions || (currentQuestionIdx >= questions.length - 1 && timeLeft > 0 && !loadingQuestions)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Question"
          >
            <span className="font-medium">Next Question</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          {/* Generate More Questions (Contextual) */}
          {currentQuestionIdx >= questions.length - 1 && timeLeft > 0 && !loadingQuestions && !isSessionEnded && (
            <button
              onClick={handleGenerateMoreQuestions}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all"
            >
              Generate More
            </button>
          )}

        </div>
      </main>

      <style>{`
        /* Hide scrollbar but keep functionality */
        * {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        *::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>


      {/* Feedback Modal */}
      {/* Local feedback generation can take a while, so make it obvious something is happening */}
      {isProcessingFeedback && !showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
            <h2 className="text-lg font-bold text-white mb-1">Reviewing your answers</h2>
            <p className="text-sm text-slate-300">Gemma is preparing your feedback locally. This can take up to a minute.</p>
          </div>
        </div>
      )}

      {showRatingModal && (
        <Feedback onClose={() => {
          setShowRatingModal(false);
          setQuestions([]);
          setAnswers([]);
          setCurrentQuestionIdx(0);
          setTimeLeft(20 * 60);
          setTimerStarted(false);
          setAnswerTimeLeft(2 * 60);
          setAnswerTimerStarted(false);
          setIsSessionEnded(false);
          setTranscript("");
          sessionStorage.removeItem('liveSessionState');
          sessionStorage.removeItem('liveSessionTimeLeft');
        }} />
      )}
    </div>
  );
}