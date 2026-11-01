import React from 'react';
import { ExternalLink, X, MessageCircle } from 'lucide-react';
import { PublicSettings } from '../types';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PublicSettings | null;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const chatLink = settings?.communityChatLink || 'https://t.me/BitFinanceOfficialPH';
  const qrUrl = settings?.communityQrUrl || '/src/assets/images/community_qr_code_1793520764853.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Welcome to Bit Finance VIP
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Connect directly with verified Philippine real estate investors, instant announcements, and 24/7 dedicated assistance.
          </p>
        </div>

        {/* Dedicated Community QR Code */}
        <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center mb-6 max-w-[220px] mx-auto shadow-inner">
          <img
            src={qrUrl}
            alt="Official Bit Finance Community Group QR"
            className="w-44 h-44 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-medium text-slate-500 mt-2">
            Scan to Join VIP Community Group
          </span>
        </div>

        <div className="space-y-3">
          <a
            href={chatLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm transition-colors shadow-sm"
          >
            <span>Join Community</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
          >
            Close & Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
