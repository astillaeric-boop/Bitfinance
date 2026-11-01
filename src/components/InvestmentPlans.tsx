import React, { useState } from 'react';
import { InvestmentPlan, User } from '../types';
import { api } from '../lib/api';
import { CheckCircle2, Building2, TrendingUp, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface InvestmentPlansProps {
  plans: InvestmentPlan[];
  user: User | null;
  onPlanPurchased: (newBalance: number) => void;
  onRequireAuth: () => void;
  onOpenDeposit: () => void;
}

export const InvestmentPlans: React.FC<InvestmentPlansProps> = ({
  plans,
  user,
  onPlanPurchased,
  onRequireAuth,
  onOpenDeposit,
}) => {
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [purchaseErrorMessage, setPurchaseErrorMessage] = useState<string | null>(null);

  const handleBuy = async (plan: InvestmentPlan) => {
    setPurchaseSuccessMessage(null);
    setPurchaseErrorMessage(null);

    if (!user) {
      onRequireAuth();
      return;
    }

    if (Number(user.balance) < plan.cost) {
      setPurchaseErrorMessage(
        `Insufficient balance. You need ₱${plan.cost.toFixed(2)}, but have ₱${Number(user.balance).toFixed(2)}. Please deposit first.`
      );
      return;
    }

    setPurchasingPlanId(plan.id);

    try {
      const res = await api.buyPlan(plan.id);
      setPurchaseSuccessMessage(
        `Successfully subscribed to ${plan.name}! Your first yield cycle will accrue in 24 hours.`
      );
      onPlanPurchased(res.newBalance);
    } catch (err: any) {
      setPurchaseErrorMessage(err.message || 'Failed to complete investment transaction.');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  return (
    <section className="space-y-6">
      {/* Hero Showcase Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_real_estate_1793520764833.jpg"
            alt="Prime Metro Manila BGC Commercial Real Estate"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Institutional Real Estate Portfolio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            High-Yield Commercial Real Estate Investments
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Participate in prime commercial corridors and high-density residential portfolios across Metro Manila. Daily returns are calculated and credited automatically every 24 hours directly to your account.
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Termux MariaDB Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Daily Automated Cycles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>GCash & Maya Instant Settlement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {purchaseSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-sm flex items-center justify-between">
          <span>{purchaseSuccessMessage}</span>
          <button
            onClick={() => setPurchaseSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {purchaseErrorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-center justify-between">
          <span>{purchaseErrorMessage}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDeposit}
              className="px-2.5 py-1 bg-red-800/40 hover:bg-red-800/60 rounded text-xs font-bold text-red-200"
            >
              Deposit Funds
            </button>
            <button
              onClick={() => setPurchaseErrorMessage(null)}
              className="text-red-400 hover:text-red-200 text-xs ml-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Real Estate Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isBuying = purchasingPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 tracking-wide">
                      {plan.category}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {plan.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Investment</span>
                    <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                      ₱{plan.cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Return Metrics */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Daily Yield</span>
                    <span className="text-base font-mono font-bold text-white tabular-nums">
                      ₱{plan.dailyReturn.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      <span className="text-[11px] text-slate-500 font-sans">/day</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Contract Duration</span>
                    <span className="text-base font-mono font-bold text-white tabular-nums">
                      {plan.days} <span className="text-[11px] text-slate-500 font-sans">days</span>
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Return:</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      ₱{plan.totalReturn.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Feature highlights */}
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  type="button"
                  disabled={isBuying}
                  onClick={() => handleBuy(plan)}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Purchasing Plan...</span>
                    </>
                  ) : (
                    <>
                      <span>Invest ₱{plan.cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
