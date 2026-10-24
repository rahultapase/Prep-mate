import React, { useState, useEffect } from 'react';
import { BrainCircuit, UploadCloud, FileText, User, Briefcase, Building2, Layers, ClipboardList, Plus, Minus, ArrowLeft, ArrowRight, FileUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInputSanitization } from '../utils/sanitization';
import { useAuth } from '../hooks/useAuth';
import { extractPdfText, PdfResumeError } from '../utils/pdfResume';

const interviewTypes = ['Technical', 'HR', 'Managerial'];
const RESUME_MAX_LENGTH = 10000;

// Textarea sanitization: strip HTML tags and risky characters but keep spacing
const sanitizeTextarea = (value: string) =>
  value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'`=]/g, '') // Remove dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

export default function Interview() {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    name: '',
    jobRole: '',
    company: '',
    experience: '0',
    interviewType: '',
    jobDescription: '',
    resumeText: '',
  });
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { sanitizeInput, validateInput } = useInputSanitization();

  useEffect(() => {
    // Clear form data when component mounts (new interview)
    sessionStorage.removeItem('interviewForm');
    
    // Reset form to default values
    setForm({
      name: '',
      jobRole: '',
      company: '',
      experience: '0',
      interviewType: '',
      jobDescription: '',
      resumeText: '',
    });
  }, []);

  useEffect(() => {
    // Save form data to sessionStorage on change
    sessionStorage.setItem('interviewForm', JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    // On unmount, clear form data only if not navigating to system-check
    return () => {
      const nextPath = window.location.pathname;
      if (!nextPath.includes('/system-check')) {
        sessionStorage.removeItem('interviewForm');
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input based on field type
    let sanitizedValue = value;
    
    switch (name) {
      case 'name':
      case 'jobRole':
      case 'company':
        // For text inputs, only remove HTML tags and dangerous characters but preserve spaces
        sanitizedValue = value
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/[<>"'`=/]/g, '') // Remove dangerous characters but NOT ampersands or spaces
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, ''); // Remove event handlers
        break;
      case 'jobDescription':
      case 'resumeText': {
        sanitizedValue = sanitizeTextarea(value);
        break;
      }
      case 'experience':
        // Only allow numbers and empty string
        if (value === '' || /^\d+$/.test(value)) {
          const numValue = parseInt(value) || 0;
          sanitizedValue = numValue > 50 ? '50' : value;
        } else {
          sanitizedValue = form.experience;
        }
        break;
      case 'interviewType': {
        // For select field, validate against allowed options
        if (!interviewTypes.includes(value) && value !== '') {
          sanitizedValue = '';
        }
        break;
      }
      default:
        // Default sanitization for unknown fields
        sanitizedValue = sanitizeInput(value, 'text');
    }
    
    setForm(f => ({ ...f, [name]: sanitizedValue }));
  };

  // PDF resume upload: the text is extracted in the browser and fills the textarea for review
  const [pdfState, setPdfState] = useState({ loading: false, fileName: '', error: '', warning: '' });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;

    setPdfState({ loading: true, fileName: file.name, error: '', warning: '' });
    try {
      const text = sanitizeTextarea(await extractPdfText(file)).trim();
      if (!text) {
        throw new PdfResumeError('This PDF has no selectable text, please paste your resume.');
      }
      const trimmed = text.length > RESUME_MAX_LENGTH;
      setForm(f => ({ ...f, resumeText: text.slice(0, RESUME_MAX_LENGTH) }));
      setError('');
      setPdfState({
        loading: false,
        fileName: file.name,
        error: '',
        warning: trimmed
          ? `Your resume had ${text.length.toLocaleString()} characters, so it was trimmed to ${RESUME_MAX_LENGTH.toLocaleString()}. Please review it below.`
          : '',
      });
    } catch (err) {
      setPdfState({
        loading: false,
        fileName: '',
        error: err instanceof PdfResumeError ? err.message : 'Could not read this PDF. Please paste your resume instead.',
        warning: '',
      });
    }
  };

  const incrementExperience = () => {
    const current = parseInt(form.experience) || 0;
    if (current < 50) {
      setForm(f => ({ ...f, experience: String(current + 1) }));
    }
  };

  const decrementExperience = () => {
    const current = parseInt(form.experience) || 0;
    if (current > 0) {
      setForm(f => ({ ...f, experience: String(current - 1) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize all form data before submission
    const validationResults = {
      name: validateInput(form.name, { type: 'text', required: true, maxLength: 100 }),
      jobRole: validateInput(form.jobRole, { type: 'text', required: true, maxLength: 100 }),
      company: validateInput(form.company, { type: 'text', required: false, maxLength: 100 }),
      jobDescription: validateInput(form.jobDescription, { type: 'textarea', required: false, maxLength: 8000 }),
      resumeText: validateInput(form.resumeText, { type: 'textarea', required: true, maxLength: 10000 })
    };
    
    // Check for validation errors
    const errors = Object.entries(validationResults)
      .filter(([, result]) => !result.isValid)
      .map(([field, result]) => `${field}: ${result.error}`)
      .join(', ');
    
    if (errors) {
      setError(`Please fix the following errors: ${errors}`);
      return;
    }
    
    // Check if resume is uploaded
    if (!form.resumeText.trim()) {
      setError('Please paste your resume or upload a PDF before proceeding.');
      return;
    }
    
    // All validation passed, proceed to next step
    navigate('/system-check');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-x-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6366f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
      `}</style>
      {/* Enhanced background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-900/10 to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      <div className="absolute top-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      
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
                  <BrainCircuit className="h-6 w-6 text-white" />
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
      
      <main className="flex-1 flex items-center justify-center px-4 py-6 pt-24 relative z-10 w-full overflow-auto">
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                1
              </div>
              <span className="text-violet-400 font-medium text-sm">Details</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-sm font-semibold">
                2
              </div>
              <span className="text-slate-500 font-medium text-sm">Check</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-sm font-semibold">
                3
              </div>
              <span className="text-slate-500 font-medium text-sm">Interview</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Configure Session
            </h1>
            <p className="text-slate-400 text-sm">Customize the AI persona and context for your mock interview.</p>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-xs">!</span>
                </div>
                <span className="text-red-300 text-xs">{error}</span>
              </div>
            )}
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Job Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Job Role
                </label>
                <input
                  type="text"
                  name="jobRole"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  placeholder="e.g., Software Engineer"
                  value={form.jobRole}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Company <span className="text-slate-600 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="company"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  placeholder="Target company"
                  value={form.company}
                  onChange={handleChange}
                />
              </div>

              {/* Experience Level with Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Years of Experience
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrementExperience}
                    className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-violet-500/50 text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    name="experience"
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-center text-lg font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    placeholder="0"
                    value={form.experience}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={incrementExperience}
                    className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-violet-500/50 text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interview Type */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Interview Type
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-left text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all flex items-center justify-between"
                  >
                    <span className={form.interviewType ? 'text-white' : 'text-slate-500'}>
                      {form.interviewType || 'Select interview type'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                      {interviewTypes.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, interviewType: opt }));
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-left text-white hover:bg-violet-600/20 transition-colors flex items-center justify-between"
                        >
                          <span>{opt}</span>
                          {form.interviewType === opt && (
                            <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Job Description <span className="text-slate-600 text-xs">(Optional)</span>
                </label>
                <textarea
                  name="jobDescription"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none custom-scrollbar"
                  placeholder="Paste the job description..."
                  rows={3}
                  value={form.jobDescription}
                  onChange={handleChange}
                  maxLength={8000}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#6366f1 transparent'
                  }}
                />
                <div className="flex justify-end text-xs text-slate-500">
                  <span>{form.jobDescription.length}/8000</span>
                </div>
              </div>

              {/* Resume */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="resumeText" className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
                    Resume Content
                  </label>
                  {/* The visible label is the button; the real file input is visually hidden but still focusable */}
                  <label
                    htmlFor="resumePdf"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-within:ring-2 focus-within:ring-violet-500/60 ${
                      pdfState.loading
                        ? 'cursor-wait text-slate-400 bg-slate-800/50 border-slate-700'
                        : 'cursor-pointer text-violet-300 bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50'
                    }`}
                  >
                    {pdfState.loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      : <FileUp className="w-3.5 h-3.5" aria-hidden="true" />}
                    {pdfState.loading ? 'Reading PDF...' : 'Upload PDF'}
                    <input
                      id="resumePdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={handleResumeUpload}
                      disabled={pdfState.loading}
                      aria-describedby="resumePdfStatus"
                    />
                  </label>
                </div>
                <textarea
                  id="resumeText"
                  name="resumeText"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none custom-scrollbar"
                  placeholder="Paste your resume content or upload a PDF..."
                  rows={3}
                  value={form.resumeText}
                  onChange={handleChange}
                  required
                  maxLength={RESUME_MAX_LENGTH}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#6366f1 transparent'
                  }}
                />
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div id="resumePdfStatus" aria-live="polite" className="min-h-[1rem]">
                    {pdfState.error && <span className="text-red-400">{pdfState.error}</span>}
                    {!pdfState.error && pdfState.warning && <span className="text-amber-400">{pdfState.warning}</span>}
                    {!pdfState.error && !pdfState.warning && pdfState.fileName && !pdfState.loading && (
                      <span className="text-green-400">Loaded text from {pdfState.fileName}. You can edit it below.</span>
                    )}
                  </div>
                  <span className="text-slate-500 shrink-0">{form.resumeText.length}/{RESUME_MAX_LENGTH}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-300 text-base bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Dashboard</span>
                </button>
                <button
                  type="submit"
                  className="group relative px-8 py-3 rounded-xl font-semibold text-white text-base bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] overflow-hidden flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                  <span className="relative z-10">Continue to System Check</span>
                  <ArrowRight className="w-5 h-5 relative z-10" />
                </button>
              </div>
            </div>
          </div>
        </form>
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