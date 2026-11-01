import React from 'react';
import { User } from '../types';
import { ShieldCheck, LogOut, Wallet, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDeposit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  activeTab,
  onSelectTab,
  onOpenDeposit,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <button
            onClick={() => onSelectTab('investments')}
            className="flex items-center gap-2 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg group-hover:border-emerald-400 transition-colors">
              ₿
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              Bit Finance
            </span>
          </button>

          {/* Zone 2: 4-5 single-line clean text links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => onSelectTab('investments')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'investments' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              Real Estate Plans
            </button>
            <button
              onClick={() => onSelectTab('contracts')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'contracts' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              My Contracts
            </button>
            <button
              onClick={() => onSelectTab('roulette')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'roulette' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              Mini Roulette
            </button>
            <button
              onClick={() => onSelectTab('wallet')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'wallet' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              Wallet & Payout
            </button>
            <button
              onClick={() => onSelectTab('team')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'team' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              Team & MLM
            </button>
            <button
              onClick={() => onSelectTab('missions')}
              className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'missions' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
              }`}
            >
              Missions
            </button>
          </nav>

          {/* Zone 3: 1 primary action / account profile */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Balance:</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums text-sm">
                    ₱{Number(user.balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={onOpenDeposit}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  + Deposit
                </button>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
