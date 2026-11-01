import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { TickerItem } from '../types';
import { Zap } from 'lucide-react';

export const LiveWinningsTicker: React.FC = () => {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadTicker() {
      try {
        const items = await api.getRouletteTicker();
        if (mounted && items.length > 0) {
          setTickerItems(items);
        } else if (mounted && items.length === 0) {
          // Default initial wins feed if database table is fresh
          setTickerItems([
            { id: 1, text: '****8912 won ₱1,200.00 (4x)!', payout: 1200, multiplier: 4, outcome: 'Big Win', time: new Date().toISOString() },
            { id: 2, text: '****4451 won ₱300.00 (2x)!', payout: 300, multiplier: 2, outcome: 'Win', time: new Date().toISOString() },
            { id: 3, text: '****7029 won ₱2,000.00 (10x)!', payout: 2000, multiplier: 10, outcome: 'Mega Jackpot', time: new Date().toISOString() },
            { id: 4, text: '****9183 won ₱225.00 (1.5x)!', payout: 225, multiplier: 1.5, outcome: 'Small Win', time: new Date().toISOString() },
            { id: 5, text: '****3801 won ₱600.00 (2x)!', payout: 600, multiplier: 2, outcome: 'Win', time: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.warn('Ticker load notice:', err);
      }
    }

    loadTicker();
    const interval = setInterval(loadTicker, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (tickerItems.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden py-2 px-3 mb-6 flex items-center gap-3 shadow-inner">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 shrink-0 uppercase tracking-wider pl-1">
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>Live Winnings</span>
      </div>

      <div className="w-px h-4 bg-slate-800 shrink-0" />

      {/* Marquee ticker container */}
      <div className="overflow-hidden relative flex-1 whitespace-nowrap">
        <div className="inline-flex gap-8 animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
          {tickerItems.concat(tickerItems).map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-2 text-xs font-mono text-slate-300"
            >
              <span className="text-slate-400 font-sans">{item.text.split(' won ')[0]}</span>
              <span className="text-slate-500 font-sans">won</span>
              <span className="font-bold text-amber-300 tabular-nums">
                {item.text.split(' won ')[1] || `₱${item.payout}`}
              </span>
              <span className="text-slate-600">·</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
