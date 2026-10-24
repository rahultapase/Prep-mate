<div>
  <h1>🎯 PrepMate - AI-Powered Mock Interview Platform</h1>  
  <p>Master your interview skills with AI-driven practice sessions, instant feedback, and personalized training</p>

  [![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](http://prepmate-drab.vercel.app/)
  [![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
  [![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-Latest-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

</div>

---

## 📖 About

PrepMate is a next-generation interview preparation platform that leverages advanced artificial intelligence to simulate realistic interview scenarios, provide instant feedback, and help you build confidence for your next big opportunity. Whether you're preparing for technical interviews, behavioral questions, or case studies, PrepMate adapts to your needs and helps you improve with every session.

## ✨ Features

- 🤖 **AI-Powered Mock Interviews** - Practice with adaptive AI that asks and evaluates real interview questions
- 📚 **Multiple Interview Types** - Behavioral, technical, case study, and industry-specific scenarios
- ⚡ **Feedback** - Get instant, actionable feedback on your answers and communication style
- 🎯 **Personalized Training** - Tailored sessions based on your industry, role, and experience level
- 📊 **Session Analytics** - Comprehensive performance tracking and progress visualization
- 🎨 **Modern UI/UX** - Clean, responsive design optimized for laptop and desktop
- 🔒 **Secure Authentication** - Firebase-powered authentication with email and Google sign-in
- 🌐 **Serverless Architecture** - Fast, scalable, and cost-effective infrastructure

## 🎥 Demo

Visit our live demo: **[prepmate-drab.vercel.app](http://prepmate-drab.vercel.app/)**

> 💡 **Tip:** For the best experience, use a laptop or desktop with a modern browser (Chrome, Firefox, or Edge recommended).

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Next-generation frontend tooling
- **Lottie** - Smooth animations and interactions

### Backend & Services
- **Firebase Authentication** - Secure user authentication
- **Firestore** - Real-time NoSQL database
- **Google Gemini AI** - Advanced language model for interview simulation
- **Vercel** - Serverless deployment platform

### DevOps & Tools
- **ESLint** - Code quality and consistency
- **PostCSS** - CSS processing
- **Git** - Version control


## 🚀 Getting Started

Follow these steps to set up PrepMate locally on your machine.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager (comes with Node.js)
- **Git** - Version control system
- **Firebase Account** - [Sign up](https://firebase.google.com/)
- **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rahultapase/PrepMate.git
   cd PrepMate
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or if you prefer yarn
   yarn install
   ```

3. **Set up Firebase**
   
   a. Create a new Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project" and follow the setup wizard
   
   b. Enable Authentication:
   - Navigate to Authentication → Sign-in method
   - Enable **Email/Password** and **Google** sign-in providers
   
   c. Create Firestore Database:
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode (or test mode for development)
   
   d. Get your Firebase configuration:
   - Go to Project Settings → General
   - Scroll down to "Your apps" section
   - Click the web icon (</>) to create a web app
   - Copy the configuration object

4. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```bash
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Gemini AI Configuration
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Start the development server**
   ```bash
   npm run dev:full
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

   🎉 **Success!** PrepMate should now be running locally.

## 🌐 Deployment

### Deploy to Vercel (Recommended)

Vercel provides the best deployment experience for React applications with automatic CI/CD.

#### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Vercel will automatically detect Vite configuration

#### Step 3: Configure Environment Variables

In your Vercel project dashboard:
1. Navigate to **Settings** → **Environment Variables**
2. Add all variables from your `.env` file:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

3. Select environments: **Production**, **Preview**, and **Development**

#### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Your app is live! 🎉

#### Step 5: Post-Deployment Configuration

**Update Firebase Authorized Domains:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Settings** → **Authorized Domains**
3. Click **"Add Domain"**
4. Add your Vercel URL: `your-app-name.vercel.app`

### Alternative Deployment Options

<details>
<summary><strong>Deploy to Netlify</strong></summary>

1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com/)
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Site settings
7. Deploy!

</details>

<details>
<summary><strong>Deploy to Firebase Hosting</strong></summary>

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting

# Build your app
npm run build

# Deploy
firebase deploy --only hosting
```

</details>

## 📁 Project Structure

```
PrepMate/
├── api/                      # Serverless API functions
│   ├── gemini.js            # Gemini AI integration
│   └── health.js            # Health check endpoint
├── public/                   # Static assets
│   └── security-headers.json
├── src/
│   ├── assets/              # Images, animations, icons
│   ├── components/          # React components
│   │   ├── AboutSection.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Interview.tsx
│   │   ├── Login.tsx
│   │   └── ...
│   ├── config/              # Configuration files
│   │   └── api.ts
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.ts
│   ├── styles/              # Global styles
│   │   └── scrollbar.css
│   ├── utils/               # Utility functions
│   │   ├── emailTemplates.ts
│   │   ├── security.ts
│   │   ├── validation.ts
│   │   └── ...
│   ├── App.tsx              # Main application component
│   ├── firebase.ts          # Firebase configuration
│   └── index.tsx            # Application entry point
├── .gitignore
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── vercel.json              # Vercel deployment config
```

## 🎯 Usage

### Starting an Interview Session

1. **Sign Up / Log In**
   - Create an account using email or Google authentication

2. **Choose Interview Type**
   - Select from technical, behavioral, or case study interviews

3. **Customize Your Session**
   - Set your experience level
   - Choose your target role
   - Select industry-specific questions

4. **Start Practicing**
   - Answer questions naturally
   - Receive instant AI feedback
   - Review your performance analytics

5. **Track Progress**
   - View session history
   - Analyze improvement areas
   - Set goals for future sessions

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add some amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea? Please [open an issue](https://github.com/rahultapase/PrepMate/issues)!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you find this project helpful, please give it a ⭐️!

---

<div>
  <sub>© 2025 PrepMate. All rights reserved.</sub>
</div>