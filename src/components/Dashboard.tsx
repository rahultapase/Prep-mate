import React, { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BrainCircuit, User, Pencil, Trash2, X, AlertCircle, CheckCircle2, GraduationCap, Calendar, BookOpen, Briefcase, Target, Loader2, Mail, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { setDoc, doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import Footer from './Footer';

interface QuestionDetail {
  question: string;
  answer: string;
  communicationScore?: number;
  fluencyComment?: string;
  technicalScore?: number;
  techComment?: string;
}

interface InterviewHistoryItem {
  id: string;
  feedback: {
    overallScore?: number;
    strengths?: string[];
    improvements?: string[];
    interviewType?: string;
    [key: string]: unknown;
  };
  interviewType: string;
  questions?: QuestionDetail[];
  answers?: string[];
  rawQuestions?: string[];
  rawAnswers?: string[];
  overallScore?: number;
  communicationScore?: number;
  technicalScore?: number;
  logicalScore?: number;
  behavioralScore?: number;
  logicalBehavioralScore?: number;
  interviewSummary?: string;
  overallSuggestions?: string[];
  userInputs?: {
    name: string;
    jobRole: string;
    company: string;
    experience: string;
    interviewType: string;
    jobDescription: string;
    resumeText: string;
    email?: string;
  };
  timestamp: string;
  user: string | null;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{
    fullName: string;
    graduation: string;
    year: string;
    branch: string;
    experience: string;
    role: string;
  }>({
    fullName: '',
    graduation: '',
    year: '',
    branch: '',
    experience: '',
    role: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const email = user?.email || '';

  // Modal close on outside click
  const modalRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Fetch profile from Firestore when modal opens
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (profileOpen && user?.uid) {
        setLoadingProfile(true);
        setEditMode(false);
        setError('');
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              fullName: data.fullName || '',
              graduation: data.graduation || '',
              year: data.year || '',
              branch: data.branch || '',
              experience: data.experience || '',
              role: data.role || '',
            });
          } else {
            setProfile({ fullName: '', graduation: '', year: '', branch: '', experience: '', role: '' });
            setEditMode(true); // If no profile, go straight to edit mode
          }
          setDataLoaded(true);
        } catch (err) {
          setError('Failed to load profile.');
        } finally {
          setLoadingProfile(false);
        }
      }
    };
    if (profileOpen) {
      fetchProfile();
    }
  }, [profileOpen, user?.uid]);

  // Save handler
  const handleProfileSave = async () => {
    setError('');
    if (!profile.fullName || !profile.graduation || !profile.year || !profile.branch || !profile.experience || !profile.role) {
      setError('Please fill in all fields.');
      return;
    }
    if (!user?.uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        email: user.email || '',
        updatedAt: new Date().toISOString(),
      });
      setEditMode(false);
    } catch (err) {
      setError('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // Skeleton Loader for Profile
  const ProfileSkeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-4 p-5">
        <div className="w-20 h-20 rounded-full bg-slate-800"></div>
        <div className="space-y-3 flex-1">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl"></div>
        ))}
      </div>
    </div>
  );

  // Delete interview history function
  const deleteInterviewHistory = async (item: InterviewHistoryItem) => {
    if (!item.id) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'interviewFeedbacks', item.id));
      // Remove from local state
      setInterviewHistory(prev => prev.filter(historyItem => historyItem.id !== item.id));
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting interview history:', error);
      alert('Failed to delete interview history. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (item: InterviewHistoryItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  // Interview history state
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // The details modal shows the feedback fields merged with the raw Q&A, not a full history item
  const [selectedFeedback, setSelectedFeedback] = useState<Partial<InterviewHistoryItem> | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InterviewHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedInterviewTypes, setSelectedInterviewTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Helper function to get interview type from various sources
  const getInterviewType = (item: InterviewHistoryItem): string => {
    // First try userInputs
    if (item.userInputs?.interviewType) {
      return item.userInputs.interviewType;
    }
    // Then try direct interviewType field
    if (item.interviewType) {
      return item.interviewType;
    }
    // Finally try to extract from feedback data if available
    if (typeof item.feedback?.interviewType === 'string') {
      return item.feedback.interviewType;
    }
    return 'N/A';
  };

  // Ensure user email is set in sessionStorage for interview tracking
  React.useEffect(() => {
    if (user?.email) {
      sessionStorage.setItem('userEmail', user.email);
      console.log('User email set in sessionStorage:', user.email);
    }
  }, [user?.email]);

  // Fetch interview history on mount
  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!email || !user) {
        console.log('No email or user available:', { email, user: !!user });
        return;
      }
      console.log('Fetching interview history for:', { email, userId: user.uid });
      setLoadingHistory(true);
      try {
        // First try the new server-side filtering approach
        try {
          // Query for documents where user field matches current user email
          const userQuery = query(
            collection(db, 'interviewFeedbacks'),
            where('user', '==', email),
            orderBy('timestamp', 'desc')
          );
          
          const userSnapshot = await getDocs(userQuery);
          console.log('User query results:', userSnapshot.docs.length);
          
          // For now, let's use the simpler approach and filter on client side
          // since the nested field query might not work as expected
          const allQuery = query(
            collection(db, 'interviewFeedbacks'),
            orderBy('timestamp', 'desc')
          );
          
          const allSnapshot = await getDocs(allQuery);
          const allData = allSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as InterviewHistoryItem[];
          
          console.log('Current user email:', email);
          console.log('Total feedbacks found:', allData.length);
          
          // Debug: Log each document to see the structure
          allData.forEach((item, index) => {
            console.log(`Document ${index + 1}:`, {
              id: item.id,
              user: item.user,
              userInputsEmail: item.userInputs?.email,
              timestamp: item.timestamp
            });
          });
          
          // Filter data to only show current user's feedback
          const filteredData = allData.filter(item => {
            const userMatch = item.user === email;
            const userInputsMatch = item.userInputs?.email === email;
            const sessionUserEmail = sessionStorage.getItem('userEmail');
            const sessionMatch = item.user === sessionUserEmail;
            
            const isMatch = userMatch || userInputsMatch || sessionMatch;
            console.log(`Filtering item ${item.id}:`, {
              user: item.user,
              userInputsEmail: item.userInputs?.email,
              sessionEmail: sessionUserEmail,
              currentEmail: email,
              userMatch,
              userInputsMatch,
              sessionMatch,
              isMatch
            });
            
            return isMatch;
          });
          
          console.log('Filtered feedbacks for user:', filteredData.length);
          setInterviewHistory(filteredData);
          setCurrentPage(0);
          
        } catch (queryError) {
          console.error('Server-side query failed, falling back to client-side filtering:', queryError);
          
          // Fallback to the old method
          const q = query(
            collection(db, 'interviewFeedbacks'),
            orderBy('timestamp', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const allData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as InterviewHistoryItem[];
          
          console.log('Fallback - Current user email:', email);
          console.log('Fallback - Total feedbacks found:', allData.length);
          
          // Debug: Log each document to see the structure
          allData.forEach((item, index) => {
            console.log(`Fallback Document ${index + 1}:`, {
              id: item.id,
              user: item.user,
              userInputsEmail: item.userInputs?.email,
              timestamp: item.timestamp
            });
          });
          
          // Filter data to only show current user's feedback
          const filteredData = allData.filter(item => {
            const userMatch = item.user === email;
            const userInputsMatch = item.userInputs?.email === email;
            const sessionUserEmail = sessionStorage.getItem('userEmail');
            const sessionMatch = item.user === sessionUserEmail;
            
            const isMatch = userMatch || userInputsMatch || sessionMatch;
            console.log(`Fallback Filtering item ${item.id}:`, {
              user: item.user,
              userInputsEmail: item.userInputs?.email,
              sessionEmail: sessionUserEmail,
              currentEmail: email,
              userMatch,
              userInputsMatch,
              sessionMatch,
              isMatch
            });
            
            return isMatch;
          });
          
          console.log('Fallback - Filtered feedbacks for user:', filteredData.length);
          setInterviewHistory(filteredData);
          setCurrentPage(0);
        }
        
      } catch (err) {
        console.error('Failed to fetch interview history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [email, user]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 relative overflow-x-hidden">
      <div className="mesh-grid absolute inset-0 opacity-20 pointer-events-none z-0"></div>
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
                onClick={() => setProfileOpen(true)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors relative group"
              >
                <span className="relative z-10">Profile</span>
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
      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setProfileOpen(false)} />
          
          <div ref={modalRef} className="relative w-full max-w-2xl transform transition-all duration-300 scale-100">
            {/* Modal Glow Effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-3xl opacity-30 blur-md"></div>
            
            <div className="relative bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Close Button */}
              <button 
                onClick={() => setProfileOpen(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>

              {loadingProfile && !dataLoaded ? (
                <div className="p-8">
                  <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-white mb-2">Loading Profile</h2>
                     <p className="text-slate-400">Please wait while we fetch your data...</p>
                  </div>
                  <ProfileSkeleton />
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                  
                  {/* Decorative Banner */}
                  <div className="h-32 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 relative shrink-0">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30"></div>
                  </div>

                  <div className="px-8 pb-8 -mt-12 pt-1 flex flex-col flex-1">
                    {/* Header with Avatar */}
                    <div className="flex justify-between items-end mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-slate-900 p-1.5 shadow-xl">
                          <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center border border-white/10">
                            <User className="w-10 h-10 text-slate-300" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      </div>
                      
                      {!editMode && (
                        <button 
                          onClick={() => setEditMode(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all group"
                        >
                          <Pencil className="w-4 h-4 text-violet-400 group-hover:text-violet-300" />
                          Edit Profile
                        </button>
                      )}
                    </div>

                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-white mb-1">
                        {profile.fullName || 'User Profile'}
                      </h2>
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Mail className="w-4 h-4" />
                        {user?.email || 'No email connected'}
                      </div>
                    </div>

                    {error && (
                      <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-red-300 font-medium text-sm">{error}</span>
                      </div>
                    )}

                    {editMode ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleProfileSave(); }} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                            <input 
                              type="text" 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" 
                              value={profile.fullName} 
                              onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Graduation Degree</label>
                            <input 
                              type="text" 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" 
                              value={profile.graduation} 
                              onChange={e => setProfile(p => ({ ...p, graduation: e.target.value }))}
                              placeholder="B.Tech, MBA, etc."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Year of Passing</label>
                            <input 
                              type="text" 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" 
                              value={profile.year} 
                              onChange={e => setProfile(p => ({ ...p, year: e.target.value }))}
                              placeholder="2024"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Branch / Major</label>
                            <input 
                              type="text" 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" 
                              value={profile.branch} 
                              onChange={e => setProfile(p => ({ ...p, branch: e.target.value }))}
                              placeholder="Computer Science"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Experience</label>
                            <select 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all appearance-none" 
                              value={profile.experience} 
                              onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
                            >
                              <option value="" className="bg-slate-900">Select Level</option>
                              <option value="Fresher" className="bg-slate-900">Fresher</option>
                              {[...Array(10)].map((_, i) => (
                                <option key={i + 1} value={`${i + 1} years`} className="bg-slate-900">{i + 1} years</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Target Role</label>
                            <input 
                              type="text" 
                              className="w-full rounded-xl px-4 py-3 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" 
                              value={profile.role} 
                              onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
                              placeholder="Software Engineer"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-4">
                          <button 
                            type="button" 
                            onClick={() => setEditMode(false)}
                            className="px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-300"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={saving}
                            className="flex-1 group relative px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Save Changes
                              </span>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="group p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-white/5 hover:border-violet-500/30 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                              <GraduationCap className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Graduation</div>
                              <div className="text-white font-semibold mt-0.5">{profile.graduation || 'Not set'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="group p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-white/5 hover:border-blue-500/30 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                              <Calendar className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year</div>
                              <div className="text-white font-semibold mt-0.5">{profile.year || 'Not set'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="group p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                              <BookOpen className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Branch</div>
                              <div className="text-white font-semibold mt-0.5">{profile.branch || 'Not set'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="group p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                              <Briefcase className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Experience</div>
                              <div className="text-white font-semibold mt-0.5">{profile.experience || 'Not set'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 group p-4 rounded-xl bg-gradient-to-r from-slate-800/30 to-violet-900/10 hover:bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                              <Target className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target Role</div>
                              <div className="text-white font-semibold mt-0.5">{profile.role || 'Not set'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 flex flex-col px-6 py-8 pt-32 relative z-10 w-full max-w-7xl mx-auto">
        {/* Header Section with Stats Card on Right */}
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Welcome Section */}
          <div className="lg:col-span-2">
            {/* Dashboard Label */}
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-violet-400" />
              <span className="text-violet-400 font-semibold text-sm uppercase tracking-wider">Dashboard</span>
            </div>
            
            {/* Welcome Message */}
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-white">Welcome back, </span>
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {firstName}!
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-6">
              Track your interview progress and continue your journey to ace your next interview.
            </p>
            
            {/* New Interview Button */}
            <button
              onClick={() => navigate('/interview')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105"
            >
              <span className="text-2xl leading-none">+</span>
              <span>Start New Interview</span>
            </button>
          </div>

          {/* Right: Completed Interviews Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-violet-500/30 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-medium text-sm">Completed Interviews</h3>
                <div className="p-3 rounded-xl bg-violet-500/10">
                  <CheckCircle2 className="w-6 h-6 text-violet-400" />
                </div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {interviewHistory.length}
              </div>
              <p className="text-slate-500 text-sm">Total sessions</p>
            </div>
          </div>
        </div>

        {/* Interview Spaces Section */}
        <div className="mb-6 mt-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">
              <span className="text-white">Your Interview </span>
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">History</span>
            </h2>
            
            {/* Search and Filter */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search interviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all w-64"
                />
              </div>
              
              {/* Filter Button */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-all"
              >
                <Filter className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

  
          {/* Filter Dropdown */}
          {filterOpen && (
            <div className="mb-8 bg-[#0F1117] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                
                {/* 1. Interview Type Filter (Styled as Chips) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    Interview Type
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Technical', 'Behavioral', 'HR', 'Case Study', 'Mixed'].map((type) => {
                      const isSelected = selectedInterviewTypes.includes(type);
                      return (
                        <label 
                          key={type} 
                          className={`
                            cursor-pointer px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border
                            ${isSelected 
                              ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' 
                              : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'}
                          `}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInterviewTypes([...selectedInterviewTypes, type]);
                              } else {
                                setSelectedInterviewTypes(selectedInterviewTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          {type}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Date Range Filter (Custom Radio List) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Date Range
                  </h4>
                  <div className="space-y-1">
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: '7days', label: 'Last 7 Days' },
                      { value: '30days', label: 'Last 30 Days' },
                      { value: '3months', label: 'Last 3 Months' },
                      { value: '6months', label: 'Last 6 Months' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="dateRange"
                            className="peer appearance-none w-4 h-4 border-2 border-slate-600 rounded-full checked:border-violet-500 checked:bg-violet-500 transition-all"
                            checked={selectedDateRange === option.value}
                            onChange={() => setSelectedDateRange(option.value)}
                          />
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                        <span className={`text-sm transition-colors ${selectedDateRange === option.value ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Score Range Filter (Custom Radio List) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Performance
                  </h4>
                  <div className="space-y-1">
                    {[
                      { value: 'all', label: 'All Scores' },
                      { value: 'excellent', label: 'Excellent (8-10)', color: 'text-green-400' },
                      { value: 'good', label: 'Good (6-8)', color: 'text-emerald-400' },
                      { value: 'average', label: 'Average (4-6)', color: 'text-yellow-400' },
                      { value: 'poor', label: 'Poor (<4)', color: 'text-red-400' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="scoreRange"
                            className="peer appearance-none w-4 h-4 border-2 border-slate-600 rounded-full checked:border-violet-500 checked:bg-violet-500 transition-all"
                            checked={selectedScoreRange === option.value}
                            onChange={() => setSelectedScoreRange(option.value)}
                          />
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                        <span className={`text-sm transition-colors ${selectedScoreRange === option.value ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Sort By (Custom Radio List) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                    Sort By
                  </h4>
                  <div className="space-y-1">
                    {[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'highest', label: 'Highest Score' },
                      { value: 'lowest', label: 'Lowest Score' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="sortBy"
                            className="peer appearance-none w-4 h-4 border-2 border-slate-600 rounded-full checked:border-violet-500 checked:bg-violet-500 transition-all"
                            checked={sortBy === option.value}
                            onChange={() => setSortBy(option.value)}
                          />
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                        <span className={`text-sm transition-colors ${sortBy === option.value ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer / Clear Button */}
              <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedInterviewTypes([]);
                    setSelectedDateRange('all');
                    setSelectedScoreRange('all');
                    setSortBy('newest');
                  }}
                  className="group flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <svg className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  Reset Filters
                </button>
              </div>
            </div>
          )}
            {loadingHistory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 animate-pulse">
                    <div className="h-6 bg-slate-800 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : interviewHistory.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-violet-500/10 mb-6">
                  <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Interview History</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Complete your first mock interview to see feedback and track your progress here!
                </p>
                <button
                  onClick={() => navigate('/interview')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105"
                >
                  <span className="text-xl leading-none">+</span>
                  <span>Start Your First Interview</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interviewHistory
                  .filter((item) => {
                    // Search filter
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      const jobRole = item.userInputs?.jobRole?.toLowerCase() || '';
                      const company = item.userInputs?.company?.toLowerCase() || '';
                      const interviewType = getInterviewType(item).toLowerCase();
                      if (!jobRole.includes(query) && !company.includes(query) && !interviewType.includes(query)) {
                        return false;
                      }
                    }

                    // Interview Type filter
                    if (selectedInterviewTypes.length > 0) {
                      const itemType = getInterviewType(item);
                      if (!selectedInterviewTypes.includes(itemType)) {
                        return false;
                      }
                    }

                    // Date Range filter
                    if (selectedDateRange !== 'all' && item.timestamp) {
                      const itemDate = new Date(item.timestamp);
                      const now = new Date();
                      const daysDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (selectedDateRange === '7days' && daysDiff > 7) return false;
                      if (selectedDateRange === '30days' && daysDiff > 30) return false;
                      if (selectedDateRange === '3months' && daysDiff > 90) return false;
                      if (selectedDateRange === '6months' && daysDiff > 180) return false;
                    }

                    // Score Range filter
                    if (selectedScoreRange !== 'all' && item.feedback?.overallScore) {
                      const score = item.feedback.overallScore;
                      if (selectedScoreRange === 'excellent' && score < 8) return false;
                      if (selectedScoreRange === 'good' && (score < 6 || score >= 8)) return false;
                      if (selectedScoreRange === 'average' && (score < 4 || score >= 6)) return false;
                      if (selectedScoreRange === 'poor' && score >= 4) return false;
                    }

                    return true;
                  })
                  .sort((a, b) => {
                    // Sorting logic
                    if (sortBy === 'newest') {
                      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                    }
                    if (sortBy === 'oldest') {
                      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
                    }
                    if (sortBy === 'highest') {
                      return (b.feedback?.overallScore || 0) - (a.feedback?.overallScore || 0);
                    }
                    if (sortBy === 'lowest') {
                      return (a.feedback?.overallScore || 0) - (b.feedback?.overallScore || 0);
                    }
                    return 0;
                  })
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((item) => (
                  <div key={item.id} className="group bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden hover:border-violet-500/30">
                    {/* Card Header */}
                    <div className="relative bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 border-b border-violet-500/20 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1.5">
                            {item.userInputs?.jobRole || getInterviewType(item)}
                          </h3>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-medium">{item.userInputs?.company || 'Company'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-300 backdrop-blur-sm"
                          title="Delete this interview history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Completed
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-500/20">
                          {getInterviewType(item)}
                        </span>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => { 
                          setSelectedFeedback({ 
                            ...item.feedback, 
                            userInputs: item.userInputs,
                            // Stored top-level questions are plain strings
                            rawQuestions: item.questions as unknown as string[],
                            rawAnswers: item.answers
                          }); 
                          setFeedbackModalOpen(true); 
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-violet-500/50 text-white font-medium text-sm transition-all duration-300 group-hover:shadow-lg"
                      >
                        <span>View Details</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!loadingHistory && interviewHistory.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-8 px-6 py-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
                <div className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{currentPage * itemsPerPage + 1}</span> to <span className="text-white font-semibold">{Math.min((currentPage + 1) * itemsPerPage, interviewHistory.length)}</span> of <span className="text-white font-semibold">{interviewHistory.length}</span> interviews
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-900/50 disabled:text-slate-600 border border-slate-700 disabled:border-slate-800 text-white text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed hover:border-violet-500/50"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-slate-300 px-3">
                    <span className="text-white font-semibold">{currentPage + 1}</span> of {Math.ceil(interviewHistory.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(interviewHistory.length / itemsPerPage) - 1, prev + 1))}
                    disabled={currentPage >= Math.ceil(interviewHistory.length / itemsPerPage) - 1}
                    className="px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-900/50 disabled:text-slate-600 border border-slate-700 disabled:border-slate-800 text-white text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed hover:border-violet-500/50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
      </main>
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto feedback-scrollbar">
            {/* Glow Effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-3xl opacity-20 blur-xl"></div>
            
            <div className="relative bg-[#0b0c15] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8">
              {/* Close Button */}
              <button 
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-300 z-10" 
                onClick={() => setFeedbackModalOpen(false)} 
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                    Interview Feedback
                  </h2>
                </div>
                <p className="text-slate-400 text-sm">Detailed analysis of your performance</p>
              </div>
              <div className="text-left text-white space-y-6">
                {/* User Information */}
                {selectedFeedback.userInputs && (
                  <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                    <div className="font-semibold text-md text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Candidate Profile
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {selectedFeedback.userInputs.name && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Name</div>
                          <div className="text-white font-medium">{selectedFeedback.userInputs.name}</div>
                        </div>
                      )}
                      {selectedFeedback.userInputs.jobRole && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Target Role</div>
                          <div className="text-white font-medium">{selectedFeedback.userInputs.jobRole}</div>
                        </div>
                      )}
                      {selectedFeedback.userInputs.company && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Company</div>
                          <div className="text-white font-medium">{selectedFeedback.userInputs.company}</div>
                        </div>
                      )}
                      {selectedFeedback.userInputs.experience && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Experience</div>
                          <div className="text-white font-medium">{selectedFeedback.userInputs.experience}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Overall Scores */}
                {(selectedFeedback.overallScore || selectedFeedback.communicationScore || selectedFeedback.technicalScore || selectedFeedback.logicalScore || selectedFeedback.behavioralScore) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedFeedback.overallScore && (
                      <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl p-6 border border-indigo-500/20 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
                        <div className="relative">
                          <div className="text-4xl font-bold text-indigo-400 mb-1">{selectedFeedback.overallScore}/100</div>
                          <div className="text-xs text-indigo-200/60 uppercase tracking-widest font-semibold">Overall Score</div>
                        </div>
                      </div>
                    )}
                    {selectedFeedback.communicationScore && (
                      <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 rounded-2xl p-6 border border-sky-500/20 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-sky-500/5 blur-xl group-hover:bg-sky-500/10 transition-all"></div>
                        <div className="relative">
                          <div className="text-4xl font-bold text-sky-400 mb-1">{selectedFeedback.communicationScore}/100</div>
                          <div className="text-xs text-sky-200/60 uppercase tracking-widest font-semibold">Communication</div>
                        </div>
                      </div>
                    )}
                  {/* Show appropriate score based on interview type */}
                  {(() => {
                    const interviewType = selectedFeedback.userInputs?.interviewType || selectedFeedback.interviewType || '';
                    const isHRorManagerial = interviewType.toLowerCase().includes('hr') || 
                                           interviewType.toLowerCase().includes('behavioral') || 
                                           interviewType.toLowerCase().includes('managerial');
                    
                    if (isHRorManagerial) {
                      // For HR/Behavioral/Managerial interviews, show logical & behavioral score
                      return selectedFeedback.logicalBehavioralScore && (
                        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20 text-center relative overflow-hidden group">
                          <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                          <div className="relative">
                            <div className="text-4xl font-bold text-emerald-400 mb-1">{selectedFeedback.logicalBehavioralScore}/100</div>
                            <div className="text-xs text-emerald-200/60 uppercase tracking-widest font-semibold">Behavioral</div>
                          </div>
                        </div>
                      );
                    } else {
                      // For technical interviews, show technical score
                      return selectedFeedback.technicalScore && (
                        <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 rounded-2xl p-6 border border-purple-500/20 text-center relative overflow-hidden group">
                          <div className="absolute inset-0 bg-purple-500/5 blur-xl group-hover:bg-purple-500/10 transition-all"></div>
                          <div className="relative">
                            <div className="text-4xl font-bold text-purple-400 mb-1">{selectedFeedback.technicalScore}/100</div>
                            <div className="text-xs text-purple-200/60 uppercase tracking-widest font-semibold">Technical</div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                  </div>
                )}

                {/* Interview Summary */}
                {selectedFeedback.interviewSummary && (
                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
                    <div className="font-semibold text-lg mb-4 text-white flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      Interview Summary
                    </div>
                    <div className="text-slate-300 leading-relaxed text-sm md:text-base">
                      {selectedFeedback.interviewSummary}
                    </div>
                  </div>
                )}

                {/* Individual Question Evaluations */}
                {selectedFeedback.questions && Array.isArray(selectedFeedback.questions) && (
                  <div className="space-y-6">
                    <div className="font-semibold text-lg text-white flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Detailed Question Analysis
                    </div>
                    <div className="grid gap-4">
                      {selectedFeedback.questions?.map((q, i: number) => (
                        <div key={i} className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-6 border border-white/5 hover:border-violet-500/30 transition-all duration-300">
                          <div className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-sm font-bold border border-white/5">
                              {i + 1}
                            </span>
                            <div className="flex-1 space-y-4">
                              <div>
                                <h4 className="font-medium text-white text-lg leading-snug mb-3">{q.question}</h4>
                                <div className="bg-[#1a1f3a] rounded-lg p-4 border border-[#2a3150]">
                                  <p className="text-slate-300 text-sm"><span className="text-slate-400 font-medium">Your Answer:</span> {q.answer}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {q.communicationScore && (
                                  <div className="bg-sky-500/5 rounded-xl p-4 border border-sky-500/10">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-semibold text-sky-400">Fluency & Grammar</span>
                                      <span className="text-sm font-bold text-white">{q.communicationScore}/10</span>
                                    </div>
                                    {q.fluencyComment && (
                                      <p className="text-sm text-slate-400 leading-relaxed">{q.fluencyComment}</p>
                                    )}
                                  </div>
                                )}
                                {q.technicalScore && (
                                  <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-semibold text-purple-400">Technical Relevance</span>
                                      <span className="text-sm font-bold text-white">{q.technicalScore}/10</span>
                                    </div>
                                    {q.techComment && (
                                      <p className="text-sm text-slate-400 leading-relaxed">{q.techComment}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: Raw Questions and Answers */}
                {(!selectedFeedback.questions || !Array.isArray(selectedFeedback.questions)) && 
                 selectedFeedback.rawQuestions && selectedFeedback.rawAnswers && (
                  <div className="space-y-6">
                    <div className="font-semibold text-lg text-white flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Transcript
                    </div>
                    <div className="space-y-4">
                      {selectedFeedback.rawQuestions.map((question: string, i: number) => (
                        <div key={i} className="group bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                          <div className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-sm font-bold border border-white/5">
                              {i + 1}
                            </span>
                            <div>
                              <h4 className="font-medium text-white text-lg leading-snug mb-2">{question}</h4>
                              <p className="text-slate-400 text-sm">{selectedFeedback.rawAnswers?.[i] || 'No answer recorded'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Suggestions */}
                {selectedFeedback.overallSuggestions && Array.isArray(selectedFeedback.overallSuggestions) && selectedFeedback.overallSuggestions.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-r from-emerald-900/10 to-teal-900/10 border border-emerald-500/20 p-6">
                    <div className="font-semibold text-lg mb-4 text-emerald-400 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Key Improvements
                    </div>
                    <ul className="grid gap-3">
                      {selectedFeedback.overallSuggestions.map((suggestion: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                          <span className="text-emerald-400 mt-1 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md">
            {/* Glow Effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500 rounded-3xl opacity-20 blur-xl"></div>
            
            <div className="relative bg-[#1a1d2e] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8">
              {/* Close Button */}
              <button 
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all" 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                }} 
                aria-label="Close"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon and Title */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Delete Interview History</h2>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete this interview history? This action cannot be undone.
                </p>
              </div>

              {/* Interview Details */}
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 mb-6 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Interview Type</div>
                  <div className="text-white font-semibold text-lg">{getInterviewType(itemToDelete)}</div>
                </div>
                <div className="border-t border-slate-700/50 pt-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</div>
                  <div className="text-slate-300 font-medium">
                    {itemToDelete.timestamp ? new Date(itemToDelete.timestamp).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                  onClick={() => deleteInterviewHistory(itemToDelete)}
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 transition-all duration-300 focus:outline-none"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Custom scrollbar for modal */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }

        /* Feedback modal scrollbar - hidden but functional */
        .feedback-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .feedback-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
      
      <Footer />
    </div>
  );
} 