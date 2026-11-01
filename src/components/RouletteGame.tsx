import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { LiveWinningsTicker } from './LiveWinningsTicker';
import { AlertCircle, RotateCw, Trophy } from 'lucide-react';

interface RouletteGameProps {
  user: User | null;
  onBalanceUpdate: (newBalance: number) => void;
  onRequireAuth: () => void;
}

// Visual segments on the wheel/reel for UI rendering only (no odds/percentages displayed!)
const WHEEL_SEGMENTS = [
  { label: '10X', color: 'from-amber-500 to-yellow-600', text: 'text-amber-100', multiplier: 10 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
  { label: '2X', color: 'from-emerald-600 to-emerald-700', text: 'text-emerald-100', multiplier: 2 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
  { label: '1.5X', color: 'from-blue-600 to-indigo-700', text: 'text-blue-100', multiplier: 1.5 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
  { label: '4X', color: 'from-purple-600 to-indigo-800', text: 'text-purple-100', multiplier: 4 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
  { label: '1.5X', color: 'from-blue-600 to-indigo-700', text: 'text-blue-100', multiplier: 1.5 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
  { label: '2X', color: 'from-emerald-600 to-emerald-700', text: 'text-emerald-100', multiplier: 2 },
  { label: '0X', color: 'from-slate-700 to-slate-800', text: 'text-slate-400', multiplier: 0 },
];

export const RouletteGame: React.FC<RouletteGameProps> = ({
  user,
  onBalanceUpdate,
  onRequireAuth,
}) => {
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    outcome: string;
    multiplier: number;
    payout: number;
    playerProfit: number;
  } | null>(null);

  const handleQuickBet = (amount: number) => {
    setErrorMsg(null);
    setBetAmount(amount);
  };

  const handleSpin = async () => {
    setErrorMsg(null);
    setLastResult(null);

    if (!user) {
      onRequireAuth();
      return;
    }

    // Client-side table limit & balance validation
    if (isNaN(betAmount) || betAmount < 50 || betAmount > 300) {
      setErrorMsg('Table Limit Error: Bet amount must be between ₱50.00 and ₱300.00.');
      return;
    }

    if (Number(user.balance) < betAmount) {
      setErrorMsg(
        `Insufficient balance (₱${Number(user.balance).toFixed(2)}). Please deposit funds or lower your bet.`
      );
      return;
    }

    setIsSpinning(true);

    try {
      // Backend transaction execution
      const result = await api.spinRoulette(betAmount);

      // Find an index on wheel matching multiplier for visual landing
      const matchingIndices = WHEEL_SEGMENTS.map((s, idx) => (s.multiplier === result.multiplier ? idx : -1)).filter(
        idx => idx !== -1
      );
      const targetIdx = matchingIndices.length > 0 ? matchingIndices[Math.floor(Math.random() * matchingIndices.length)] : 1;

      // 12 segments = 30 deg each. Add 5 full rotations (1800 deg)
      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const targetRotation = rotationDegrees + 1800 + (360 - (targetIdx * segmentAngle + segmentAngle / 2));
      setRotationDegrees(targetRotation);

      // Wait for spin animation duration
      setTimeout(() => {
        setIsSpinning(false);
        setLastResult({
          outcome: result.outcome,
          multiplier: result.multiplier,
          payout: result.payout,
          playerProfit: result.playerProfit,
        });
        onBalanceUpdate(result.newBalance);
      }, 3000);
    } catch (err: any) {
      setIsSpinning(false);
      setErrorMsg(err.message || 'Error occurred while processing spin transaction.');
    }
  };

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
      {/* 5A. Live Winnings Ticker at Top of Roulette Section */}
      <LiveWinningsTicker />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Roulette Wheel Visual */}
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-slate-800 bg-slate-950 p-2 shadow-2xl flex items-center justify-center">
            {/* Top Indicator Arrow */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-400 drop-shadow-md" />

            {/* Rotating Wheel Hub */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transitionDuration: isSpinning ? '3000ms' : '0ms',
              }}
            >
              {WHEEL_SEGMENTS.map((seg, idx) => {
                const angle = (360 / WHEEL_SEGMENTS.length) * idx;
                return (
                  <div
                    key={idx}
                    className={`absolute w-1/2 h-full right-1/2 origin-right flex items-center justify-start pl-3 text-xs font-bold font-mono tracking-wider ${seg.text}`}
                    style={{
                      transform: `rotate(${angle}deg)`,
                      clipPath: 'polygon(0 30%, 100% 50%, 0 70%)',
                    }}
                  >
                    <span className="transform -rotate-90 origin-center text-[11px] drop-shadow-sm font-extrabold">
                      {seg.label}
                    </span>
                  </div>
                );
              })}

              {/* Decorative radial divisions */}
              <div className="absolute inset-0 rounded-full border border-slate-800 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(15,23,42,0.8)_100%)]" />
            </div>

            {/* Center Golden Dial */}
            <div className="absolute z-10 w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-400/80 shadow-lg flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">BIT</span>
              <span className="text-xs font-bold text-amber-400">SPIN</span>
            </div>
          </div>

          {/* Last Spin Result banner */}
          {lastResult && (
            <div
              className={`mt-4 px-4 py-2 rounded-lg text-center text-xs font-semibold animate-in zoom-in-95 duration-200 ${
                lastResult.multiplier > 0
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}
            >
              {lastResult.multiplier > 0 ? (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {lastResult.outcome} ({lastResult.multiplier}x)! Payout:{' '}
                    <span className="font-mono tabular-nums text-amber-300 font-bold">
                      ₱{lastResult.payout.toFixed(2)}
                    </span>{' '}
                    (Net: +₱{lastResult.playerProfit.toFixed(2)})
                  </span>
                </div>
              ) : (
                <span>No win this round. Spin again to try your luck!</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Bet Controls & Table Limits (NO PROBABILITIES SHOWN) */}
        <div className="flex-1 w-full max-w-md space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="bet-input" className="text-xs font-semibold text-slate-300">
                Wager Amount
              </label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                Limits: ₱50.00 – ₱300.00
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
              <input
                id="bet-input"
                type="number"
                min="50"
                max="300"
                step="10"
                disabled={isSpinning}
                value={betAmount || ''}
                onChange={e => {
                  setErrorMsg(null);
                  setBetAmount(Number(e.target.value));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white font-mono text-base font-semibold focus:outline-none focus:border-emerald-400 transition-colors disabled:opacity-50"
                placeholder="50"
              />
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div>
            <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Quick Presets</span>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 300].map(amount => (
                <button
                  key={amount}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => handleQuickBet(amount)}
                  className={`py-1.5 px-2 text-xs font-mono font-semibold rounded-lg border transition-colors ${
                    betAmount === amount
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  } disabled:opacity-50`}
                >
                  ₱{amount}
                </button>
              ))}
            </div>
          </div>

          {/* Validation Error Notice */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Spin Action Button */}
          <button
            type="button"
            disabled={isSpinning}
            onClick={handleSpin}
            className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSpinning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Spinning MariaDB Reel...</span>
              </>
            ) : (
              <span>Spin Roulette (₱{betAmount || 0})</span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
