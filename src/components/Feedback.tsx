import React, { useState } from 'react';
import { BrainCircuit, Star, X, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { submitRating } from '../services/data';

export default function Feedback({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState({
    interviewExperience: 0,
    aiQuestionQuality: 0,
    userInterface: 0,
    overallSatisfaction: 0
  });
  const [experienceText, setExperienceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (category: keyof typeof ratings, rating: number) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const renderStars = (category: keyof typeof ratings, currentRating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="transition-all duration-200 hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one rating is provided
    const hasRating = Object.values(ratings).some(rating => rating > 0);
    if (!hasRating) {
      alert('Please provide at least one rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // The server links the rating to the logged-in user
      await submitRating({ ...ratings, experienceText: experienceText.trim() });

      setSubmitted(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
            <Send className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Thank You!</h2>
          <p className="text-sm text-gray-300 mb-3">
            Your feedback has been submitted. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-auto" style={{maxHeight: 'calc(100vh - 2rem)', overflow: 'hidden'}}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-violet-500" />
            <h2 className="text-xl font-bold text-white">Rate Your Experience</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Interview Experience */}
            <div className="glass-effect rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">Interview Experience</h3>
              {renderStars('interviewExperience', ratings.interviewExperience)}
            </div>

            {/* AI Question Quality */}
            <div className="glass-effect rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">AI Question Quality</h3>
              {renderStars('aiQuestionQuality', ratings.aiQuestionQuality)}
            </div>

            {/* User Interface */}
            <div className="glass-effect rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">User Interface</h3>
              {renderStars('userInterface', ratings.userInterface)}
            </div>

            {/* Overall Satisfaction */}
            <div className="glass-effect rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">Overall Satisfaction</h3>
              {renderStars('overallSatisfaction', ratings.overallSatisfaction)}
            </div>
          </div>

          {/* Experience Text */}
          <div className="glass-effect rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Additional Feedback (Optional)</h3>
            </div>
            <textarea
              value={experienceText}
              onChange={(e) => setExperienceText(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-400 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Share your thoughts or suggestions..."
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {experienceText.length}/500
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 via-sky-400 to-purple-500 shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 