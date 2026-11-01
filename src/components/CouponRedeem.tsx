import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Gift, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface CouponRedeemProps {
  onBalanceUpdate: (newBalance: number) => void;
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export const CouponRedeem: React.FC<CouponRedeemProps> = ({
  onBalanceUpdate,
  onRequireAuth,
  isAuthenticated,
}) => {
  const [couponCode, setCouponCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Countdown timer for 5-second anti-spam lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (lockoutSeconds > 0) return;

    if (!couponCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.redeemCoupon(couponCode.trim().toUpperCase());
      setMessage({
        type: 'success',
        text: `Coupon applied! Credited ₱${Number(res.rewardAmount).toFixed(2)} to your balance.`,
      });
      setCouponCode('');
      onBalanceUpdate(res.newBalance);
    } catch (err: any) {
      // Rule 4E: Anti-Spam Lockout: enforce strict 5-second countdown timer
      const errorText = err.message || 'Invalid or already used coupon code.';
      setMessage({
        type: 'error',
        text: `${errorText} Security lockout active for 5 seconds.`,
      });
      setLockoutSeconds(5);
    } finally {
      setIsSubmitting(false); // Rule 2: Loading in finally
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
          <Gift className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Redeem Promo Coupon</h3>
          <p className="text-[11px] text-slate-400">
            Enter an official Bit Finance single-use code to credit instant bonus funds.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/40 border border-red-800/50 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={isLocked || isSubmitting}
            value={couponCode}
            onChange={e => setCouponCode(e.target.value.toUpperCase())}
            placeholder={isLocked ? `Locked for ${lockoutSeconds}s...` : 'ENTER COUPON (e.g. BITWELCOME50)'}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-white font-mono uppercase text-xs tracking-wider focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isLocked && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{lockoutSeconds}s</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLocked || isSubmitting || !couponCode.trim()}
          className="py-2 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : isLocked ? (
            <span>Wait ({lockoutSeconds}s)</span>
          ) : (
            <span>Redeem Code</span>
          )}
        </button>
      </form>
    </div>
  );
};
