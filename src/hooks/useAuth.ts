import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';

// Blocked domains - temporary/disposable email services
const BLOCKED_DOMAINS = [
  'tempmail.org', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', 'fakeinbox.com', 'throwaway.email', 'disposablemail.com'
];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimize auth state listener
  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      
      if (firebaseUser) {
        // Reload to get fresh verification status
        await firebaseUser.reload();
        
        // verify current status
        const isVerified = firebaseUser.emailVerified;
        
        // FIX: Do not forcefully signOut here. 
        // Just decide whether to set the user state or not.
        // This allows the signup function to finish its work (sending email/db write)
        // while the user is technically "logged in" on Firebase SDK but "logged out" in UI.
        if (isVerified) {
          setUser(firebaseUser);
          sessionStorage.setItem('userEmail', firebaseUser.email || '');
        } else {
          setUser(null);
          sessionStorage.removeItem('userEmail');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('userEmail');
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Memoize email validation
  const validateEmailDomain = useCallback((email: string): { isValid: boolean; message?: string } => {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      return { isValid: false, message: 'Invalid email format' };
    }

    if (BLOCKED_DOMAINS.includes(domain)) {
      return { isValid: false, message: 'Temporary/disposable email addresses are not allowed' };
    }

    return { isValid: true };
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const domainValidation = validateEmailDomain(email);
      if (!domainValidation.isValid) {
        throw new Error(domainValidation.message);
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      
      await result.user.reload();
      const currentUser = auth.currentUser;
      
      // Explicitly check verification on Login
      if (currentUser && !currentUser.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email address before logging in. Check your inbox.');
      }

      return currentUser;
    } catch (err: any) {
      // Clean up firebase error messages
      const errorMessage = err.message.replace('Firebase: ', '').replace(' (auth/wrong-password).', '');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateEmailDomain]);

  // FIXED SIGNUP FUNCTION
  const signup = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const domainValidation = validateEmailDomain(email);
      if (!domainValidation.isValid) {
        throw new Error(domainValidation.message);
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      console.log('1. Creating user account...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = result.user;
      
      console.log('2. Sending verification email...');
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      };
      
      // Send email logic immediately while user is definitely logged in
      await sendEmailVerification(newUser, actionCodeSettings);
      
      console.log('3. Creating Firestore document...');
      await setDoc(doc(db, 'users', newUser.uid), {
        email: email,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        fullName: '',
        graduation: '',
        year: '',
        branch: '',
        experience: '',
        role: ''
      });
      
      console.log('4. Signing out user...');
      // NOW we sign them out because the process is complete
      await signOut(auth);
      
      return { user: newUser, message: 'Account created! Please verify your email.' };
    } catch (err: any) {
      console.error('Signup error:', err);
      // If signup fails partially, try to clean up
      if (auth.currentUser) await signOut(auth);
      
      const errorMessage = err.message || 'Failed to create account.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateEmailDomain]);

  // Google login
  const loginWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Resend verification
  const resendVerificationEmail = useCallback(async () => {
    try {
      setError(null);
      // Use auth.currentUser directly as 'user' state might be null if not verified
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        const actionCodeSettings = {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false
        };
        await sendEmailVerification(currentUser, actionCodeSettings);
        setError('Verification email sent! Please check your inbox.');
      } else {
        throw new Error("No user currently signed in to send verification to.");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      const domainValidation = validateEmailDomain(email);
      if (!domainValidation.isValid) throw new Error(domainValidation.message);
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent!');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateEmailDomain]);

  return {
    user,
    loading,
    error,
    login,
    signup,
    loginWithGoogle,
    logout,
    resendVerificationEmail,
    resetPassword,
  };
};