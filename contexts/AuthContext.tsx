'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';

import { getSupabase } from '../lib/supabase';
import { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ---------------------------------------------
   Type of row in your `profiles` table
--------------------------------------------- */
type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'Admin' | 'Manager' | 'Member';

  skills: string[] | null;
  wellness_score: number | null;
  max_workload: number | null;

  created_at: string | null;

  burnout_risk?: number | null;
  phone?: string | null;
  office_address?: string | null;

  timezone?: string | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_weekends?: boolean | null;
  two_factor_enabled?: boolean | null;

  burnout_sensitivity?: number | null;
  auto_assign?: boolean | null;
  skill_match_priority?: boolean | null;
  ai_deadlines?: boolean | null;

  email_digest_frequency?: string | null;
  push_notifications?: boolean | null;
  sound_alerts?: boolean | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
<<<<<<< fix-auth-and-loading
=======
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load users from API and restore session
    useEffect(() => {
        const init = async () => {
            try {
                // Fetch available users
                // Fetch available users
                const res = await fetch('/api/users');
                let data: User[] = [];
                if (res.ok) {
                    data = await res.json();
                    setUsers(Array.isArray(data) ? data : []);
                }

                // Restore session from localStorage but prefer fresh data
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    try {
                        const storedUser = JSON.parse(stored);
                        // Find the updated user object from the fresh API response
                        const freshUser = Array.isArray(data) ? data.find((u: User) => u.id === storedUser.id) : null;

                        if (freshUser) {
                            setCurrentUser(freshUser);
                            // Update local storage to match fresh data
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshUser));
                        } else {
                            // If user not found in fresh data (likely legacy ID 'u1'), clear session
                            console.warn("Stored user not found in fresh data, clearing session.");
                            setCurrentUser(null);
                            localStorage.removeItem(LOCAL_STORAGE_KEY);
                        }
                    } catch {
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    };
>>>>>>> main

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!data.session?.user) {
          setCurrentUser(null);
          return;
        }

        await loadProfile(
          data.session.user.id,
          data.session.user.email ?? null
        );

      } catch (err) {
        console.error('Auth init error:', err);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (!session?.user) {
            setCurrentUser(null);
            return;
          }

          await loadProfile(
            session.user.id,
            session.user.email ?? null
          );

        } catch (err) {
          console.error('Auth state change error:', err);
          setCurrentUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string, email: string | null) => {
    const supabase = getSupabase();

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<ProfileRow>();

    // First time OAuth login → create profile
    if (error && error.code === 'PGRST116') {

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: email?.split('@')[0] ?? 'User',
          role: 'Member',
          skills: [],
          wellness_score: 0,
          max_workload: 0
        })
        .select()
        .single<ProfileRow>();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        setCurrentUser(null);
        return;
      }

      data = created;
    }

    if (!data) {
      setCurrentUser(null);
      return;
    }

    const mappedUser: User = {
      id: data.id,
      name: data.full_name ?? email ?? 'User',
      email: data.email ?? email ?? '',
      avatarUrl: data.avatar_url ?? undefined,
      role: data.role,

      skills: data.skills ?? [],
      wellnessScore: data.wellness_score ?? 0,
      maxWorkload: data.max_workload ?? 0,

      createdAt: data.created_at ?? undefined,
      burnoutRisk: data.burnout_risk as User['burnoutRisk'],
      phone: data.phone ?? undefined,
      officeAddress: data.office_address ?? undefined,

      timezone: data.timezone ?? undefined,
      quietHoursStart: data.quiet_hours_start ?? undefined,
      quietHoursEnd: data.quiet_hours_end ?? undefined,
      quietHoursWeekends: data.quiet_hours_weekends ?? undefined,
      twoFactorEnabled: data.two_factor_enabled ?? undefined,

      burnoutSensitivity: data.burnout_sensitivity ?? undefined,
      autoAssign: data.auto_assign ?? undefined,
      skillMatchPriority: data.skill_match_priority ?? undefined,
      aiDeadlines: data.ai_deadlines ?? undefined,

      emailDigestFrequency: data.email_digest_frequency ?? undefined,
      pushNotifications: data.push_notifications ?? undefined,
      soundAlerts: data.sound_alerts ?? undefined
    };

    setCurrentUser(mappedUser);
  };

  const login = (_user: User) => {};

  const logout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        login,
        logout,
        setCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}