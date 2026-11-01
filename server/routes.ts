import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import { db, UserRow, getDbStatus, MARIADB_SCHEMA_SQL } from './db.js';
import { uploadDepositProof, uploadAdminQr, resolveUploadDirectories } from './storage.js';

export const apiRouter = Router();

// Investment Plans catalog as specified
export const INVESTMENT_PLANS = [
  {
    id: 'spark-150',
    name: 'Spark 150',
    category: 'Commercial Retail Kiosk',
    cost: 150,
    dailyReturn: 25,
    days: 28,
    totalReturn: 700,
    features: ['Instant Daily Accrual', '24h Cycle Lock', 'Principal Included'],
  },
  {
    id: 'vertex-300',
    name: 'Vertex 300',
    category: 'High-Density Residential Hub',
    cost: 300,
    dailyReturn: 50,
    days: 29,
    totalReturn: 1450,
    features: ['Daily Yield Distribution', 'First-Plan MLM Eligible', 'Termux MariaDB Guarded'],
  },
  {
    id: 'apex-600',
    name: 'Apex 600',
    category: 'Metro Commercial Plaza',
    cost: 600,
    dailyReturn: 100,
    days: 30,
    totalReturn: 3000,
    features: ['Automated Yield Cycles', 'Priority Withdrawal Queue', 'Verified MariaDB Asset'],
  },
  {
    id: 'zenith-1200',
    name: 'Zenith 1200',
    category: 'CBD Luxury Tower Units',
    cost: 1200,
    dailyReturn: 200,
    days: 31,
    totalReturn: 6200,
    features: ['High-Yield Cash Flow', 'Direct GCash/Maya Route', 'Tier 1 Priority Support'],
  },
  {
    id: 'sovereign-2400',
    name: 'Sovereign 2400',
    category: 'Prime BGC Financial Tower',
    cost: 2400,
    dailyReturn: 400,
    days: 32,
    totalReturn: 12800,
    features: ['Institutional Grade Lease', 'VIP Community Group Pass', 'Automated Daily Sweep'],
  },
  {
    id: 'obsidian-4800',
    name: 'Obsidian 4800',
    category: 'Enterprise Tech Corridor Estate',
    cost: 4800,
    dailyReturn: 800,
    days: 33,
    totalReturn: 26400,
    features: ['Executive Real Estate Yield', 'Maximum Daily Allocation', 'Dedicated Asset Verification'],
  },
];

// Missions Catalog
export const MISSIONS = [
  { id: 'mission-1', name: 'First Signal 1', requiredReferrals: 5, reward: 50, description: 'Invite 5 friends who buy their first plan' },
  { id: 'mission-2', name: 'Inner Circle 2', requiredReferrals: 10, reward: 100, description: 'Invite 10 friends who buy their first plan' },
  { id: 'mission-3', name: 'Relay 3', requiredReferrals: 15, reward: 150, description: 'Invite 15 friends who buy their first plan' },
  { id: 'mission-4', name: 'Convergence 4', requiredReferrals: 30, reward: 300, description: 'Invite 30 friends who buy their first plan' },
  { id: 'mission-5', name: 'Constellation 5', requiredReferrals: 60, reward: 600, description: 'Invite 60 friends who buy their first plan' },
  { id: 'mission-6', name: 'Legacy Protocol 6', requiredReferrals: 120, reward: 1200, description: 'Invite 120 friends who buy their first plan' },
];

function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 4) return '****0000';
  return `****${mobile.slice(-4)}`;
}

