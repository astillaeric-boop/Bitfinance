import React, { useEffect, useState } from 'react';
import { Investment, User } from '../types';
import { api } from '../lib/api';
import { Clock, Check, AlertCircle, Building, Loader2, Sparkles } from 'lucide-react';

interface ActiveContractsProps {
  investments: Investment[];
  user: User | null;
  onRefresh: () => void;
  onBalanceUpdate: (newBal: number) => void;
}

export const ActiveContracts: React.FC<ActiveContractsProps> = ({
  investments,
  user,
  onRefresh,
  onBalanceUpdate,
}) => {
  const [now, setNow] = useState<number>(Date.now());
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClaim = async (inv: Investment) => {
    setClaimingId(inv.id);
    setActionNotice(null);
    try {
      const res = await api.collectInvestment(inv.id);
      setActionNotice(`Successfully claimed ₱${res.creditedAmount.toFixed(2)} daily yield!`);
      onBalanceUpdate(res.newBalance);
      onRefresh();
    } catch (err: any) {
      setActionNotice(err.message || 'Error claiming return.');
    } finally {
      setClaimingId(null);
    }
  };

  const CYCLE_MS = 24 * 60 * 60 * 1000;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Active Investment Contracts</h2>
          <p className="text-xs text-slate-400">
            Automated 24-hour cycles synced directly with MariaDB database transactions.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          ↻ Refresh Contracts
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 font-bold ml-2">
            Dismiss
          </button>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Active Real Estate Contracts</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You do not have any active investment packages currently running. Choose a plan above to start earning daily returns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map(inv => {
            const baseTime = inv.lastCollectedAt
              ? new Date(inv.lastCollectedAt).getTime()
              : new Date(inv.createdAt).getTime();
            const elapsed = now - baseTime;
            const isCompleted = inv.daysRemaining <= 0;
            const isReadyToClaim = !isCompleted && elapsed >= CYCLE_MS;
            const remainingMs = Math.max(0, CYCLE_MS - elapsed);

            // Format HH:MM:SS
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
            const countdownStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            return (
              <div
                key={inv.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Contract #{inv.id}
                    </span>
                    <h3 className="text-base font-bold text-white">{inv.planName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Daily Yield</span>
                    <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                      +₱{Number(inv.dailyReturn).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Days Remaining:</span>
                    <span className="font-mono font-semibold text-slate-200 tabular-nums">
                      {inv.daysRemaining} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Cycles Completed:</span>
                    <span className="font-mono font-semibold text-slate-200 tabular-nums">
                      {inv.daysCollectedCount} cycles
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Initial Cost:</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      ₱{Number(inv.cost).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Cooldown or Claim Status */}
                <div className="pt-2 border-t border-slate-800/80">
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium justify-center">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Contract Completed</span>
                    </div>
                  ) : isReadyToClaim ? (
                    <button
                      type="button"
                      disabled={claimingId === inv.id}
                      onClick={() => handleClaim(inv)}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {claimingId === inv.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Collecting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Claim Daily Yield (₱{Number(inv.dailyReturn).toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Next Cycle In:</span>
                      </div>
                      <span className="font-mono font-bold text-amber-300 tabular-nums tracking-widest text-sm">
                        {countdownStr}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
