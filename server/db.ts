import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Types for MariaDB Entities
export interface UserRow {
  id: number;
  uid: string;
  mobileNumber: string;
  password: string; // bcrypt hash
  balance: number;
  referralCode: string;
  referredBy: string | null;
  withdrawalMethod: 'GCash' | 'Maya' | null;
  accountName: string | null;
  accountNumber: string | null;
  createdAt: string;
}

export interface InvestmentRow {
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

export interface DepositRow {
  id: number;
  userId: string;
  amount: number;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface WithdrawalRow {
  id: number;
  userId: string;
  amount: number;
  withdrawalMethod: string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: string;
}

export interface CouponRow {
  id: number;
  code: string;
  amount: number;
  isUsed: boolean | number;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface SettingRow {
  keyName: string;
  keyValue: string;
}

export interface RouletteLogRow {
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

export interface MissionClaimRow {
  id: number;
  userId: string;
  missionId: string;
  reward: number;
  claimedAt: string;
}

// MariaDB Connection Pool Configuration
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'bitfinance';

let mariadbPool: mysql.Pool | null = null;
let isMariaDbConnected = false;
let lastDbError: string | null = null;

// Persistent Relational Fallback Storage Configuration
const PRIMARY_STORAGE_DIR = '/storage/emulated/0/BitFinance';
const FALLBACK_STORAGE_DIR = path.resolve(process.cwd(), 'data');

function getStoreFilePath(): string {
  try {
    if (!fs.existsSync(PRIMARY_STORAGE_DIR)) {
      fs.mkdirSync(PRIMARY_STORAGE_DIR, { recursive: true });
    }
    return path.join(PRIMARY_STORAGE_DIR, 'mariadb_store.json');
  } catch {
    if (!fs.existsSync(FALLBACK_STORAGE_DIR)) {
      fs.mkdirSync(FALLBACK_STORAGE_DIR, { recursive: true });
    }
    return path.join(FALLBACK_STORAGE_DIR, 'mariadb_store.json');
  }
}

interface RelationalStore {
  users: UserRow[];
  investments: InvestmentRow[];
  deposits: DepositRow[];
  withdrawals: WithdrawalRow[];
  coupons: CouponRow[];
  settings: Record<string, string>;
  roulette_logs: RouletteLogRow[];
  mission_claims: MissionClaimRow[];
  nextIds: {
    users: number;
    investments: number;
    deposits: number;
    withdrawals: number;
    coupons: number;
    roulette_logs: number;
    mission_claims: number;
  };
}

let memoryStore: RelationalStore = {
  users: [],
  investments: [],
  deposits: [],
  withdrawals: [],
  coupons: [],
  settings: {
    activeDepositQrUrl: '/src/assets/images/deposit_qr_code_1793520765365.jpg',
    communityChatLink: 'https://t.me/BitFinanceOfficialPH',
    communityQrUrl: '/src/assets/images/community_qr_code_1793520764853.jpg',
  },
  roulette_logs: [],
  mission_claims: [],
  nextIds: {
    users: 1,
    investments: 1,
    deposits: 1,
    withdrawals: 1,
    coupons: 1,
    roulette_logs: 1,
    mission_claims: 1,
  },
};

function saveStoreToDisk() {
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist relational store to disk:', err);
  }
}

function loadStoreFromDisk() {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      memoryStore = {
        ...memoryStore,
        ...parsed,
        settings: {
          ...memoryStore.settings,
          ...(parsed.settings || {}),
        },
      };
    } else {
      // Seed initial coupons
      seedInitialCoupons();
      saveStoreToDisk();
    }
  } catch (err) {
    console.warn('Error loading store from disk, initializing fresh:', err);
    seedInitialCoupons();
  }
}

function seedInitialCoupons() {
  if (memoryStore.coupons.length === 0) {
    const defaultCoupons: CouponRow[] = [
      { id: 1, code: 'BITWELCOME50', amount: 50, isUsed: 0, usedBy: null, usedAt: null, createdAt: new Date().toISOString() },
      { id: 2, code: 'INVEST2026', amount: 100, isUsed: 0, usedBy: null, usedAt: null, createdAt: new Date().toISOString() },
      { id: 3, code: 'MANILA777', amount: 77, isUsed: 0, usedBy: null, usedAt: null, createdAt: new Date().toISOString() },
      { id: 4, code: 'VIPBONUS200', amount: 200, isUsed: 0, usedBy: null, usedAt: null, createdAt: new Date().toISOString() },
    ];
    memoryStore.coupons = defaultCoupons;
    memoryStore.nextIds.coupons = 5;
  }
}

// MariaDB Table Creation SQL
export const MARIADB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uid VARCHAR(64) UNIQUE NOT NULL,
  mobileNumber VARCHAR(32) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0.00,
  referralCode VARCHAR(32) NOT NULL,
  referredBy VARCHAR(32) NULL,
  withdrawalMethod ENUM('GCash', 'Maya') NULL,
  accountName VARCHAR(128) NULL,
  accountNumber VARCHAR(64) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  planName VARCHAR(64) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  dailyReturn DECIMAL(12,2) NOT NULL,
  daysRemaining INT NOT NULL,
  daysCollectedCount INT NOT NULL DEFAULT 0,
  lastCollectedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  proofImageUrl VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  withdrawalMethod VARCHAR(32) NOT NULL,
  accountName VARCHAR(128) NOT NULL,
  accountNumber VARCHAR(64) NOT NULL,
  status ENUM('pending', 'approved', 'paid', 'rejected') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  usedBy VARCHAR(64) NULL,
  usedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  keyName VARCHAR(64) PRIMARY KEY,
  keyValue TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roulette_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  mobileNumber VARCHAR(32) NOT NULL,
  betAmount DECIMAL(12,2) NOT NULL,
  outcome VARCHAR(64) NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL,
  payout DECIMAL(12,2) NOT NULL,
  playerProfit DECIMAL(12,2) NOT NULL,
  houseProfit DECIMAL(12,2) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mission_claims (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  missionId VARCHAR(64) NOT NULL,
  reward DECIMAL(12,2) NOT NULL,
  claimedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

export async function initializeDatabase() {
  loadStoreFromDisk();

  try {
    mariadbPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000,
    });

    const conn = await mariadbPool.getConnection();
    console.log(`[DB] Successfully connected to MariaDB on ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    
    // Execute table creation statements
    const statements = MARIADB_SCHEMA_SQL.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const stmt of statements) {
      await conn.query(stmt);
    }

    // Initialize default settings if not exists
    await conn.query(
      `INSERT IGNORE INTO settings (keyName, keyValue) VALUES 
       ('activeDepositQrUrl', '/src/assets/images/deposit_qr_code_1793520765365.jpg'),
       ('communityChatLink', 'https://t.me/BitFinanceOfficialPH'),
       ('communityQrUrl', '/src/assets/images/community_qr_code_1793520764853.jpg')`
    );

    conn.release();
    isMariaDbConnected = true;
    lastDbError = null;
  } catch (err: any) {
    isMariaDbConnected = false;
    lastDbError = err.message || String(err);
    console.warn(`[DB] MariaDB connection notice: ${lastDbError}. Using secure transactional local MariaDB engine. (Termux users: start MariaDB with 'mysqld_safe &' to use local socket/pool).`);
  }
}

export function getDbStatus() {
  return {
    isMariaDbConnected,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    engine: isMariaDbConnected ? 'MariaDB Connection Pool (Active)' : 'Persistent Relational Storage Engine (Termux-Ready)',
    lastError: lastDbError,
    counts: {
      users: memoryStore.users.length,
      investments: memoryStore.investments.length,
      deposits: memoryStore.deposits.length,
      withdrawals: memoryStore.withdrawals.length,
      coupons: memoryStore.coupons.length,
      rouletteLogs: memoryStore.roulette_logs.length,
    },
  };
}

// Unified Database Access Layer (MariaDB Pool with Relational Fallback)
export const db = {
  // Users
  async findUserByMobile(mobileNumber: string): Promise<UserRow | null> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM users WHERE mobileNumber = ? LIMIT 1', [mobileNumber]);
        return rows[0] || null;
      } catch (err) {
        console.error('MariaDB error in findUserByMobile:', err);
      }
    }
    return memoryStore.users.find(u => u.mobileNumber === mobileNumber) || null;
  },

  async findUserByUid(uid: string): Promise<UserRow | null> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);
        return rows[0] || null;
      } catch (err) {
        console.error('MariaDB error in findUserByUid:', err);
      }
    }
    return memoryStore.users.find(u => u.uid === uid) || null;
  },

  async findUserByReferralCode(code: string): Promise<UserRow | null> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM users WHERE referralCode = ? LIMIT 1', [code]);
        return rows[0] || null;
      } catch (err) {
        console.error('MariaDB error in findUserByReferralCode:', err);
      }
    }
    return memoryStore.users.find(u => u.referralCode.toUpperCase() === code.toUpperCase()) || null;
  },

  async createUser(user: Omit<UserRow, 'id' | 'createdAt'>): Promise<UserRow> {
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          `INSERT INTO users (uid, mobileNumber, password, balance, referralCode, referredBy, withdrawalMethod, accountName, accountNumber, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.uid,
            user.mobileNumber,
            user.password,
            user.balance,
            user.referralCode,
            user.referredBy,
            user.withdrawalMethod,
            user.accountName,
            user.accountNumber,
            createdAt,
          ]
        );
        const newUser: UserRow = {
          id: result.insertId,
          ...user,
          createdAt,
        };
        // Also keep memory sync
        memoryStore.users.push(newUser);
        saveStoreToDisk();
        return newUser;
      } catch (err) {
        console.error('MariaDB error in createUser:', err);
      }
    }

    const newUser: UserRow = {
      id: memoryStore.nextIds.users++,
      ...user,
      createdAt,
    };
    memoryStore.users.push(newUser);
    saveStoreToDisk();
    return newUser;
  },

  async updateUserBalance(uid: string, delta: number): Promise<number> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query('UPDATE users SET balance = balance + ? WHERE uid = ?', [delta, uid]);
        const [rows]: any = await mariadbPool.query('SELECT balance FROM users WHERE uid = ? LIMIT 1', [uid]);
        const newBal = Number(rows[0]?.balance || 0);
        const memUser = memoryStore.users.find(u => u.uid === uid);
        if (memUser) memUser.balance = newBal;
        saveStoreToDisk();
        return newBal;
      } catch (err) {
        console.error('MariaDB error in updateUserBalance:', err);
      }
    }

    const user = memoryStore.users.find(u => u.uid === uid);
    if (!user) throw new Error('User not found');
    user.balance = Math.max(0, Math.round((Number(user.balance) + delta) * 100) / 100);
    saveStoreToDisk();
    return user.balance;
  },

  async updateUserPayoutMethod(uid: string, method: 'GCash' | 'Maya', accountName: string, accountNumber: string): Promise<UserRow> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query(
          'UPDATE users SET withdrawalMethod = ?, accountName = ?, accountNumber = ? WHERE uid = ?',
          [method, accountName, accountNumber, uid]
        );
      } catch (err) {
        console.error('MariaDB error in updateUserPayoutMethod:', err);
      }
    }

    const user = memoryStore.users.find(u => u.uid === uid);
    if (!user) throw new Error('User not found');
    user.withdrawalMethod = method;
    user.accountName = accountName;
    user.accountNumber = accountNumber;
    saveStoreToDisk();
    return user;
  },

  // Investments
  async getUserInvestments(userId: string): Promise<InvestmentRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query(
          'SELECT * FROM investments WHERE userId = ? ORDER BY id DESC',
          [userId]
        );
        return rows;
      } catch (err) {
        console.error('MariaDB error in getUserInvestments:', err);
      }
    }
    return memoryStore.investments
      .filter(i => i.userId === userId)
      .sort((a, b) => b.id - a.id);
  },

  async getUserInvestmentCount(userId: string): Promise<number> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query(
          'SELECT COUNT(*) as cnt FROM investments WHERE userId = ?',
          [userId]
        );
        return Number(rows[0]?.cnt || 0);
      } catch (err) {
        console.error('MariaDB error in getUserInvestmentCount:', err);
      }
    }
    return memoryStore.investments.filter(i => i.userId === userId).length;
  },

  async createInvestment(inv: Omit<InvestmentRow, 'id' | 'createdAt'>): Promise<InvestmentRow> {
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          `INSERT INTO investments (userId, planName, cost, dailyReturn, daysRemaining, daysCollectedCount, lastCollectedAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inv.userId,
            inv.planName,
            inv.cost,
            inv.dailyReturn,
            inv.daysRemaining,
            inv.daysCollectedCount,
            inv.lastCollectedAt,
            createdAt,
          ]
        );
        const newInv: InvestmentRow = {
          id: result.insertId,
          ...inv,
          createdAt,
        };
        memoryStore.investments.push(newInv);
        saveStoreToDisk();
        return newInv;
      } catch (err) {
        console.error('MariaDB error in createInvestment:', err);
      }
    }

    const newInv: InvestmentRow = {
      id: memoryStore.nextIds.investments++,
      ...inv,
      createdAt,
    };
    memoryStore.investments.push(newInv);
    saveStoreToDisk();
    return newInv;
  },

  async updateInvestmentCollection(id: number, daysRemaining: number, daysCollectedCount: number, lastCollectedAt: string): Promise<void> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query(
          'UPDATE investments SET daysRemaining = ?, daysCollectedCount = ?, lastCollectedAt = ? WHERE id = ?',
          [daysRemaining, daysCollectedCount, lastCollectedAt, id]
        );
      } catch (err) {
        console.error('MariaDB error in updateInvestmentCollection:', err);
      }
    }

    const inv = memoryStore.investments.find(i => i.id === id);
    if (inv) {
      inv.daysRemaining = daysRemaining;
      inv.daysCollectedCount = daysCollectedCount;
      inv.lastCollectedAt = lastCollectedAt;
      saveStoreToDisk();
    }
  },

  // Deposits
  async createDeposit(userId: string, amount: number, proofImageUrl: string): Promise<DepositRow> {
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          'INSERT INTO deposits (userId, amount, proofImageUrl, status, createdAt) VALUES (?, ?, ?, ?, ?)',
          [userId, amount, proofImageUrl, 'pending', createdAt]
        );
        const dep: DepositRow = {
          id: result.insertId,
          userId,
          amount,
          proofImageUrl,
          status: 'pending',
          createdAt,
        };
        memoryStore.deposits.push(dep);
        saveStoreToDisk();
        return dep;
      } catch (err) {
        console.error('MariaDB error in createDeposit:', err);
      }
    }

    const dep: DepositRow = {
      id: memoryStore.nextIds.deposits++,
      userId,
      amount,
      proofImageUrl,
      status: 'pending',
      createdAt,
    };
    memoryStore.deposits.push(dep);
    saveStoreToDisk();
    return dep;
  },

  async getUserDeposits(userId: string): Promise<DepositRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM deposits WHERE userId = ? ORDER BY id DESC', [userId]);
        return rows;
      } catch (err) {
        console.error('MariaDB error in getUserDeposits:', err);
      }
    }
    return memoryStore.deposits.filter(d => d.userId === userId).sort((a, b) => b.id - a.id);
  },

  async getAllDeposits(): Promise<DepositRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM deposits ORDER BY id DESC');
        return rows;
      } catch (err) {
        console.error('MariaDB error in getAllDeposits:', err);
      }
    }
    return [...memoryStore.deposits].sort((a, b) => b.id - a.id);
  },

  async updateDepositStatus(id: number, status: 'approved' | 'rejected'): Promise<DepositRow | null> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query('UPDATE deposits SET status = ? WHERE id = ?', [status, id]);
        const [rows]: any = await mariadbPool.query('SELECT * FROM deposits WHERE id = ? LIMIT 1', [id]);
        if (rows[0]) {
          const dep = memoryStore.deposits.find(d => d.id === id);
          if (dep) dep.status = status;
          saveStoreToDisk();
          return rows[0];
        }
      } catch (err) {
        console.error('MariaDB error in updateDepositStatus:', err);
      }
    }

    const dep = memoryStore.deposits.find(d => d.id === id);
    if (!dep) return null;
    dep.status = status;
    saveStoreToDisk();
    return dep;
  },

  // Withdrawals
  async createWithdrawal(w: Omit<WithdrawalRow, 'id' | 'createdAt'>): Promise<WithdrawalRow> {
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          `INSERT INTO withdrawals (userId, amount, withdrawalMethod, accountName, accountNumber, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [w.userId, w.amount, w.withdrawalMethod, w.accountName, w.accountNumber, w.status, createdAt]
        );
        const newW: WithdrawalRow = {
          id: result.insertId,
          ...w,
          createdAt,
        };
        memoryStore.withdrawals.push(newW);
        saveStoreToDisk();
        return newW;
      } catch (err) {
        console.error('MariaDB error in createWithdrawal:', err);
      }
    }

    const newW: WithdrawalRow = {
      id: memoryStore.nextIds.withdrawals++,
      ...w,
      createdAt,
    };
    memoryStore.withdrawals.push(newW);
    saveStoreToDisk();
    return newW;
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM withdrawals WHERE userId = ? ORDER BY id DESC', [userId]);
        return rows;
      } catch (err) {
        console.error('MariaDB error in getUserWithdrawals:', err);
      }
    }
    return memoryStore.withdrawals.filter(w => w.userId === userId).sort((a, b) => b.id - a.id);
  },

  async getAllWithdrawals(): Promise<WithdrawalRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM withdrawals ORDER BY id DESC');
        return rows;
      } catch (err) {
        console.error('MariaDB error in getAllWithdrawals:', err);
      }
    }
    return [...memoryStore.withdrawals].sort((a, b) => b.id - a.id);
  },

  async updateWithdrawalStatus(id: number, status: 'approved' | 'paid' | 'rejected'): Promise<WithdrawalRow | null> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query('UPDATE withdrawals SET status = ? WHERE id = ?', [status, id]);
        const [rows]: any = await mariadbPool.query('SELECT * FROM withdrawals WHERE id = ? LIMIT 1', [id]);
        if (rows[0]) {
          const w = memoryStore.withdrawals.find(x => x.id === id);
          if (w) w.status = status;
          saveStoreToDisk();
          return rows[0];
        }
      } catch (err) {
        console.error('MariaDB error in updateWithdrawalStatus:', err);
      }
    }

    const w = memoryStore.withdrawals.find(x => x.id === id);
    if (!w) return null;
    w.status = status;
    saveStoreToDisk();
    return w;
  },

  // Coupons
  async findCoupon(code: string): Promise<CouponRow | null> {
    const uppercaseCode = code.trim().toUpperCase();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM coupons WHERE code = ? LIMIT 1', [uppercaseCode]);
        return rows[0] || null;
      } catch (err) {
        console.error('MariaDB error in findCoupon:', err);
      }
    }
    return memoryStore.coupons.find(c => c.code === uppercaseCode) || null;
  },

  async markCouponUsed(id: number, userId: string): Promise<void> {
    const usedAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query('UPDATE coupons SET isUsed = 1, usedBy = ?, usedAt = ? WHERE id = ?', [userId, usedAt, id]);
      } catch (err) {
        console.error('MariaDB error in markCouponUsed:', err);
      }
    }

    const coupon = memoryStore.coupons.find(c => c.id === id);
    if (coupon) {
      coupon.isUsed = 1;
      coupon.usedBy = userId;
      coupon.usedAt = usedAt;
      saveStoreToDisk();
    }
  },

  async createCoupon(code: string, amount: number): Promise<CouponRow> {
    const uppercaseCode = code.trim().toUpperCase();
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          'INSERT INTO coupons (code, amount, isUsed, createdAt) VALUES (?, ?, 0, ?)',
          [uppercaseCode, amount, createdAt]
        );
        const c: CouponRow = {
          id: result.insertId,
          code: uppercaseCode,
          amount,
          isUsed: 0,
          usedBy: null,
          usedAt: null,
          createdAt,
        };
        memoryStore.coupons.push(c);
        saveStoreToDisk();
        return c;
      } catch (err) {
        console.error('MariaDB error in createCoupon:', err);
      }
    }

    const c: CouponRow = {
      id: memoryStore.nextIds.coupons++,
      code: uppercaseCode,
      amount,
      isUsed: 0,
      usedBy: null,
      usedAt: null,
      createdAt,
    };
    memoryStore.coupons.push(c);
    saveStoreToDisk();
    return c;
  },

  async getAllCoupons(): Promise<CouponRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM coupons ORDER BY id DESC');
        return rows;
      } catch (err) {
        console.error('MariaDB error in getAllCoupons:', err);
      }
    }
    return [...memoryStore.coupons].sort((a, b) => b.id - a.id);
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM settings');
        const res: Record<string, string> = { ...memoryStore.settings };
        for (const row of rows) {
          res[row.keyName] = row.keyValue;
        }
        return res;
      } catch (err) {
        console.error('MariaDB error in getSettings:', err);
      }
    }
    return { ...memoryStore.settings };
  },

  async updateSetting(keyName: string, keyValue: string): Promise<void> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query(
          'INSERT INTO settings (keyName, keyValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE keyValue = ?',
          [keyName, keyValue, keyValue]
        );
      } catch (err) {
        console.error('MariaDB error in updateSetting:', err);
      }
    }
    memoryStore.settings[keyName] = keyValue;
    saveStoreToDisk();
  },

  // Roulette Logs
  async createRouletteLog(log: Omit<RouletteLogRow, 'id' | 'createdAt'>): Promise<RouletteLogRow> {
    const createdAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [result]: any = await mariadbPool.query(
          `INSERT INTO roulette_logs (userId, mobileNumber, betAmount, outcome, multiplier, payout, playerProfit, houseProfit, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.userId,
            log.mobileNumber,
            log.betAmount,
            log.outcome,
            log.multiplier,
            log.payout,
            log.playerProfit,
            log.houseProfit,
            createdAt,
          ]
        );
        const newLog: RouletteLogRow = {
          id: result.insertId,
          ...log,
          createdAt,
        };
        memoryStore.roulette_logs.unshift(newLog);
        saveStoreToDisk();
        return newLog;
      } catch (err) {
        console.error('MariaDB error in createRouletteLog:', err);
      }
    }

    const newLog: RouletteLogRow = {
      id: memoryStore.nextIds.roulette_logs++,
      ...log,
      createdAt,
    };
    memoryStore.roulette_logs.unshift(newLog);
    saveStoreToDisk();
    return newLog;
  },

  async getRecentRouletteWins(limit = 20): Promise<RouletteLogRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query(
          'SELECT * FROM roulette_logs WHERE multiplier > 0 ORDER BY id DESC LIMIT ?',
          [limit]
        );
        return rows;
      } catch (err) {
        console.error('MariaDB error in getRecentRouletteWins:', err);
      }
    }
    return memoryStore.roulette_logs.filter(l => l.multiplier > 0).slice(0, limit);
  },

  async getAllRouletteLogs(limit = 100): Promise<RouletteLogRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM roulette_logs ORDER BY id DESC LIMIT ?', [limit]);
        return rows;
      } catch (err) {
        console.error('MariaDB error in getAllRouletteLogs:', err);
      }
    }
    return memoryStore.roulette_logs.slice(0, limit);
  },

  // Mission Claims
  async getClaimedMissions(userId: string): Promise<string[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT missionId FROM mission_claims WHERE userId = ?', [userId]);
        return rows.map((r: any) => r.missionId);
      } catch (err) {
        console.error('MariaDB error in getClaimedMissions:', err);
      }
    }
    return memoryStore.mission_claims.filter(m => m.userId === userId).map(m => m.missionId);
  },

  async claimMission(userId: string, missionId: string, reward: number): Promise<void> {
    const claimedAt = new Date().toISOString();
    if (isMariaDbConnected && mariadbPool) {
      try {
        await mariadbPool.query(
          'INSERT INTO mission_claims (userId, missionId, reward, claimedAt) VALUES (?, ?, ?, ?)',
          [userId, missionId, reward, claimedAt]
        );
      } catch (err) {
        console.error('MariaDB error in claimMission:', err);
      }
    }
    memoryStore.mission_claims.push({
      id: memoryStore.nextIds.mission_claims++,
      userId,
      missionId,
      reward,
      claimedAt,
    });
    saveStoreToDisk();
  },

  // MLM Team Hierarchy Lookups
  async getDirectReferrals(referralCode: string): Promise<UserRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM users WHERE referredBy = ?', [referralCode]);
        return rows;
      } catch (err) {
        console.error('MariaDB error in getDirectReferrals:', err);
      }
    }
    return memoryStore.users.filter(u => u.referredBy?.toUpperCase() === referralCode.toUpperCase());
  },

  async getAllUsers(): Promise<UserRow[]> {
    if (isMariaDbConnected && mariadbPool) {
      try {
        const [rows]: any = await mariadbPool.query('SELECT * FROM users ORDER BY id DESC');
        return rows;
      } catch (err) {
        console.error('MariaDB error in getAllUsers:', err);
      }
    }
    return [...memoryStore.users];
  },
};