// Generate referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BIT';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Auto-credit completed 24h cycles for user's investments
async function processUserAutoCredit(uid: string) {
  const user = await db.findUserByUid(uid);
  if (!user) return;

  const investments = await db.getUserInvestments(uid);
  const now = Date.now();
  const CYCLE_MS = 24 * 60 * 60 * 1000; // 24 hours

  for (const inv of investments) {
    if (inv.daysRemaining <= 0) continue;

    const baseTime = inv.lastCollectedAt ? new Date(inv.lastCollectedAt).getTime() : new Date(inv.createdAt).getTime();
    const elapsed = now - baseTime;

    if (elapsed >= CYCLE_MS) {
      const eligibleCycles = Math.min(inv.daysRemaining, Math.floor(elapsed / CYCLE_MS));
      if (eligibleCycles > 0) {
        const creditAmount = eligibleCycles * Number(inv.dailyReturn);
        const newRemaining = inv.daysRemaining - eligibleCycles;
        const newCollected = inv.daysCollectedCount + eligibleCycles;
        // Shift lastCollectedAt forward by the exact number of credited 24h periods
        const newLastCollectedAt = new Date(baseTime + eligibleCycles * CYCLE_MS).toISOString();

        await db.updateInvestmentCollection(inv.id, newRemaining, newCollected, newLastCollectedAt);
        await db.updateUserBalance(uid, creditAmount);
      }
    }
  }
}

