export interface User {
  uid: string;
  mobileNumber: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  withdrawalMethod: 'GCash' | 'Maya' | null;
  accountName: string | null;
  accountNumber: string | null;
  createdAt: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  category: string;
  cost: number;
  dailyReturn: number;
  days: number;
  totalReturn: number;
  features: string[];
}

export interface Investment {
  id: number;
  userId: string;
  planName: string;
  cost: number;
  dailyReturn: number;
  daysRemaining: number;
  daysCollectedCount: number;
  lastCollectedAt: string | null;
  createdAt: string;
}

export interface Deposit {
  id: number;
  userId: string;
  amount: number;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  mobileNumber?: string;
}

export interface Withdrawal {
  id: number;
  userId: string;
  amount: number;
  withdrawalMethod: 'GCash' | 'Maya' | string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: string;
  mobileNumber?: string;
}

export interface Coupon {
  id: number;
  code: string;
  amount: number;
  isUsed: boolean | number;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface RouletteLog {
  id: number;
  userId: string;
  mobileNumber: string;
  betAmount: number;
  outcome: string;
  multiplier: number;
  payout: number;
  playerProfit: number;
  houseProfit: number;
  createdAt: string;
}

export interface TickerItem {
  id: number;
  text: string;
  payout: number;
  multiplier: number;
  outcome: string;
  time: string;
}

export interface PublicSettings {
  activeDepositQrUrl: string;
  communityChatLink: string;
  communityQrUrl: string;
}

export interface TeamMember {
  maskedMobile: string;
  joinedAt: string;
}

export interface TeamData {
  referralCode: string;
  level1: {
    count: number;
    activeInvestors: number;
    commissionRate: string;
    members: TeamMember[];
  };
  level2: {
    count: number;
    commissionRate: string;
  };
  level3: {
    count: number;
    commissionRate: string;
  };
  totalTeamCount: number;
}

export interface MissionItem {
  id: string;
  name: string;
  requiredReferrals: number;
  reward: number;
  description: string;
  isClaimed: boolean;
  isEligible: boolean;
  currentCount: number;
}
