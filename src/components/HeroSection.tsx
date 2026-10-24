import { useState, useEffect } from 'react';
import { BrainCircuit, User, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HeroSection= () =>{
  const navigate = useNavigate();
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = "Tell me about a challenging project you worked on and how you overcame obstacles to complete it successfully.";

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 30);

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-900/10 to-transparent"></div>
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]"></div>
      
      {/* Floating orbs with animation */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Hero Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/20 backdrop-blur-sm shadow-lg shadow-violet-500/10">
              <div className="relative">
                <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                <div className="absolute inset-0 bg-violet-400 blur-sm opacity-50 animate-pulse"></div>
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                AI-Powered Interview Platform
              </span>
              <Zap className="h-3 w-3 text-violet-400" />
            </div>

            {/* Enhanced Heading */}
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-white">Ace Your Next</span>
                <br />
                <span className="text-white">Interview with</span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent animate-gradient">
                    PrepMate
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full blur-sm"></div>
                </span>
              </h1>
              
              <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
                Build confidence and outperform competitors with{' '}
                <span className="text-white font-semibold">personalized AI interview practice</span>{' '}
                tailored to your skills and target role, complete with instant feedback.
              </p>
            </div>

            {/* Enhanced CTA Button */}
            <div className="flex flex-col gap-6">
              <button 
                onClick={() => navigate('/login')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white text-lg bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-2xl shadow-violet-500/30 transition-all duration-300 hover:shadow-violet-500/50 hover:scale-105 overflow-hidden w-fit"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                <span className="relative z-10">Start Practicing</span>
                <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="font-medium">100% Private & Secure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Enhanced AI Interview Simulator */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Glow effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-3xl opacity-20 blur-3xl"></div>
            
            {/* Main interview card */}
            <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl overflow-hidden">
              {/* Animated gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 opacity-20 blur-xl"></div>
              
              {/* Header with enhanced styling */}
              <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">AI Interview Session</h3>
                      <p className="text-violet-100 text-xs">Powered by Advanced AI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-400/30">
                    <div className="relative">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Content with improved spacing */}
              <div className="relative p-8 space-y-6">
                {/* Avatars with enhanced animations */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-violet-500/20 rounded-full blur-lg animate-pulse"></div>
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <BrainCircuit className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm font-medium mt-2">AI Interviewer</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-slate-500/20 rounded-full blur-lg"></div>
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shadow-lg">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm font-medium mt-2">You</span>
                  </div>
                </div>

                {/* Question card with enhanced styling */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                  <div className="relative bg-slate-950/80 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-violet-500 min-h-[120px] flex items-start shadow-lg">
                    <p className="text-white text-base leading-relaxed">
                      {displayedText}
                      <span className={`inline-block w-0.5 h-5 bg-violet-400 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`}></span>
                    </p>
                  </div>
                </div>

                {/* Response area with enhanced design */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-semibold">Your Response</span>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-300 text-xs font-mono">00:42</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/80 backdrop-blur-sm rounded-2xl p-5 min-h-[70px] flex items-center border border-slate-800">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse"></div>
                      <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>

                {/* Enhanced controls */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-3">
                    {[
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/></svg>,
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>,
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
                    ].map((icon, i) => (
                      <button key={i} className="group w-11 h-11 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 hover:border-violet-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110">
                        <div className="text-white group-hover:text-violet-400 transition-colors">
                          {icon}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button className="group relative w-11 h-11 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-red-500/30 hover:shadow-red-500/50">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  );
}