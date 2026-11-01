import React, { useState, useEffect } from 'react';
import { MissionItem, User } from '../types';
import { api } from '../lib/api';
import { Award, Check, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface MissionsPanelProps {
  user: User | null;
  onBalanceUpdate: (newBal: number) => void;
  onRequireAuth: () => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  user,
  onBalanceUpdate,
  onRequireAuth,
}) => {
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadMissions = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api.getMissions();
      setMissions(data);
    } catch (err) {
      console.error('Failed to load missions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, [user]);

  const handleClaim = async (mission: MissionItem) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    setClaimingId(mission.id);
    setMessage(null);

    try {
      const res = await api.claimMission(mission.id);
      setMessage({
        type: 'success',
        text: `Claimed ₱${res.reward.toFixed(2)} milestone reward!`,
      });
      onBalanceUpdate(res.newBalance);
      await loadMissions();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to claim milestone reward.',
      });
    } finally {
      setClaimingId(null);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <Award className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Affiliate Milestone Rewards</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Sign in to track your invited active investors and claim up to ₱2,400.00 in cash milestones.
        </p>
        <button
          onClick={onRequireAuth}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase rounded-lg transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Milestone Missions</h2>
        <p className="text-xs text-slate-400">
          Earn instant cash rewards as your direct referrals purchase their first real estate investment plan.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/40 border border-red-800/50 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map(mission => {
          const progressPercent = Math.min(
            100,
            Math.round((mission.currentCount / mission.requiredReferrals) * 100)
          );
          const isClaiming = claimingId === mission.id;

          return (
            <div
              key={mission.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Tier Milestone
                    </span>
                    <h3 className="text-base font-bold text-white">{mission.name}</h3>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                    ₱{mission.reward.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{mission.description}</p>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Active Referrals:</span>
                    <span className="font-mono text-white font-bold tabular-nums">
                      {mission.currentCount} / {mission.requiredReferrals}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {mission.isClaimed ? (
                  <div className="py-2 px-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Reward Claimed</span>
                  </div>
                ) : mission.isEligible ? (
                  <button
                    type="button"
                    disabled={isClaiming}
                    onClick={() => handleClaim(mission)}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        <span>Claiming Reward...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Claim ₱{mission.reward.toFixed(2)}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      Needs {mission.requiredReferrals - mission.currentCount} more referrals
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