// ==========================================
// 1. AUTHENTICATION & REGISTRATION
// ==========================================

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, password, referralCode } = req.body;

    if (!mobileNumber || !password) {
      res.status(400).json({ error: 'Mobile number and password are required' });
      return;
    }

    const cleanMobile = String(mobileNumber).trim();
    if (cleanMobile.length < 10) {
      res.status(400).json({ error: 'Please enter a valid mobile number (min 10 digits)' });
      return;
    }

    const existing = await db.findUserByMobile(cleanMobile);
    if (existing) {
      res.status(409).json({ error: 'Mobile number is already registered' });
      return;
    }

    let initialBalance = 0;
    let referredByCode: string | null = null;

    if (referralCode && String(referralCode).trim()) {
      const referrer = await db.findUserByReferralCode(String(referralCode).trim());
      if (referrer) {
        initialBalance = 30.0; // Rule: With referral code, set initial balance to 30
        referredByCode = referrer.referralCode;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const myReferralCode = generateReferralCode();

    const newUser = await db.createUser({
      uid,
      mobileNumber: cleanMobile,
      password: hashedPassword,
      balance: initialBalance,
      referralCode: myReferralCode,
      referredBy: referredByCode,
      withdrawalMethod: null,
      accountName: null,
      accountNumber: null,
    });

    res.status(201).json({
      success: true,
      user: {
        uid: newUser.uid,
        mobileNumber: newUser.mobileNumber,
        balance: newUser.balance,
        referralCode: newUser.referralCode,
        referredBy: newUser.referredBy,
        withdrawalMethod: newUser.withdrawalMethod,
        accountName: newUser.accountName,
        accountNumber: newUser.accountNumber,
        createdAt: newUser.createdAt,
      },
      bonusApplied: initialBalance > 0,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, password } = req.body;
    if (!mobileNumber || !password) {
      res.status(400).json({ error: 'Mobile number and password are required' });
      return;
    }

    const cleanMobile = String(mobileNumber).trim();
    const user = await db.findUserByMobile(cleanMobile);
    if (!user) {
      res.status(401).json({ error: 'Invalid mobile number or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid mobile number or password' });
      return;
    }

    // Process any pending 24h cycle investment yields on login
    await processUserAutoCredit(user.uid);

    const freshUser = await db.findUserByUid(user.uid);

    res.json({
      success: true,
      user: {
        uid: freshUser!.uid,
        mobileNumber: freshUser!.mobileNumber,
        balance: freshUser!.balance,
        referralCode: freshUser!.referralCode,
        referredBy: freshUser!.referredBy,
        withdrawalMethod: freshUser!.withdrawalMethod,
        accountName: freshUser!.accountName,
        accountNumber: freshUser!.accountNumber,
        createdAt: freshUser!.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await processUserAutoCredit(uid);
    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      uid: user.uid,
      mobileNumber: user.mobileNumber,
      balance: user.balance,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      withdrawalMethod: user.withdrawalMethod,
      accountName: user.accountName,
      accountNumber: user.accountNumber,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error('Auth check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update payout binding
apiRouter.post('/user/payout-method', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const { withdrawalMethod, accountName, accountNumber } = req.body;

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!['GCash', 'Maya'].includes(withdrawalMethod)) {
      res.status(400).json({ error: 'Withdrawal method must be GCash or Maya' });
      return;
    }

    if (!accountName || !accountNumber) {
      res.status(400).json({ error: 'Account Name and Mobile/Account Number are required' });
      return;
    }

    const updated = await db.updateUserPayoutMethod(
      uid,
      withdrawalMethod as 'GCash' | 'Maya',
      String(accountName).trim(),
      String(accountNumber).trim()
    );

    res.json({
      success: true,
      withdrawalMethod: updated.withdrawalMethod,
      accountName: updated.accountName,
      accountNumber: updated.accountNumber,
    });
  } catch (err: any) {
    console.error('Payout method update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 2. INVESTMENTS & MLM COMMISSIONS
// ==========================================

apiRouter.get('/investments/plans', (_req: Request, res: Response) => {
  res.json(INVESTMENT_PLANS);
});

apiRouter.get('/investments/my', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await processUserAutoCredit(uid);
    const investments = await db.getUserInvestments(uid);
    res.json(investments);
  } catch (err: any) {
    console.error('Get investments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/investments/buy', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const { planId } = req.body;

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const plan = INVESTMENT_PLANS.find(p => p.id === planId);
    if (!plan) {
      res.status(400).json({ error: 'Invalid investment plan selected' });
      return;
    }

    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (Number(user.balance) < plan.cost) {
      res.status(400).json({
        error: `Insufficient balance (₱${Number(user.balance).toFixed(2)}). Plan costs ₱${plan.cost.toFixed(2)}. Please deposit first.`,
      });
      return;
    }

    // Check if this is the user's very first investment plan purchase
    const priorCount = await db.getUserInvestmentCount(uid);
    const isFirstPlan = priorCount === 0;

    // Deduct cost from user balance
    await db.updateUserBalance(uid, -plan.cost);

    // Create investment
    const newInv = await db.createInvestment({
      userId: uid,
      planName: plan.name,
      cost: plan.cost,
      dailyReturn: plan.dailyReturn,
      daysRemaining: plan.days,
      daysCollectedCount: 0,
      lastCollectedAt: new Date().toISOString(),
    });

    // MLM Commission Engine: First-Plan-Only Rule!
    // Level 1: 30%, Level 2: 3%, Level 3: 2%
    let l1Commission = 0;
    let l2Commission = 0;
    let l3Commission = 0;

    if (isFirstPlan && user.referredBy) {
      // Find Level 1 upline
      const upline1 = await db.findUserByReferralCode(user.referredBy);
      if (upline1) {
        l1Commission = Math.round(plan.cost * 0.30 * 100) / 100;
        await db.updateUserBalance(upline1.uid, l1Commission);

        // Find Level 2 upline
        if (upline1.referredBy) {
          const upline2 = await db.findUserByReferralCode(upline1.referredBy);
          if (upline2) {
            l2Commission = Math.round(plan.cost * 0.03 * 100) / 100;
            await db.updateUserBalance(upline2.uid, l2Commission);

            // Find Level 3 upline
            if (upline2.referredBy) {
              const upline3 = await db.findUserByReferralCode(upline2.referredBy);
              if (upline3) {
                l3Commission = Math.round(plan.cost * 0.02 * 100) / 100;
                await db.updateUserBalance(upline3.uid, l3Commission);
              }
            }
          }
        }
      }
    }

    const updatedUser = await db.findUserByUid(uid);

    res.json({
      success: true,
      investment: newInv,
      newBalance: updatedUser!.balance,
      isFirstPlan,
      commissionsPaid: isFirstPlan ? { l1: l1Commission, l2: l2Commission, l3: l3Commission } : null,
    });
  } catch (err: any) {
    console.error('Investment purchase error:', err);
    res.status(500).json({ error: 'Server error during plan purchase' });
  }
});

// Explicit manual collect button for 24h completed cooldowns
apiRouter.post('/investments/collect/:id', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const invId = Number(req.params.id);

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const investments = await db.getUserInvestments(uid);
    const inv = investments.find(i => i.id === invId);

    if (!inv) {
      res.status(404).json({ error: 'Investment not found' });
      return;
    }

    if (inv.daysRemaining <= 0) {
      res.status(400).json({ error: 'Investment contract has already matured and completed all return cycles.' });
      return;
    }

    const baseTime = inv.lastCollectedAt ? new Date(inv.lastCollectedAt).getTime() : new Date(inv.createdAt).getTime();
    const elapsed = Date.now() - baseTime;
    const CYCLE_MS = 24 * 60 * 60 * 1000;

    if (elapsed < CYCLE_MS) {
      const remainingMs = CYCLE_MS - elapsed;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      res.status(400).json({
        error: `Cooldown active. Next return cycle available in ${hours}h ${mins}m.`,
        remainingMs,
      });
      return;
    }

    const eligibleCycles = Math.min(inv.daysRemaining, Math.floor(elapsed / CYCLE_MS));
    const creditAmount = eligibleCycles * Number(inv.dailyReturn);
    const newRemaining = inv.daysRemaining - eligibleCycles;
    const newCollected = inv.daysCollectedCount + eligibleCycles;
    const newLastCollectedAt = new Date(baseTime + eligibleCycles * CYCLE_MS).toISOString();

    await db.updateInvestmentCollection(inv.id, newRemaining, newCollected, newLastCollectedAt);
    const updatedBalance = await db.updateUserBalance(uid, creditAmount);

    res.json({
      success: true,
      creditedAmount: creditAmount,
      cyclesCredited: eligibleCycles,
      daysRemaining: newRemaining,
      newBalance: updatedBalance,
    });
  } catch (err: any) {
    console.error('Manual collect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 3. DEPOSITS & PROOF UPLOAD
// ==========================================

apiRouter.get('/deposits/my', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const deposits = await db.getUserDeposits(uid);
    res.json(deposits);
  } catch (err: any) {
    console.error('Get deposits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/deposits/submit', uploadDepositProof.single('proofImage'), async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const amount = Number(req.body.amount);

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!amount || amount < 50) {
      res.status(400).json({ error: 'Minimum deposit amount is ₱50' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Payment transaction screenshot proof is required' });
      return;
    }

    const proofImageUrl = `/api/uploads/deposit-proofs/${req.file.filename}`;
    const deposit = await db.createDeposit(uid, amount, proofImageUrl);

    res.status(201).json({
      success: true,
      message: 'Deposit proof submitted successfully. Your request is queued for manual admin verification.',
      deposit,
    });
  } catch (err: any) {
    console.error('Deposit upload error:', err);
    res.status(500).json({ error: err.message || 'Error processing deposit submission' });
  }
});

// ==========================================
// 4. WITHDRAWALS
// ==========================================

apiRouter.get('/withdrawals/my', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const withdrawals = await db.getUserWithdrawals(uid);
    res.json(withdrawals);
  } catch (err: any) {
    console.error('Get withdrawals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/withdrawals/submit', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const amount = Number(req.body.amount);

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Condition 1: Must have bound GCash/Maya details
    if (!user.withdrawalMethod || !user.accountName || !user.accountNumber) {
      res.status(400).json({
        error: 'Please bind your GCash or Maya payout account first before requesting withdrawals.',
      });
      return;
    }

    // Condition 2: Must have at least 1 active investment plan
    const investments = await db.getUserInvestments(uid);
    const hasActivePlan = investments.some(i => i.daysRemaining > 0);
    if (!hasActivePlan) {
      res.status(400).json({
        error: 'Withdrawals require at least one active investment plan contract.',
      });
      return;
    }

    // Condition 3: Minimum withdrawal limit is ₱100
    if (!amount || amount < 100) {
      res.status(400).json({ error: 'Minimum withdrawal limit is ₱100.' });
      return;
    }

    // Condition 4: User balance >= withdrawal amount
    if (Number(user.balance) < amount) {
      res.status(400).json({
        error: `Insufficient balance. Available: ₱${Number(user.balance).toFixed(2)}, Requested: ₱${amount.toFixed(2)}`,
      });
      return;
    }

    // Atomically deduct balance
    await db.updateUserBalance(uid, -amount);

    // Create withdrawal record
    const withdrawal = await db.createWithdrawal({
      userId: uid,
      amount,
      withdrawalMethod: user.withdrawalMethod,
      accountName: user.accountName,
      accountNumber: user.accountNumber,
      status: 'pending',
    });

    const updatedUser = await db.findUserByUid(uid);

    res.status(201).json({
      success: true,
      message: 'Withdrawal requested successfully. Note: Withdrawals are processed manually and take approximately 2 hours to receive.',
      withdrawal,
      newBalance: updatedUser!.balance,
    });
  } catch (err: any) {
    console.error('Withdrawal submission error:', err);
    res.status(500).json({ error: 'Server error processing withdrawal' });
  }
});

// ==========================================
// 5. COUPON REDEMPTION & ANTI-SPAM LOCKOUT
// ==========================================

apiRouter.post('/coupons/redeem', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const { code } = req.body;

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!code || !String(code).trim()) {
      res.status(400).json({
        error: 'Please enter a coupon code',
        lockoutSeconds: 5,
      });
      return;
    }

    const cleanCode = String(code).trim().toUpperCase();
    const coupon = await db.findCoupon(cleanCode);

    // Rule: If invalid or already used, enforce 5-second lockout
    if (!coupon || coupon.isUsed) {
      res.status(400).json({
        error: 'Invalid or already redeemed coupon code.',
        lockoutSeconds: 5,
      });
      return;
    }

    // Mark as used and credit balance
    await db.markCouponUsed(coupon.id, uid);
    const newBalance = await db.updateUserBalance(uid, Number(coupon.amount));

    res.json({
      success: true,
      code: coupon.code,
      rewardAmount: coupon.amount,
      newBalance,
      message: `Coupon redeemed successfully! Credited ₱${Number(coupon.amount).toFixed(2)} to your balance.`,
    });
  } catch (err: any) {
    console.error('Coupon redemption error:', err);
    res.status(500).json({ error: 'Server error', lockoutSeconds: 5 });
  }
});

// ==========================================
// 6. MINI ROULETTE GAME & TICKER
// ==========================================

apiRouter.get('/roulette/ticker', async (_req: Request, res: Response) => {
  try {
    const recentWins = await db.getRecentRouletteWins(20);
    const formatted = recentWins.map(w => ({
      id: w.id,
      text: `${maskMobile(w.mobileNumber)} won ₱${Number(w.payout).toLocaleString('en-PH', { minimumFractionDigits: 2 })} (${w.multiplier}x)!`,
      payout: w.payout,
      multiplier: w.multiplier,
      outcome: w.outcome,
      time: w.createdAt,
    }));
    res.json(formatted);
  } catch (err: any) {
    console.error('Roulette ticker error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/roulette/spin', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const betAmount = Number(req.body.betAmount);

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Table limits check: ₱50 to ₱300
    if (isNaN(betAmount) || betAmount < 50 || betAmount > 300) {
      res.status(400).json({ error: 'Bet amount must be between ₱50 and ₱300.' });
      return;
    }

    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (Number(user.balance) < betAmount) {
      res.status(400).json({
        error: `Insufficient balance (₱${Number(user.balance).toFixed(2)}). Cannot place bet of ₱${betAmount.toFixed(2)}.`,
      });
      return;
    }

    // Server-side decoupled probability engine
    // Mega Jackpot: 0.5% (0.005) -> 10x
    // Big Win: 1.5% (0.015) -> 4x
    // Win: 5.0% (0.050) -> 2x
    // Small Win: 27.0% (0.270) -> 1.5x
    // Lose: 66.0% (0.660) -> 0x
    const random = Math.random();
    let outcome = 'Lose';
    let multiplier = 0;

    if (random < 0.005) {
      outcome = 'Mega Jackpot';
      multiplier = 10.0;
    } else if (random < 0.02) {
      outcome = 'Big Win';
      multiplier = 4.0;
    } else if (random < 0.07) {
      outcome = 'Win';
      multiplier = 2.0;
    } else if (random < 0.34) {
      outcome = 'Small Win';
      multiplier = 1.5;
    } else {
      outcome = 'Lose';
      multiplier = 0.0;
    }

    const payout = Math.round(betAmount * multiplier * 100) / 100;
    const playerProfit = Math.round((payout - betAmount) * 100) / 100;
    const houseProfit = Math.round((betAmount - payout) * 100) / 100;

    // Atomic transaction: Deduct bet, credit payout
    const netBalanceChange = payout - betAmount;
    const newBalance = await db.updateUserBalance(uid, netBalanceChange);

    // Audit log
    await db.createRouletteLog({
      userId: uid,
      mobileNumber: user.mobileNumber,
      betAmount,
      outcome,
      multiplier,
      payout,
      playerProfit,
      houseProfit,
    });

    res.json({
      success: true,
      outcome,
      multiplier,
      payout,
      playerProfit,
      newBalance,
    });
  } catch (err: any) {
    console.error('Roulette spin error:', err);
    res.status(500).json({ error: 'Server error processing spin' });
  }
});

// ==========================================
// 7. TEAM & MLM PANEL + MISSIONS
// ==========================================

apiRouter.get('/mlm/team', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const allUsers = await db.getAllUsers();
    // Level 1: Users referred directly by current user
    const level1Users = allUsers.filter(u => u.referredBy?.toUpperCase() === user.referralCode.toUpperCase());
    const l1Codes = new Set(level1Users.map(u => u.referralCode.toUpperCase()));

    // Level 2: Users referred by Level 1
    const level2Users = allUsers.filter(u => u.referredBy && l1Codes.has(u.referredBy.toUpperCase()));
    const l2Codes = new Set(level2Users.map(u => u.referralCode.toUpperCase()));

    // Level 3: Users referred by Level 2
    const level3Users = allUsers.filter(u => u.referredBy && l2Codes.has(u.referredBy.toUpperCase()));

    // Check which invited friends purchased their first plan
    const allInvestments = await db.getUserInvestments(uid); // for cache, let's fetch counts
    let l1ActiveInvestors = 0;
    for (const l1 of level1Users) {
      const cnt = await db.getUserInvestmentCount(l1.uid);
      if (cnt > 0) l1ActiveInvestors++;
    }

    res.json({
      referralCode: user.referralCode,
      level1: {
        count: level1Users.length,
        activeInvestors: l1ActiveInvestors,
        commissionRate: '30%',
        members: level1Users.map(u => ({
          maskedMobile: maskMobile(u.mobileNumber),
          joinedAt: u.createdAt,
        })),
      },
      level2: {
        count: level2Users.length,
        commissionRate: '3%',
      },
      level3: {
        count: level3Users.length,
        commissionRate: '2%',
      },
      totalTeamCount: level1Users.length + level2Users.length + level3Users.length,
    });
  } catch (err: any) {
    console.error('MLM team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.get('/mlm/missions', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await db.findUserByUid(uid);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const l1Users = await db.getDirectReferrals(user.referralCode);
    let activeReferralsCount = 0;
    for (const member of l1Users) {
      const cnt = await db.getUserInvestmentCount(member.uid);
      if (cnt > 0) activeReferralsCount++;
    }

    const claimed = await db.getClaimedMissions(uid);

    const missionsStatus = MISSIONS.map(m => {
      const isClaimed = claimed.includes(m.id);
      const isEligible = activeReferralsCount >= m.requiredReferrals;
      return {
        ...m,
        isClaimed,
        isEligible,
        currentCount: activeReferralsCount,
      };
    });

    res.json(missionsStatus);
  } catch (err: any) {
    console.error('Get missions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/mlm/missions/claim', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-uid'] as string;
    const { missionId } = req.body;

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) {
      res.status(400).json({ error: 'Invalid mission' });
      return;
    }

    const claimed = await db.getClaimedMissions(uid);
    if (claimed.includes(missionId)) {
      res.status(400).json({ error: 'Mission reward has already been claimed.' });
      return;
    }

    const user = await db.findUserByUid(uid);
    const l1Users = await db.getDirectReferrals(user!.referralCode);
    let activeReferralsCount = 0;
    for (const member of l1Users) {
      const cnt = await db.getUserInvestmentCount(member.uid);
      if (cnt > 0) activeReferralsCount++;
    }

    if (activeReferralsCount < mission.requiredReferrals) {
      res.status(400).json({
        error: `Requirements not met. You have ${activeReferralsCount}/${mission.requiredReferrals} qualifying referrals.`,
      });
      return;
    }

    await db.claimMission(uid, missionId, mission.reward);
    const newBalance = await db.updateUserBalance(uid, mission.reward);

    res.json({
      success: true,
      reward: mission.reward,
      newBalance,
      message: `Congratulations! ₱${mission.reward.toFixed(2)} has been credited to your balance.`,
    });
  } catch (err: any) {
    console.error('Claim mission error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 8. PUBLIC SETTINGS (COMMUNITY & DEPOSIT QR)
// ==========================================

apiRouter.get('/settings/public', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({
      activeDepositQrUrl: settings.activeDepositQrUrl || '/src/assets/images/deposit_qr_code_1793520765365.jpg',
      communityChatLink: settings.communityChatLink || 'https://t.me/BitFinanceOfficialPH',
      communityQrUrl: settings.communityQrUrl || '/src/assets/images/community_qr_code_1793520764853.jpg',
    });
  } catch (err: any) {
    console.error('Get public settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 9. SECRET ADMIN PORTAL (/admin2026)
// ==========================================

// Middleware for admin verification
function checkAdminAuth(req: Request, res: Response, next: () => void) {
  const token = req.headers['x-admin-token'];
  if (token === 'admin_session_nexora2026') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized admin access' });
  }
}

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  // Credentials: nexora2026 / nexora2026
  if (username === 'nexora2026' && password === 'nexora2026') {
    res.json({
      success: true,
      token: 'admin_session_nexora2026',
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

apiRouter.get('/admin/stats', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    const deposits = await db.getAllDeposits();
    const withdrawals = await db.getAllWithdrawals();
    const rouletteLogs = await db.getAllRouletteLogs(100);

    const pendingDeposits = deposits.filter(d => d.status === 'pending');
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

    const totalDepositAmount = deposits
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const totalWithdrawalAmount = withdrawals
      .filter(w => w.status === 'approved' || w.status === 'paid')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const totalHouseRouletteProfit = rouletteLogs.reduce((sum, l) => sum + Number(l.houseProfit), 0);

    res.json({
      totalUsers: users.length,
      pendingDepositsCount: pendingDeposits.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      totalDepositVolume: totalDepositAmount,
      totalWithdrawalVolume: totalWithdrawalAmount,
      houseRouletteProfit: totalHouseRouletteProfit,
      dbStatus: getDbStatus(),
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Deposits Queue
apiRouter.get('/admin/deposits', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const deposits = await db.getAllDeposits();
    const allUsers = await db.getAllUsers();
    const userMap = new Map(allUsers.map(u => [u.uid, u.mobileNumber]));

    const enriched = deposits.map(d => ({
      ...d,
      mobileNumber: userMap.get(d.userId) || 'Unknown User',
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Admin get deposits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/admin/deposits/approve', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { depositId } = req.body;
    const deposits = await db.getAllDeposits();
    const dep = deposits.find(d => d.id === Number(depositId));

    if (!dep) {
      res.status(404).json({ error: 'Deposit request not found' });
      return;
    }

    if (dep.status !== 'pending') {
      res.status(400).json({ error: `Deposit is already ${dep.status}` });
      return;
    }

    // Atomically approve and credit user balance
    const updated = await db.updateDepositStatus(dep.id, 'approved');
    await db.updateUserBalance(dep.userId, Number(dep.amount));

    res.json({
      success: true,
      message: `Approved deposit of ₱${Number(dep.amount).toFixed(2)} and credited to user account.`,
      deposit: updated,
    });
  } catch (err: any) {
    console.error('Admin approve deposit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/admin/deposits/reject', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { depositId } = req.body;
    const deposits = await db.getAllDeposits();
    const dep = deposits.find(d => d.id === Number(depositId));

    if (!dep) {
      res.status(404).json({ error: 'Deposit request not found' });
      return;
    }

    if (dep.status !== 'pending') {
      res.status(400).json({ error: `Deposit is already ${dep.status}` });
      return;
    }

    const updated = await db.updateDepositStatus(dep.id, 'rejected');
    res.json({
      success: true,
      message: 'Deposit rejected.',
      deposit: updated,
    });
  } catch (err: any) {
    console.error('Admin reject deposit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Withdrawals Queue
apiRouter.get('/admin/withdrawals', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const withdrawals = await db.getAllWithdrawals();
    const allUsers = await db.getAllUsers();
    const userMap = new Map(allUsers.map(u => [u.uid, u.mobileNumber]));

    const enriched = withdrawals.map(w => ({
      ...w,
      mobileNumber: userMap.get(w.userId) || 'Unknown User',
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Admin get withdrawals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/admin/withdrawals/update', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { withdrawalId, status } = req.body; // 'approved', 'paid', 'rejected'
    const withdrawals = await db.getAllWithdrawals();
    const w = withdrawals.find(item => item.id === Number(withdrawalId));

    if (!w) {
      res.status(404).json({ error: 'Withdrawal not found' });
      return;
    }

    if (!['approved', 'paid', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    // If rejected, refund the deducted amount back to user's balance
    if (status === 'rejected' && w.status === 'pending') {
      await db.updateUserBalance(w.userId, Number(w.amount));
    }

    const updated = await db.updateWithdrawalStatus(w.id, status as any);

    res.json({
      success: true,
      message: `Withdrawal #${w.id} marked as ${status}${status === 'rejected' ? ' and refunded to user balance' : ''}.`,
      withdrawal: updated,
    });
  } catch (err: any) {
    console.error('Admin update withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Coupons
apiRouter.get('/admin/coupons', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const coupons = await db.getAllCoupons();
    res.json(coupons);
  } catch (err: any) {
    console.error('Admin get coupons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/admin/coupons/create', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { code, amount } = req.body;
    if (!code || !amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Valid uppercase code and positive amount required' });
      return;
    }

    const newCoupon = await db.createCoupon(String(code).trim().toUpperCase(), Number(amount));
    res.status(201).json({
      success: true,
      coupon: newCoupon,
    });
  } catch (err: any) {
    console.error('Admin create coupon error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Roulette Logs
apiRouter.get('/admin/roulette-logs', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const logs = await db.getAllRouletteLogs(200);
    res.json(logs);
  } catch (err: any) {
    console.error('Admin get roulette logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Settings & QR Upload
apiRouter.get('/admin/settings', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err: any) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/admin/settings/update-text', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { communityChatLink, activeDepositQrUrl, communityQrUrl } = req.body;
    if (communityChatLink) {
      await db.updateSetting('communityChatLink', String(communityChatLink).trim());
    }
    if (activeDepositQrUrl) {
      await db.updateSetting('activeDepositQrUrl', String(activeDepositQrUrl).trim());
    }
    if (communityQrUrl) {
      await db.updateSetting('communityQrUrl', String(communityQrUrl).trim());
    }

    const settings = await db.getSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin upload official deposit QR (Termux storage: /storage/emulated/0/BitFinance/uploads/admin-qr/)
apiRouter.post(
  '/admin/settings/upload-deposit-qr',
  checkAdminAuth,
  uploadAdminQr.single('qrImage'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }
      const qrUrl = `/api/uploads/admin-qr/${req.file.filename}`;
      await db.updateSetting('activeDepositQrUrl', qrUrl);
      res.json({
        success: true,
        message: 'Deposit QR code updated successfully and stored in Termux storage.',
        qrUrl,
      });
    } catch (err: any) {
      console.error('Admin upload deposit QR error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Admin upload community QR code (distinct from deposit QR)
apiRouter.post(
  '/admin/settings/upload-community-qr',
  checkAdminAuth,
  uploadAdminQr.single('qrImage'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }
      const qrUrl = `/api/uploads/admin-qr/${req.file.filename}`;
      await db.updateSetting('communityQrUrl', qrUrl);
      res.json({
        success: true,
        message: 'Community QR code updated successfully and stored in Termux storage.',
        qrUrl,
      });
    } catch (err: any) {
      console.error('Admin upload community QR error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Database Status & Termux MariaDB Diagnostics
apiRouter.get('/admin/db-status', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({
    ...getDbStatus(),
    schemaSql: MARIADB_SCHEMA_SQL,
  });
});
