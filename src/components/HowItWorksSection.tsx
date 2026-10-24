import { useState } from 'react';
import { CheckCircle, Sparkles, ArrowRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HowItWorksSection= () =>{
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [{
    number: '01',
    title: 'Create Your Profile',
    description: 'Input your target industry, desired role, experience level, and interview goals for a personalized experience.',
    icon: '👤',
    color: 'from-violet-500 to-indigo-500',
    highlights: ['Industry selection', 'Role preferences', 'Experience level', 'Custom goals']
  }, {
    number: '02',
    title: 'Select Interview Mode',
    description: 'Choose from behavioral, technical, case study, industry-specific, or custom interview formats.',
    icon: '🎯',
    color: 'from-blue-500 to-cyan-500',
    highlights: ['Behavioral questions', 'Technical assessments', 'Case studies', 'Custom formats']
  }, {
    number: '03',
    title: 'Train With AI',
    description: 'Engage in realistic interview simulations with our adaptive AI that responds naturally to your answers.',
    icon: '🤖',
    color: 'from-emerald-500 to-green-500',
    highlights: ['Real-time responses', 'Adaptive difficulty', 'Natural conversations', 'Voice & text modes']
  }, {
    number: '04',
    title: 'Receive Detailed Analytics',
    description: 'Get comprehensive feedback on your performance with specific improvement recommendations.',
    icon: '📊',
    color: 'from-amber-500 to-orange-500',
    highlights: ['Performance metrics', 'Improvement tips', 'Progress tracking', 'Skill breakdown']
  }];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.15) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }}></div>
      </div>
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-full mb-6 border border-violet-500/30 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-violet-400 mr-2 animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Simple 4-Step Process
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How Prep{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Mate
            </span>{' '}
            Works
          </h2>
          
          <p className="max-w-2xl mx-auto text-xl text-gray-400">
            Start practicing in minutes with our intuitive platform designed for your success
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group cursor-pointer"
              onMouseEnter={() => setActiveStep(index)}
            >
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-6 h-0.5 bg-gradient-to-r from-violet-500/50 to-transparent z-0">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <ArrowRight className="h-4 w-4 text-violet-400 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Card */}
              <div className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-8 border transition-all duration-500 h-full backdrop-blur-sm ${
                activeStep === index 
                  ? 'border-violet-500 shadow-2xl shadow-violet-500/20 scale-105' 
                  : 'border-gray-700/50 hover:border-violet-500/50'
              }`}>
                {/* Step Number Badge */}
                <div className={`absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-transform duration-300 ${
                  activeStep === index ? 'scale-110 rotate-6' : 'group-hover:scale-105'
                }`}>
                  <span className="text-xl font-bold text-white">{step.number}</span>
                </div>

                {/* Icon */}
                <div className="text-5xl mb-6 mt-4 transform transition-transform duration-300 group-hover:scale-110">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-violet-400 transition-colors">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 mb-4 leading-relaxed">
                  {step.description}
                </p>

                {/* Highlights */}
                <div className={`space-y-2 transition-all duration-500 ${
                  activeStep === index ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
                }`}>
                  {step.highlights.map((highlight, i) => (
                    <div key={i} className="flex items-center text-sm text-violet-300">
                      <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-violet-500/20">
            <div className="flex-1 text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Ready to ace your next interview?
              </h3>
              <p className="text-gray-400">
                Join thousands of professionals improving their skills daily
              </p>
            </div>
            <button onClick={() => navigate('/login')} className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Training Now
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}