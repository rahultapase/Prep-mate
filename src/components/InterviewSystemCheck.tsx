import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Mic, Video, CheckCircle, XCircle, Info, Lightbulb, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function InterviewSystemCheck() {
  const { logout } = useAuth();
  const [micAllowed, setMicAllowed] = useState<null | boolean>(null);
  const [camAllowed, setCamAllowed] = useState<null | boolean>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState('');
  const [camError, setCamError] = useState('');
  const [isChrome, setIsChrome] = useState<null | boolean>(null);
  const [browserError, setBrowserError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check browser type - Support all modern browsers
  const checkBrowser = () => {
    const userAgent = navigator.userAgent;
    // Check if it's a modern browser (Chrome, Edge, Firefox, Brave, Opera, etc.)
    const isModernBrowser = !!/Chrome|Firefox|Safari|Edge|Edg|OPR/.test(userAgent);

    if (isModernBrowser) {
      setIsChrome(true);
    } else {
      setIsChrome(false);
      setBrowserError('Please use a modern browser (Chrome, Firefox, Edge, Brave, Opera).');
    }
  };

  useEffect(() => {
    // Check browser first
    checkBrowser();

    // Store Gemini API key from environment
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      sessionStorage.setItem('geminiApiKey', apiKey);
    }

    // Parallel device checks for faster loading
    const checkDevices = async () => {
      try {
        // Check microphone and webcam in parallel
        const [audioStream, videoStream] = await Promise.allSettled([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          navigator.mediaDevices.getUserMedia({ video: true })
        ]);

        // Handle audio result
        if (audioStream.status === 'fulfilled') {
          setMicAllowed(true);
          audioStream.value.getTracks().forEach(track => track.stop());
        } else {
          setMicAllowed(false);
          setMicError('Microphone access denied or not found.');
        }

        // Handle video result
        if (videoStream.status === 'fulfilled') {
          setCamAllowed(true);
          setVideoStream(videoStream.value);
        } else {
          setCamAllowed(false);
          setCamError('Webcam access denied or not found.');
        }
      } catch (error) {
        console.error('Device check error:', error);
      }
    };

    checkDevices();
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

  useEffect(() => {
    let audioStream: MediaStream | null = null;
    if (micAllowed === null) return;
    if (micAllowed === false) return;
    // Start audio waveform
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioStream = stream;
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new (AudioContextClass as typeof AudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function draw() {
        analyser.getByteTimeDomainData(dataArray);
        setAudioData(new Uint8Array(dataArray));
        animationRef.current = requestAnimationFrame(draw);
      }
      draw();
    });
    return () => {
      if (audioStream) audioStream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [micAllowed]);

  useEffect(() => {
    if (!canvasRef.current || !audioData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#38bdf8'; // sky-400
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Heartbeat style: use amplitude to create sharp peaks
    const sliceWidth = canvas.width / audioData.length;
    let x = 0;
    for (let i = 0; i < audioData.length; i++) {
      // Normalize and exaggerate for heart pulse effect
      const v = (audioData[i] - 128) / 128;
      // Heartbeat: sharp peak at center, smooth elsewhere
      let y = canvas.height / 2;
      if (Math.abs(v) > 0.2) {
        // Create a sharp peak for strong audio
        y -= v * canvas.height * 0.45 * (Math.abs(v) > 0.7 ? 1.5 : 1);
      } else {
        // Smooth baseline
        y -= v * canvas.height * 0.15;
      }
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
  }, [audioData]);



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-x-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-900/10 to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      <div className="absolute top-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Authenticated Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-violet-500/5 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            <div
              onClick={() => navigate('/home')}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-70 group-hover:opacity-100 blur transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Prep
                </span>
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Mate
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors relative group"
              >
                <span className="relative z-10">Home</span>
                <span className="absolute inset-0 bg-slate-800/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors relative group"
              >
                <span className="relative z-10">Dashboard</span>
                <span className="absolute inset-0 bg-slate-800/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-4 pt-24 relative z-10 w-full">
        <div className="w-full max-w-5xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                1
              </div>
              <span className="text-slate-500 font-medium text-sm">Details</span>
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                2
              </div>
              <span className="text-violet-400 font-medium text-sm">Check</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-sm font-semibold">
                3
              </div>
              <span className="text-slate-500 font-medium text-sm">Interview</span>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5">
              <h1 className="text-xl font-bold text-center text-white mb-4">System Check</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Left Column: Microphone and Browser */}
                <div className="flex flex-col gap-3">
                  {/* Microphone Check */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">Microphone</span>
                      </div>
                      {micAllowed === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {micAllowed === false && <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="rounded-lg bg-black/40 w-full h-24 flex flex-col items-center justify-center relative pt-2 pl-3">
                      {micAllowed === true ? (
                        <div className="w-full flex flex-col items-center gap-1">
                          <span className="text-sm text-green-400 font-semibold">Working!</span>
                          <canvas ref={canvasRef} width={220} height={20} className="w-full block" style={{ pointerEvents: 'none', display: 'block' }} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 text-center px-2">{micError || 'Checking...'}</span>
                      )}
                    </div>
                  </div>

                  {/* Browser Check */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">Browser</span>
                      </div>
                      {isChrome === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {isChrome === false && <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="rounded-lg bg-black/40 w-full h-24 flex items-center justify-center">
                      {isChrome === true ? (
                        <span className="text-sm text-green-400 font-semibold">Browser compatible!</span>
                      ) : isChrome === false ? (
                        <span className="text-xs text-red-400 text-center px-2">{browserError}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Checking...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Webcam */}
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-white">Webcam</span>
                    </div>
                    {camAllowed === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {camAllowed === false && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="rounded-lg overflow-hidden bg-black/40 w-full h-60 flex items-center justify-center">
                    {camAllowed === true ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400 text-center px-2">{camError || 'Checking...'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions and Tips in 2 columns - Improved Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-3 border border-violet-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Info className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <span className="text-sm font-bold text-violet-300">Quick Instructions</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5">•</span>
                      <span>Allow camera & mic permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5">•</span>
                      <span>Speak to test microphone</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5">•</span>
                      <span>Face clearly visible in webcam</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-amber-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-sm font-bold text-amber-300">Pro Tips</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Use headphones to reduce echo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Position camera at eye level</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Stay calm and confident!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer with Buttons */}
            <div className="px-5 pb-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/interview')}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-slate-300 text-sm bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all duration-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  className="group relative px-8 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => navigate('/livesession')}
                  disabled={isChrome === false || camAllowed !== true || micAllowed !== true}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                  <span className="relative z-10">Start Interview</span>
                </button>
              </div>
            </div>
          </div>
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
    </div>
  );
}