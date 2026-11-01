import {
  User,
  InvestmentPlan,
  Investment,
  Deposit,
  Withdrawal,
  Coupon,
  RouletteLog,
  TickerItem,
  PublicSettings,
  TeamData,
  MissionItem,
} from '../types';

let currentUid: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('bitfinance_uid') : null;
let currentAdminToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('bitfinance_admin_token') : null;

export function setSessionUid(uid: string | null) {
  currentUid = uid;
  if (typeof window !== 'undefined') {
    if (uid) {
      sessionStorage.setItem('bitfinance_uid', uid);
    } else {
      sessionStorage.removeItem('bitfinance_uid');
    }
  }
}

export function getSessionUid(): string | null {
  return currentUid;
}

export function setAdminToken(token: string | null) {
  currentAdminToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('bitfinance_admin_token', token);
    } else {
      sessionStorage.removeItem('bitfinance_admin_token');
    }
  }
}

export function getAdminToken(): string | null {
  return currentAdminToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (currentUid && !headers.has('x-user-uid')) {
    headers.set('x-user-uid', currentUid);
  }
  if (currentAdminToken && !headers.has('x-admin-token')) {
    headers.set('x-admin-token', currentAdminToken);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  // Auth
  async register(mobileNumber: string, password: string, referralCode?: string) {
    const res = await request<{ success: boolean; user: User; bonusApplied: boolean }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, password, referralCode }),
    });
    setSessionUid(res.user.uid);
    return res;
  },

  async login(mobileNumber: string, password: string) {
    const res = await request<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, password }),
    });
    setSessionUid(res.user.uid);
    return res;
  },

  async getMe(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  async updatePayoutMethod(withdrawalMethod: 'GCash' | 'Maya', accountName: string, accountNumber: string) {
    return request<{ success: boolean; withdrawalMethod: string; accountName: string; accountNumber: string }>(
      '/api/user/payout-method',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalMethod, accountName, accountNumber }),
      }
    );
  },

  // Investments
  async getPlans(): Promise<InvestmentPlan[]> {
    return request<InvestmentPlan[]>('/api/investments/plans');
  },

  async getMyInvestments(): Promise<Investment[]> {
    return request<Investment[]>('/api/investments/my');
  },

  async buyPlan(planId: string) {
    return request<{ success: boolean; investment: Investment; newBalance: number; isFirstPlan: boolean }>(
      '/api/investments/buy',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      }
    );
  },

  async collectInvestment(id: number) {
    return request<{ success: boolean; creditedAmount: number; cyclesCredited: number; daysRemaining: number; newBalance: number }>(
      `/api/investments/collect/${id}`,
      { method: 'POST' }
    );
  },

  // Deposits
  async getMyDeposits(): Promise<Deposit[]> {
    return request<Deposit[]>('/api/deposits/my');
  },

  async submitDeposit(amount: number, proofFile: File) {
    const formData = new FormData();
    formData.append('amount', amount.toString());
    formData.append('proofImage', proofFile);

    return request<{ success: boolean; message: string; deposit: Deposit }>('/api/deposits/submit', {
      method: 'POST',
      body: formData,
    });
  },

  // Withdrawals
  async getMyWithdrawals(): Promise<Withdrawal[]> {
    return request<Withdrawal[]>('/api/withdrawals/my');
  },

  async submitWithdrawal(amount: number) {
    return request<{ success: boolean; message: string; withdrawal: Withdrawal; newBalance: number }>(
      '/api/withdrawals/submit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      }
    );
  },

  // Coupons
  async redeemCoupon(code: string) {
    return request<{ success: boolean; code: string; rewardAmount: number; newBalance: number; message: string }>(
      '/api/coupons/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }
    );
  },

  // Roulette
  async getRouletteTicker(): Promise<TickerItem[]> {
    return request<TickerItem[]>('/api/roulette/ticker');
  },

  async spinRoulette(betAmount: number) {
    return request<{
      success: boolean;
      outcome: string;
      multiplier: number;
      payout: number;
      playerProfit: number;
      newBalance: number;
    }>('/api/roulette/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount }),
    });
  },

  // MLM & Missions
  async getTeamData(): Promise<TeamData> {
    return request<TeamData>('/api/mlm/team');
  },

  async getMissions(): Promise<MissionItem[]> {
    return request<MissionItem[]>('/api/mlm/missions');
  },

  async claimMission(missionId: string) {
    return request<{ success: boolean; reward: number; newBalance: number; message: string }>(
      '/api/mlm/missions/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      }
    );
  },

  // Public Settings
  async getPublicSettings(): Promise<PublicSettings> {
    return request<PublicSettings>('/api/settings/public');
  },

  // Admin APIs (/admin2026)
  async adminLogin(username: string, password: string) {
    const res = await request<{ success: boolean; token: string }>('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setAdminToken(res.token);
    return res;
  },

  async getAdminStats() {
    return request<any>('/api/admin/stats');
  },

  async getAdminDeposits(): Promise<Deposit[]> {
    return request<Deposit[]>('/api/admin/deposits');
  },

  async approveDeposit(depositId: number) {
    return request<{ success: boolean; message: string; deposit: Deposit }>('/api/admin/deposits/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId }),
    });
  },

  async rejectDeposit(depositId: number) {
    return request<{ success: boolean; message: string; deposit: Deposit }>('/api/admin/deposits/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId }),
    });
  },

  async getAdminWithdrawals(): Promise<Withdrawal[]> {
    return request<Withdrawal[]>('/api/admin/withdrawals');
  },

  async updateAdminWithdrawal(withdrawalId: number, status: 'approved' | 'paid' | 'rejected') {
    return request<{ success: boolean; message: string; withdrawal: Withdrawal }>(
      '/api/admin/withdrawals/update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, status }),
      }
    );
  },

  async getAdminCoupons(): Promise<Coupon[]> {
    return request<Coupon[]>('/api/admin/coupons');
  },

  async createAdminCoupon(code: string, amount: number) {
    return request<{ success: boolean; coupon: Coupon }>('/api/admin/coupons/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, amount }),
    });
  },

  async getAdminRouletteLogs(): Promise<RouletteLog[]> {
    return request<RouletteLog[]>('/api/admin/roulette-logs');
  },

  async getAdminSettings(): Promise<Record<string, string>> {
    return request<Record<string, string>>('/api/admin/settings');
  },

  async updateAdminSettingsText(updates: { communityChatLink?: string; activeDepositQrUrl?: string; communityQrUrl?: string }) {
    return request<{ success: boolean; settings: Record<string, string> }>('/api/admin/settings/update-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async uploadDepositQr(file: File) {
    const formData = new FormData();
    formData.append('qrImage', file);
    return request<{ success: boolean; message: string; qrUrl: string }>('/api/admin/settings/upload-deposit-qr', {
      method: 'POST',
      body: formData,
    });
  },

  async uploadCommunityQr(file: File) {
    const formData = new FormData();
    formData.append('qrImage', file);
    return request<{ success: boolean; message: string; qrUrl: string }>('/api/admin/settings/upload-community-qr', {
      method: 'POST',
      body: formData,
    });
  },

  async getDbStatus() {
    return request<any>('/api/admin/db-status');
  },
};
