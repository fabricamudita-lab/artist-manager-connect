import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'artist' | 'management';
  avatar_url?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: 'artist' | 'management') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('AuthProvider - Current state:', { user: user?.email, profile: profile?.full_name, loading });

  // Separate function to fetch user profile
  const fetchUserProfile = async (session: Session) => {
    try {
      console.log('Fetching profile for user:', session.user.id);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      console.log('Profile data:', profileData, 'Error:', error);
      
      if (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
      } else if (!profileData) {
        console.log('No profile found, creating one...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || '',
            role: session.user.user_metadata?.role || 'artist'
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Failed to create profile:', createError);
          setProfile(null);
        } else {
          console.log('Created new profile:', newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Auth hook - Setting up auth state listener');
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid blocking the auth callback
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session);
          }, 0);
        } else {
          setProfile(null);
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    // Get initial session
    console.log('Auth hook - Getting initial session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      console.log('Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'artist' | 'management') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}