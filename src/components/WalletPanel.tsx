import React, { useState, useEffect } from 'react';
import { User, Deposit, Withdrawal, PublicSettings, Investment } from '../types';
import { api } from '../lib/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  QrCode,
  FileCheck,
  Loader2,
} from 'lucide-react';

interface WalletPanelProps {
  user: User | null;
  settings: PublicSettings | null;
  investments: Investment[];
  onBalanceUpdate: (newBal: number) => void;
  onRefreshUser: () => void;
  defaultTab?: 'deposit' | 'withdraw' | 'payout' | 'history';
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  user,
  settings,
  investments,
  onBalanceUpdate,
  onRefreshUser,
  defaultTab = 'deposit',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'deposit' | 'withdraw' | 'payout' | 'history'>(defaultTab);

  // Payout Binding State
  const [payoutMethod, setPayoutMethod] = useState<'GCash' | 'Maya'>(
    user?.withdrawalMethod === 'Maya' ? 'Maya' : 'GCash'
  );
  const [accountName, setAccountName] = useState<string>(user?.accountName || '');
  const [accountNumber, setAccountNumber] = useState<string>(user?.accountNumber || '');
  const [isSavingPayout, setIsSavingPayout] = useState<boolean>(false);
  const [payoutNotice, setPayoutNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
  const [depositNotice, setDepositNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('150');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [withdrawNotice, setWithdrawNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // History State
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Sync user payout info when user updates
  useEffect(() => {
    if (user?.withdrawalMethod) setPayoutMethod(user.withdrawalMethod as 'GCash' | 'Maya');
    if (user?.accountName) setAccountName(user.accountName);
    if (user?.accountNumber) setAccountNumber(user.accountNumber);
  }, [user]);

  // Load history when tab is opened
  const loadHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const [depList, withList] = await Promise.all([api.getMyDeposits(), api.getMyWithdrawals()]);
      setDeposits(depList);
      setWithdrawals(withList);
    } catch (err) {
      console.error('Error loading transaction history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  // 1. Save Payout Method with explicit try/catch/finally
  const handleSavePayoutMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutNotice(null);

    if (!accountName.trim() || !accountNumber.trim()) {
      setPayoutNotice({ type: 'error', text: 'Please fill in both Account Name and Mobile/Account Number.' });
      return;
    }

    setIsSavingPayout(true);
    try {
      await api.updatePayoutMethod(payoutMethod, accountName.trim(), accountNumber.trim());
      setPayoutNotice({
        type: 'success',
        text: `Your ${payoutMethod} account has been bound successfully for instant withdrawals.`,
      });
      onRefreshUser();
    } catch (err: any) {
      setPayoutNotice({ type: 'error', text: err.message || 'Failed to save payout method.' });
    } finally {
      setIsSavingPayout(false); // Rule 2: Loading state in finally block to prevent infinite hanging
    }
  };

  // 2. Submit Deposit Proof with explicit try/catch/finally
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositNotice(null);

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 50) {
      setDepositNotice({ type: 'error', text: 'Minimum deposit amount is ₱50.00.' });
      return;
    }

    if (!proofFile) {
      setDepositNotice({
        type: 'error',
        text: 'Please select a screenshot of your GCash / Maya payment receipt.',
      });
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      const res = await api.submitDeposit(amount, proofFile);
      setDepositNotice({
        type: 'success',
        text: 'Deposit proof uploaded successfully! Your deposit is queued for manual admin verification.',
      });
      setProofFile(null);
      // Reset input file element
      const fileInput = document.getElementById('proof-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadHistory();
    } catch (err: any) {
      setDepositNotice({ type: 'error', text: err.message || 'Failed to submit deposit proof.' });
    } finally {
      setIsSubmittingDeposit(false); // Rule 2: Explicit finally block prevents infinite hang
    }
  };

  // 3. Submit Withdrawal Request with explicit try/catch/finally
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawNotice(null);

    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      setWithdrawNotice({ type: 'error', text: 'Minimum withdrawal limit is ₱100.00.' });
      return;
    }

    if (!user?.withdrawalMethod || !user?.accountName || !user?.accountNumber) {
      setWithdrawNotice({
        type: 'error',
        text: 'Please bind your GCash or Maya payout account first before requesting withdrawals.',
      });
      setActiveSubTab('payout');
      return;
    }

    const hasActivePlan = investments.some(i => i.daysRemaining > 0);
    if (!hasActivePlan) {
      setWithdrawNotice({
        type: 'error',
        text: 'Withdrawal condition not met: You must hold at least one active investment plan.',
      });
      return;
    }

    if (Number(user.balance) < amount) {
      setWithdrawNotice({
        type: 'error',
        text: `Insufficient wallet balance. You have ₱${Number(user.balance).toFixed(2)}, requested ₱${amount.toFixed(2)}.`,
      });
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await api.submitWithdrawal(amount);
      setWithdrawNotice({
        type: 'success',
        text: 'Withdrawal request submitted! Note: Withdrawals are processed manually and take approximately 2 hours to receive.',
      });
      onBalanceUpdate(res.newBalance);
      loadHistory();
    } catch (err: any) {
      setWithdrawNotice({ type: 'error', text: err.message || 'Failed to submit withdrawal request.' });
    } finally {
      setIsSubmittingWithdraw(false); // Rule 2: Explicit finally block
    }
  };

