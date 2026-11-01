import React, { useState, useEffect } from 'react';
import { api, getAdminToken, setAdminToken } from '../lib/api';
import { Deposit, Withdrawal, Coupon, RouletteLog } from '../types';
import {
  ShieldAlert,
  Database,
  QrCode,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  RotateCcw,
  CheckCircle,
  XCircle,
  Upload,
  LogOut,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
  Layers,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAdminToken());
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active Admin Subview
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'coupons' | 'roulette' | 'settings' | 'database'>('deposits');

  // Admin Data States
  const [stats, setStats] = useState<any>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [rouletteLogs, setRouletteLogs] = useState<RouletteLog[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form states for QR & Settings
  const [chatLinkInput, setChatLinkInput] = useState<string>('');
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponAmount, setNewCouponAmount] = useState<string>('100');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await api.adminLogin(username, password);
      setIsAuthenticated(true);
      loadAllAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setIsAuthenticated(false);
  };

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, depRes, withRes, coupRes, rLogsRes, setRes, dbRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminDeposits(),
        api.getAdminWithdrawals(),
        api.getAdminCoupons(),
        api.getAdminRouletteLogs(),
        api.getAdminSettings(),
        api.getDbStatus(),
      ]);

      setStats(statsRes);
      setDeposits(depRes);
      setWithdrawals(withRes);
      setCoupons(coupRes);
      setRouletteLogs(rLogsRes);
      setSettings(setRes);
      setChatLinkInput(setRes.communityChatLink || '');
      setDbStatus(dbRes);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllAdminData();
    }
  }, [isAuthenticated]);

  // Actions: Approve Deposit
  const handleApproveDeposit = async (id: number) => {
    setIsProcessingAction(true);
    setActionNotice(null);
    try {
      await api.approveDeposit(id);
      setActionNotice(`Deposit #${id} approved and credited to user balance.`);
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Reject Deposit
  const handleRejectDeposit = async (id: number) => {
    setIsProcessingAction(true);
    setActionNotice(null);
    try {
      await api.rejectDeposit(id);
      setActionNotice(`Deposit #${id} rejected.`);
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Update Withdrawal
  const handleUpdateWithdrawal = async (id: number, status: 'approved' | 'paid' | 'rejected') => {
    setIsProcessingAction(true);
    setActionNotice(null);
    try {
      await api.updateAdminWithdrawal(id, status);
      setActionNotice(`Withdrawal #${id} status updated to ${status}.`);
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || Number(newCouponAmount) <= 0) return;

    setIsProcessingAction(true);
    setActionNotice(null);
    try {
      await api.createAdminCoupon(newCouponCode.trim().toUpperCase(), Number(newCouponAmount));
      setActionNotice(`Coupon code ${newCouponCode.toUpperCase()} generated!`);
      setNewCouponCode('');
      setNewCouponAmount('100');
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Error creating coupon: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Update Chat Link
  const handleUpdateChatLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingAction(true);
    try {
      await api.updateAdminSettingsText({ communityChatLink: chatLinkInput.trim() });
      setActionNotice('Community Chat Link updated successfully.');
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Upload Official Deposit QR to Termux storage
  const handleUploadDepositQr = async (file: File) => {
    setIsProcessingAction(true);
    try {
      const res = await api.uploadDepositQr(file);
      setActionNotice('Official Payment Deposit QR updated in Termux storage.');
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Upload failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Actions: Upload Dedicated Community QR to Termux storage
  const handleUploadCommunityQr = async (file: File) => {
    setIsProcessingAction(true);
    try {
      const res = await api.uploadCommunityQr(file);
      setActionNotice('VIP Community QR Code updated in Termux storage.');
      await loadAllAdminData();
    } catch (err: any) {
      setActionNotice(`Upload failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // If not logged into admin, display login screen without any username/password hints
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Administrative Portal</h1>
            <p className="text-xs text-slate-400">Restricted Management Console</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-username-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Admin Identifier
              </label>
              <input
                id="admin-username-input"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label htmlFor="admin-password-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Security Passcode
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <span>Access Console</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const processedDeposits = deposits.filter(d => d.status !== 'pending');

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const processedWithdrawals = withdrawals.filter(w => w.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
            ⚙
          </div>
          <span className="font-bold text-white text-sm tracking-tight">
            Bit Finance Admin Console <span className="text-xs font-mono text-slate-400 ml-2">/admin2026</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllAdminData}
            title="Refresh All Data"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Total Users</span>
            <span className="text-lg font-mono font-bold text-white tabular-nums">
              {stats?.totalUsers ?? '—'}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Pending Deposits</span>
            <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
              {pendingDeposits.length}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Pending Payouts</span>
            <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
              {pendingWithdrawals.length}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Approved Deposits</span>
            <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
              ₱{Number(stats?.totalDepositVolume || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Paid Withdrawals</span>
            <span className="text-lg font-mono font-bold text-slate-200 tabular-nums">
              ₱{Number(stats?.totalWithdrawalVolume || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block">Roulette House Net</span>
            <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
              ₱{Number(stats?.houseRouletteProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Global Action Notice */}
        {actionNotice && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="font-bold ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Admin Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deposit Queue ({pendingDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdrawal Queue ({pendingWithdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Coupon Codes ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab('roulette')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'roulette'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roulette Audit Logs ({rouletteLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QR & Community Management
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MariaDB Diagnostics
          </button>
        </div>

        {/* =======================================
            TAB 1: DEPOSITS VERIFICATION QUEUE
            ======================================= */}
        {activeTab === 'deposits' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Pending Deposit Queue</h3>
              <p className="text-xs text-slate-400 mb-4">
                Verify payment transaction screenshots and execute atomic one-click approvals to credit user balances.
              </p>

              {pendingDeposits.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                  No pending deposits awaiting verification.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDeposits.map(d => (
                    <div
                      key={d.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-500">Deposit #{d.id}</span>
                          <h4 className="text-sm font-bold text-white">{d.mobileNumber}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">UID: {d.userId}</span>
                        </div>
                        <span className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
                          ₱{Number(d.amount).toFixed(2)}
                        </span>
                      </div>

                      {/* Payment Screenshot Preview */}
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 max-h-56 overflow-hidden flex items-center justify-center">
                        <img
                          src={d.proofImageUrl}
                          alt={`Proof for deposit #${d.id}`}
                          className="max-h-52 object-contain rounded"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<span class="text-xs text-slate-500">Screenshot stored in Termux directory</span>';
                          }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Submitted: {new Date(d.createdAt).toLocaleString()}</span>
                        <a
                          href={d.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>Full Image</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleApproveDeposit(d.id)}
                          className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>One-Click Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleRejectDeposit(d.id)}
                          className="py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historical Processed Deposits */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Historical Processed Deposits</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {processedDeposits.slice(0, 25).map(d => (
                      <tr key={d.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-4 text-slate-400">#{d.id}</td>
                        <td className="py-2 px-4 text-slate-200 font-sans">{d.mobileNumber}</td>
                        <td className="py-2 px-4 font-bold text-emerald-400 tabular-nums">
                          ₱{Number(d.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 font-sans">
                          <span
                            className={`font-semibold ${
                              d.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-400 text-[11px]">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            TAB 2: WITHDRAWAL PROCESSING QUEUE
            ======================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Pending Withdrawal Requests</h3>
              <p className="text-xs text-slate-400 mb-4">
                Execute manual bank payouts to user GCash or Maya accounts and update status in MariaDB.
              </p>

              {pendingWithdrawals.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                  No pending withdrawals currently awaiting processing.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingWithdrawals.map(w => (
                    <div
                      key={w.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-500">Withdrawal #{w.id}</span>
                          <h4 className="text-sm font-bold text-white">{w.mobileNumber}</h4>
                        </div>
                        <span className="text-xl font-mono font-bold text-amber-300 tabular-nums">
                          ₱{Number(w.amount).toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Target Channel:</span>
                          <span className="font-bold text-white">{w.withdrawalMethod}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Account Name:</span>
                          <span className="font-semibold text-slate-200">{w.accountName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Account / Mobile Number:</span>
                          <span className="font-mono text-emerald-400 font-bold">{w.accountNumber}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateWithdrawal(w.id, 'paid')}
                          className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark as Paid</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateWithdrawal(w.id, 'rejected')}
                          className="py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Reject & Refund</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historical Withdrawals */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Historical Processed Withdrawals</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Method & Account</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {processedWithdrawals.slice(0, 25).map(w => (
                      <tr key={w.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-4 text-slate-400">#{w.id}</td>
                        <td className="py-2 px-4 text-slate-200 font-sans">{w.mobileNumber}</td>
                        <td className="py-2 px-4 font-bold text-amber-300 tabular-nums">
                          ₱{Number(w.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-slate-300 font-sans">
                          {w.withdrawalMethod} - {w.accountName} ({w.accountNumber})
                        </td>
                        <td className="py-2 px-4 font-sans">
                          <span
                            className={`font-semibold ${
                              w.status === 'paid' || w.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-400 text-[11px]">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            TAB 3: COUPON MANAGEMENT
            ======================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* Create New Coupon */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-bold text-white mb-1">Generate Single-Use Promo Coupon</h3>
              <p className="text-xs text-slate-400 mb-4">
                Creates an uppercase one-time coupon saved directly to MariaDB `coupons` table.
              </p>

              <form onSubmit={handleCreateCoupon} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label htmlFor="coupon-code-input" className="text-xs font-semibold text-slate-300 block mb-1">
                    Coupon Code (Uppercase)
                  </label>
                  <input
                    id="coupon-code-input"
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SPECIAL300"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-white font-mono uppercase text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="w-full sm:w-44">
                  <label htmlFor="coupon-amount-input" className="text-xs font-semibold text-slate-300 block mb-1">
                    Bonus Value (₱)
                  </label>
                  <input
                    id="coupon-amount-input"
                    type="number"
                    min="1"
                    required
                    value={newCouponAmount}
                    onChange={e => setNewCouponAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="self-end w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isProcessingAction}
                    className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Generate Coupon
                  </button>
                </div>
              </form>
            </div>

            {/* Coupons Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Coupons & Redemption Audit</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Redemption Status</th>
                      <th className="py-2.5 px-4">Redeemed By</th>
                      <th className="py-2.5 px-4">Redeemed At</th>
                      <th className="py-2.5 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {coupons.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-bold text-white">{c.code}</td>
                        <td className="py-2.5 px-4 font-bold text-amber-300 tabular-nums">
                          ₱{Number(c.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          {c.isUsed ? (
                            <span className="text-red-400 font-semibold">REDEEMED</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">ACTIVE</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">{c.usedBy || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {c.usedAt ? new Date(c.usedAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            TAB 4: ROULETTE AUDIT LOGS
            ======================================= */}
        {activeTab === 'roulette' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Roulette Audit Logs</h3>
              <p className="text-xs text-slate-400">
                Audited real-time spin records directly from MariaDB `roulette_logs` table.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Log #</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4">Bet</th>
                    <th className="py-2.5 px-4">Outcome</th>
                    <th className="py-2.5 px-4">Mult</th>
                    <th className="py-2.5 px-4">Payout</th>
                    <th className="py-2.5 px-4">Player Net</th>
                    <th className="py-2.5 px-4">House Net</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {rouletteLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-4 text-slate-400">#{l.id}</td>
                      <td className="py-2 px-4 text-slate-200">{l.mobileNumber}</td>
                      <td className="py-2 px-4 font-bold text-white tabular-nums">₱{Number(l.betAmount).toFixed(2)}</td>
                      <td className="py-2 px-4 font-sans font-semibold text-slate-300">{l.outcome}</td>
                      <td className="py-2 px-4 text-amber-300 font-bold tabular-nums">{l.multiplier}x</td>
                      <td className="py-2 px-4 font-bold text-emerald-400 tabular-nums">
                        ₱{Number(l.payout).toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-4 font-bold tabular-nums ${
                          Number(l.playerProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {Number(l.playerProfit) >= 0 ? '+' : ''}₱{Number(l.playerProfit).toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-4 font-bold tabular-nums ${
                          Number(l.houseProfit) >= 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {Number(l.houseProfit) >= 0 ? '+' : ''}₱{Number(l.houseProfit).toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-slate-400 text-[11px]">
                        {new Date(l.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =======================================
            TAB 5: QR & COMMUNITY MANAGEMENT
            ======================================= */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Official Deposit Payment QR */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Official Deposit QR (Termux Path)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Uploaded QR code is stored in Termux storage at <code className="font-mono text-emerald-300">/storage/emulated/0/BitFinance/uploads/admin-qr/</code> and updates <code className="font-mono text-emerald-300">activeDepositQrUrl</code> in the settings table.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl flex flex-col items-center justify-center">
                <img
                  src={settings.activeDepositQrUrl || '/src/assets/images/deposit_qr_code_1793520765365.jpg'}
                  alt="Current Deposit QR"
                  className="w-44 h-44 object-contain bg-white p-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Upload Replacement Deposit QR
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadDepositQr(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            </div>

            {/* 2. Community QR & Community Chat Link (Dedicated & Separate!) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">VIP Community Settings</h3>
              </div>
              <p className="text-xs text-slate-400">
                Managed separately in <code className="font-mono text-blue-300">communityQrUrl</code> and <code className="font-mono text-blue-300">communityChatLink</code> and never mixed with payment QR.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl flex flex-col items-center justify-center">
                <img
                  src={settings.communityQrUrl || '/src/assets/images/community_qr_code_1793520764853.jpg'}
                  alt="Current Community QR"
                  className="w-44 h-44 object-contain bg-white p-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Upload Replacement Community QR
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadCommunityQr(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <form onSubmit={handleUpdateChatLink} className="space-y-2 pt-2 border-t border-slate-800">
                <label htmlFor="chat-link-input" className="text-xs font-semibold text-slate-300 block">
                  Community Chat URL (Telegram / WhatsApp)
                </label>
                <div className="flex gap-2">
                  <input
                    id="chat-link-input"
                    type="url"
                    required
                    value={chatLinkInput}
                    onChange={e => setChatLinkInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={isProcessingAction}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Save Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =======================================
            TAB 6: MARIADB DIAGNOSTICS & STATUS
            ======================================= */}
        {activeTab === 'database' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Termux MariaDB Connection & Pool Diagnostics</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time connection status with connection pooling and storage directories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-400 uppercase font-sans font-semibold block">Engine Status</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Database Driver:</span>
                  <span className="text-emerald-400 font-bold">{dbStatus?.engine || 'MariaDB Pool'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Host / Port:</span>
                  <span className="text-white">{dbStatus?.host || '127.0.0.1'}:{dbStatus?.port || 3306}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Database Schema:</span>
                  <span className="text-white">{dbStatus?.database || 'bitfinance'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Live Pool State:</span>
                  <span className={dbStatus?.isMariaDbConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {dbStatus?.isMariaDbConnected ? 'Connected & Synced' : 'Ready / Active Fallback Engine'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-400 uppercase font-sans font-semibold block">Relational Row Counts</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Users Table:</span>
                  <span className="text-white font-bold">{dbStatus?.counts?.users ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Investments Table:</span>
                  <span className="text-white font-bold">{dbStatus?.counts?.investments ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Deposits Queue:</span>
                  <span className="text-white font-bold">{dbStatus?.counts?.deposits ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Withdrawals Queue:</span>
                  <span className="text-white font-bold">{dbStatus?.counts?.withdrawals ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Roulette Logs:</span>
                  <span className="text-white font-bold">{dbStatus?.counts?.rouletteLogs ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Termux Quick Launch Instructions */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-amber-400 font-semibold font-sans">
                Termux MariaDB Shell Command Reference:
              </span>
              <pre className="bg-slate-900 p-3 rounded-lg overflow-x-auto text-[11px] text-slate-300 font-mono">
                {`# 1. Install & launch MariaDB on Termux:
pkg install mariadb
mysqld_safe -u root &

# 2. Create database & apply schema:
mariadb -u root -e "CREATE DATABASE IF NOT EXISTS bitfinance;"`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
