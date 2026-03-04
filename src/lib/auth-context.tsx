import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPlanByPriceId, PlanKey } from '@/lib/subscription';

interface SubscriptionInfo {
  subscribed: boolean;
  planKey: PlanKey | null;
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  subscriptionLoading: boolean;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultSub: SubscriptionInfo = { subscribed: false, planKey: null, subscriptionEnd: null };

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  subscription: defaultSub,
  subscriptionLoading: true,
  refreshSubscription: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSub);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed || false,
        planKey: data.price_id ? getPlanByPriceId(data.price_id) : null,
        subscriptionEnd: data.subscription_end || null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscription(defaultSub);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => checkSubscription(), 0);
      } else {
        setSubscription(defaultSub);
        setSubscriptionLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkSubscription();
      } else {
        setSubscriptionLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, subscriptionLoading, refreshSubscription: checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