  const activeDepositQrUrl = settings?.activeDepositQrUrl || '/src/assets/images/deposit_qr_code_1793520765365.jpg';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Wallet Balance Header */}
      <div className="bg-slate-950 p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            MariaDB Relational Wallet
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              ₱{Number(user?.balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              PHP Active
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveSubTab('deposit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'deposit'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deposit (QR)
          </button>
          <button
            onClick={() => setActiveSubTab('withdraw')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'withdraw'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdraw
          </button>
          <button
            onClick={() => setActiveSubTab('payout')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'payout'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prepaid Binding
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* =========================================
            SUBTAB 1: DEPOSIT (QR & PROOF UPLOAD)
            ========================================= */}
        {activeSubTab === 'deposit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Official Deposit QR from settings table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>Official Deposit QR (GCash / Maya)</span>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md max-w-[240px]">
                <img
                  src={activeDepositQrUrl}
                  alt="Official Bit Finance Deposit QR Code"
                  className="w-52 h-52 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Instructions:</p>
                <p>1. Open your GCash or Maya application.</p>
                <p>2. Scan the official payment QR code above and transfer desired amount (Min ₱50).</p>
                <p>3. Take a screenshot of the completed payment receipt.</p>
                <p>4. Upload the screenshot on the right to verify your deposit.</p>
              </div>
            </div>

            {/* Right: Upload Deposit Proof Form */}
            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <h3 className="text-base font-bold text-white">Submit Payment Proof</h3>

              {depositNotice && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    depositNotice.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                      : 'bg-red-950/40 border border-red-800/50 text-red-300'
                  }`}
                >
                  {depositNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span>{depositNotice.text}</span>
                </div>
              )}

              <div>
                <label htmlFor="deposit-amount-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Deposit Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                  <input
                    id="deposit-amount-input"
                    type="number"
                    min="50"
                    step="10"
                    required
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Payment Receipt Screenshot
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg p-4 text-center cursor-pointer bg-slate-950/60 transition-colors">
                  <input
                    type="file"
                    id="proof-upload"
                    accept="image/*"
                    required
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setProofFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <div className="text-xs text-slate-300">
                      {proofFile ? (
                        <span className="text-emerald-400 font-semibold">{proofFile.name}</span>
                      ) : (
                        <span>Click to choose screenshot or drag and drop</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">PNG, JPG, or JPEG (Max 10MB)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmittingDeposit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Submitting to Termux Storage...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Verify Deposit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================
            SUBTAB 2: WITHDRAWAL FLOW
            ========================================= */}
        {activeSubTab === 'withdraw' && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Withdrawal Settlement</h3>
              <p className="text-xs text-slate-400">
                Direct bank settlement to your bound Philippine digital wallet.
              </p>
            </div>

            {/* Disclaimer notice on screen */}
            <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300 mb-0.5">Processing Notice:</p>
                <p className="leading-relaxed">
                  Withdrawals are processed manually and take approximately 2 hours to receive.
                </p>
              </div>
            </div>

            {withdrawNotice && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  withdrawNotice.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/50 text-red-300'
                }`}
              >
                {withdrawNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                )}
                <span>{withdrawNotice.text}</span>
              </div>
            )}

            {/* Account Binding Status */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payout Channel:</span>
                <span className="font-bold text-white">{user?.withdrawalMethod || 'Not bound yet'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Name:</span>
                <span className="font-semibold text-slate-200">{user?.accountName || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mobile / Account Number:</span>
                <span className="font-mono text-slate-200">{user?.accountNumber || '—'}</span>
              </div>
              {!user?.withdrawalMethod && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('payout')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold pt-1 underline"
                >
                  Configure GCash / Maya details first →
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="withdraw-amount-input" className="text-xs font-semibold text-slate-300">
                    Withdrawal Amount (₱)
                  </label>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">Minimum: ₱100.00</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min="100"
                    step="10"
                    required
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="150"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmittingWithdraw ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Request Payout (₱{Number(withdrawAmount || 0).toFixed(2)})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================
            SUBTAB 3: PREPAID PAYOUT BINDING
            ========================================= */}
        {activeSubTab === 'payout' && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Prepaid Digital Wallet Binding</h3>
              <p className="text-xs text-slate-400">
                Bind your verified GCash or Maya mobile wallet account to receive instant investment dividends and withdrawals.
              </p>
            </div>

            {payoutNotice && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  payoutNotice.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/50 text-red-300'
                }`}
              >
                {payoutNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                )}
                <span>{payoutNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSavePayoutMethod} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Payout Channel
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('GCash')}
                    className={`p-3 rounded-lg border text-xs font-bold transition-all text-center ${
                      payoutMethod === 'GCash'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('Maya')}
                    className={`p-3 rounded-lg border text-xs font-bold transition-all text-center ${
                      payoutMethod === 'Maya'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Maya
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="account-name-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Full Registered Account Name
                </label>
                <input
                  id="account-name-input"
                  type="text"
                  required
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label htmlFor="account-number-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Mobile / Account Number
                </label>
                <input
                  id="account-number-input"
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPayout}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {isSavingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Saving Account...</span>
                  </>
                ) : (
                  <span>Save Payout Method</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================
            SUBTAB 4: TRANSACTION HISTORY
            ========================================= */}
        {activeSubTab === 'history' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  <span>Deposit History</span>
                </h4>
                <button onClick={loadHistory} className="text-xs text-emerald-400 hover:text-emerald-300">
                  ↻ Refresh
                </button>
              </div>

              {deposits.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center bg-slate-950 rounded-lg">
                  No deposit records found in MariaDB.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {deposits.map(d => (
                        <tr key={d.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-400">#{d.id}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-400 tabular-nums">
                            +₱{Number(d.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`text-[11px] font-semibold ${
                                d.status === 'approved'
                                  ? 'text-emerald-400'
                                  : d.status === 'rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {d.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                <span>Withdrawal History</span>
              </h4>

              {withdrawals.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center bg-slate-950 rounded-lg">
                  No withdrawal records found in MariaDB.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Channel</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {withdrawals.map(w => (
                        <tr key={w.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-400">#{w.id}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-300 tabular-nums">
                            -₱{Number(w.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">
                            {w.withdrawalMethod} ({w.accountNumber})
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`text-[11px] font-semibold ${
                                w.status === 'approved' || w.status === 'paid'
                                  ? 'text-emerald-400'
                                  : w.status === 'rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {w.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
