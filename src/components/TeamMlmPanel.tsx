import React, { useState, useEffect } from 'react';
import { User, PublicSettings, TeamData } from '../types';
import { api } from '../lib/api';
import {
  Users,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Share2,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface TeamMlmPanelProps {
  user: User | null;
  settings: PublicSettings | null;
  onRequireAuth: () => void;
}

export const TeamMlmPanel: React.FC<TeamMlmPanelProps> = ({
  user,
  settings,
  onRequireAuth,
}) => {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function loadTeam() {
      setIsLoading(true);
      try {
        const data = await api.getTeamData();
        if (isMounted) setTeamData(data);
      } catch (err) {
        console.error('Failed to load team data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadTeam();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <Users className="w-10 h-10 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Join the Bit Finance Partner Network</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Sign in to access your unique referral code, track 3-level affiliate yields, and join the official Philippine VIP community.
        </p>
        <button
          onClick={onRequireAuth}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase rounded-lg transition-colors"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const referralCode = user.referralCode;
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  const communityChatLink = settings?.communityChatLink || 'https://t.me/BitFinanceOfficialPH';
  const communityQrUrl = settings?.communityQrUrl || '/src/assets/images/community_qr_code_1793520764853.jpg';

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <section className="space-y-6">
      {/* Referral Link & Share Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
              Affiliate Partnership
            </span>
            <h2 className="text-xl font-bold text-white">Your Unique Referral Link</h2>
            <p className="text-xs text-slate-400">
              New registered users receive an instant ₱30.00 signup bonus when entering your code.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">My Code:</span>
            <button
              onClick={() => copyToClipboard(referralCode, 'code')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-emerald-300 text-sm hover:border-emerald-500 transition-colors"
            >
              <span>{referralCode}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Full URL Copy Field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none"
          />
          <button
            onClick={() => copyToClipboard(referralLink, 'link')}
            className="py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* 4B: First-Plan-Only Commission Rule Banner */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Strict First-Plan-Only MLM Commission Rule</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Multi-level commissions are paid out to uplines <span className="text-slate-200 font-semibold">only on a referred user's very first investment plan purchase</span>. Subsequent plan purchases by the same referral yield zero commission to uplines.
          </p>
        </div>
      </div>

      {/* 3-Level Commission Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Level 1 (Direct)</span>
            <span className="text-lg font-mono font-bold text-emerald-400">30% Yield</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Invited:</span>
              <span className="font-mono text-white font-bold">{teamData?.level1.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active First-Plan Investors:</span>
              <span className="font-mono text-emerald-300 font-bold">
                {teamData?.level1.activeInvestors ?? 0}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            Earn 30% of their very first investment plan purchase.
          </div>
        </div>

        {/* Level 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Level 2 (Indirect)</span>
            <span className="text-lg font-mono font-bold text-amber-400">3% Yield</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Sub-Affiliates:</span>
              <span className="font-mono text-white font-bold">{teamData?.level2.count ?? 0}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            Earn 3% on friends invited by your Level 1 referrals.
          </div>
        </div>

        {/* Level 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Level 3 (Network)</span>
            <span className="text-lg font-mono font-bold text-blue-400">2% Yield</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Network Affiliates:</span>
              <span className="font-mono text-white font-bold">{teamData?.level3.count ?? 0}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            Earn 2% on friends invited by your Level 2 referrals.
          </div>
        </div>
      </div>

      {/* 3. Community Chat & Dedicated QR Integration (Permanently Displayed in Team Panel) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <MessageCircle className="w-4 h-4" />
            <span>Official Investor Community Hub</span>
          </div>
          <h3 className="text-lg font-bold text-white">Join 15,000+ Verified Philippine Investors</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Get instant support, deposit receipts verification announcements, community giveaways, and strategy discussions directly inside our dedicated Telegram and WhatsApp group channels.
          </p>

          <div className="pt-2">
            <a
              href={communityChatLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              <span>Open VIP Community Chat</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Dedicated Community QR Code */}
        <div className="bg-white p-3.5 rounded-xl shadow-lg flex flex-col items-center justify-center shrink-0">
          <img
            src={communityQrUrl}
            alt="Official Community QR Code"
            className="w-40 h-40 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-semibold text-slate-600 mt-2">
            Scan to Join Community
          </span>
        </div>
      </div>
    </section>
  );
};
