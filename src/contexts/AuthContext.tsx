import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../lib/firebase-config';
import { clinicService, UserProfile } from '../services/clinicService';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  clinicId?: string | null;
  role?: string;
  hasReadManual?: boolean;
  isClinicActive?: boolean;
  trialEndsAt?: string;
  isMasterAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    try {
      let profile = await clinicService.getUserProfile(firebaseUser.uid);
      const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário';
      
      // If profile doesn't exist, create a minimal one
      if (!profile) {
        console.log('No profile found for user, creating one...');
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          clinicId: null,
          role: 'member',
          displayName: displayName
        };
        await clinicService.updateUserProfile(firebaseUser.uid, newProfile);
        profile = newProfile;
      } else if (!profile.displayName || !profile.email) {
        // If profile exists but lacks key data, update it
        console.log('Profile incomplete, updating...');
        await clinicService.updateUserProfile(firebaseUser.uid, { 
          displayName: profile.displayName || displayName,
          email: profile.email || firebaseUser.email || ''
        });
        // We might want to re-fetch or just update the variable
        profile = {
          ...profile,
          displayName: profile.displayName || displayName,
          email: profile.email || firebaseUser.email || ''
        };
      }

      let isClinicActive = true;
      let trialEndsAt = undefined;

      if (profile.clinicId) {
        const clinic = await clinicService.getClinic(profile.clinicId);
        if (clinic) {
          trialEndsAt = clinic.trialEndsAt;
          const isTrialValid = clinic.trialEndsAt ? new Date() < new Date(clinic.trialEndsAt) : false;
          const isSubsActive = clinic.subscription?.status === 'active';
          isClinicActive = isTrialValid || isSubsActive;
        }
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: profile.displayName || displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        clinicId: profile?.clinicId || null,
        role: profile?.role,
        hasReadManual: profile?.hasReadManual || false,
        isClinicActive,
        trialEndsAt,
        isMasterAdmin: firebaseUser.email === 'yandatafox@gmail.com' || firebaseUser.email === 'yanandraderfo@gmail.com'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Even if profile fails, set at least the basic firebase user info
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        clinicId: null
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async (userId: string) => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await reload(firebaseUser);
      await fetchProfile(firebaseUser);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await sendEmailVerification(cred.user);
      if (name) {
        await clinicService.updateUserProfile(cred.user.uid, { 
          displayName: name,
          email: email
        });
      }
    }
  };

  const resendEmailVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithEmail, registerWithEmail, resendEmailVerification, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
