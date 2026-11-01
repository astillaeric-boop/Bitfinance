import React, { useState, useEffect } from 'react';
import { api, getSessionUid, setSessionUid } from './lib/api';
import { User, InvestmentPlan, Investment, PublicSettings } from './types';
import { Navbar } from './components/Navbar';
import { InvestmentPlans } from './components/InvestmentPlans';
import { ActiveContracts } from './components/ActiveContracts';
import { RouletteGame } from './components/RouletteGame';
import { WalletPanel } from './components/WalletPanel';
import { CouponRedeem } from './components/CouponRedeem';
import { TeamMlmPanel } from './components/TeamMlmPanel';
import { MissionsPanel } from './components/MissionsPanel';
import { CommunityModal } from './components/CommunityModal';
import { AuthModal } from './components/AuthModal';
import { AdminPortal } from './components/AdminPortal';
import { Shield, Sparkles, Building2 } from 'lucide-react';

export default function App() {
  // Check secret admin route (/admin2026 or #admin2026)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('/admin2026') || window.location.hash.includes('admin2026');
  });

  // Core User & App States (Direct from MariaDB backend, no localStorage caching of core state!)
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>('investments');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [initialRefCode, setInitialRefCode] = useState<string>('');
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState<boolean>(false);

  // Initial URL check for ?ref=CODE and secret /admin2026 route
  useEffect(() => {
    const handleLocation = () => {
      if (window.location.pathname.includes('/admin2026') || window.location.hash.includes('admin2026')) {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);

    // Rule 2: Capture ?ref=CODE from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setInitialRefCode(ref.toUpperCase());
      if (!getSessionUid()) {
        setAuthMode('register');
        setIsAuthOpen(true);
      }
    }

    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
    };
  }, []);

  // Fetch initial plans & public settings directly from MariaDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [plansData, settingsData] = await Promise.all([
          api.getPlans(),
          api.getPublicSettings(),
        ]);
        setPlans(plansData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch current user & investments directly from MariaDB
  const refreshUser = async () => {
    const uid = getSessionUid();
    if (!uid) {
      setUser(null);
      setInvestments([]);
      return;
    }

    try {
      const [userData, invData] = await Promise.all([
        api.getMe(),
        api.getMyInvestments(),
      ]);
      setUser(userData);
      setInvestments(invData);
    } catch (err) {
      console.warn('Session expired or user not found:', err);
      setSessionUid(null);
      setUser(null);
      setInvestments([]);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Handle successful login or signup
  const handleAuthSuccess = (authUser: User, isNewRegistration?: boolean) => {
    setUser(authUser);
    refreshUser();
    // Rule 3: Login Popup Modal opens automatically every time a user logs in
    setIsCommunityModalOpen(true);
  };

  const handleLogout = () => {
    setSessionUid(null);
    setUser(null);
    setInvestments([]);
  };

  // Dedicated Deposit Trigger
  const handleOpenDeposit = () => {
    setActiveTab('wallet');
    const walletEl = document.getElementById('wallet-section');
    if (walletEl) walletEl.scrollIntoView({ behavior: 'smooth' });
  };

  // If secret admin route /admin2026, render the Admin Portal
  if (isAdminRoute) {
    return <AdminPortal />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 3-Zone Top Bar */}
      <Navbar
        user={user}
        onOpenAuth={mode => {
          setAuthMode(mode);
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={tab => {
          setActiveTab(tab);
          const el = document.getElementById(`${tab}-section`);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenDeposit={handleOpenDeposit}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Section 1: Real Estate Investment Packages */}
        <div id="investments-section">
          <InvestmentPlans
            plans={plans}
            user={user}
            onPlanPurchased={newBal => {
              if (user) setUser({ ...user, balance: newBal });
              refreshUser();
            }}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
            onOpenDeposit={handleOpenDeposit}
          />
        </div>

        {/* Section 2: Active Contracts with 24h Countdown & Yield Claims */}
        <div id="contracts-section">
          <ActiveContracts
            investments={investments}
            user={user}
            onRefresh={refreshUser}
            onBalanceUpdate={newBal => {
              if (user) setUser({ ...user, balance: newBal });
            }}
          />
        </div>

        {/* Section 3: Client-Side Mini Roulette Game System (Positioned between Active Contracts and Wallet) */}
        <div id="roulette-section">
          <RouletteGame
            user={user}
            onBalanceUpdate={newBal => {
              if (user) setUser({ ...user, balance: newBal });
            }}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          />
        </div>

        {/* Section 4: Wallet, Deposit, Withdrawal & Prepaid Binding */}
        <div id="wallet-section">
          <WalletPanel
            user={user}
            settings={settings}
            investments={investments}
            onBalanceUpdate={newBal => {
              if (user) setUser({ ...user, balance: newBal });
            }}
            onRefreshUser={refreshUser}
          />
        </div>

        {/* Section 5: Coupon Redemption with Anti-Spam Lockout */}
        <div id="coupon-section" className="max-w-2xl mx-auto">
          <CouponRedeem
            isAuthenticated={!!user}
            onBalanceUpdate={newBal => {
              if (user) setUser({ ...user, balance: newBal });
            }}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          />
        </div>

        {/* Section 6: Team & MLM Panel with First-Plan-Only Commission Rule & Permanent Community QR */}
        <div id="team-section">
          <TeamMlmPanel
            user={user}
            settings={settings}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          />
        </div>

        {/* Section 7: Missions Panel with 6 Milestone Tiers */}
        <div id="missions-section">
          <MissionsPanel
            user={user}
            onBalanceUpdate={newBal => {
              if (user) setUser({ ...user, balance: newBal });
            }}
            onRequireAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Bit Finance Long Term Investments</span>
            <span>·</span>
            <span>Philippine Peso (₱) High-Yield Real Estate</span>
          </div>

          <div className="flex items-center gap-6">
            <span>Powered by MariaDB Connection Pool</span>
            <span>·</span>
            <span>© 2026 Bit Finance Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Login Popup Modal for Community Hub */}
      <CommunityModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
        settings={settings}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        initialReferralCode={initialRefCode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
