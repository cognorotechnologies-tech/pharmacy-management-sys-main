import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';
import toast from 'react-hot-toast';

/* ─── Types ────────────────────────────────────────────────── */

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    role: UserRole | null;
    branchId: string | null;
    isLoading: boolean;
}

interface AuthContextValue extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ─── Profile fetcher ──────────────────────────────────────── */

async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Failed to fetch profile:', error.message);
        return null;
    }

    return data as Profile;
}

/* ─── Provider ─────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        role: null,
        branchId: null,
        isLoading: true,
    });

    /** Load profile after auth state change */
    const loadProfile = useCallback(async (user: User | null, session: Session | null) => {
        if (!user) {
            setState({
                user: null,
                session: null,
                profile: null,
                role: null,
                branchId: null,
                isLoading: false,
            });
            return;
        }

        const profile = await fetchProfile(user.id);

        // Guard: deactivated account
        if (profile && !profile.is_active) {
            toast.error('Your account has been deactivated. Contact an administrator.');
            await supabase.auth.signOut();
            setState({
                user: null,
                session: null,
                profile: null,
                role: null,
                branchId: null,
                isLoading: false,
            });
            return;
        }

        setState({
            user,
            session,
            profile,
            role: profile?.role ?? null,
            branchId: profile?.branch_id ?? null,
            isLoading: false,
        });
    }, []);

    /** Subscribe to auth state changes */
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadProfile(session?.user ?? null, session);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            loadProfile(session?.user ?? null, session);
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    /** Sign in with email/password */
    const signIn = useCallback(
        async (email: string, password: string): Promise<{ error: Error | null }> => {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { error };
            return { error: null };
        },
        [],
    );

    /** Sign out */
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        toast.success('Signed out successfully');
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

/* ─── Hook ─────────────────────────────────────────────────── */

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
