import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Termux default paths as specified in requirements:
// /storage/emulated/0/BitFinance/uploads/deposit-proofs/
// /storage/emulated/0/BitFinance/uploads/admin-qr/
const PRIMARY_DEPOSIT_DIR = '/storage/emulated/0/BitFinance/uploads/deposit-proofs';
const PRIMARY_ADMIN_QR_DIR = '/storage/emulated/0/BitFinance/uploads/admin-qr';

// Local fallbacks when running in containers without Android /storage/emulated/0 mount
const FALLBACK_BASE = path.resolve(process.cwd(), 'uploads');
const FALLBACK_DEPOSIT_DIR = path.join(FALLBACK_BASE, 'deposit-proofs');
const FALLBACK_ADMIN_QR_DIR = path.join(FALLBACK_BASE, 'admin-qr');

export function resolveUploadDirectories() {
  let depositDir = PRIMARY_DEPOSIT_DIR;
  let adminQrDir = PRIMARY_ADMIN_QR_DIR;

  // Try creating Termux primary directory
  try {
    if (!fs.existsSync(depositDir)) {
      fs.mkdirSync(depositDir, { recursive: true });
    }
  } catch (err) {
    // Fallback to local uploads
    depositDir = FALLBACK_DEPOSIT_DIR;
    if (!fs.existsSync(depositDir)) {
      fs.mkdirSync(depositDir, { recursive: true });
    }
  }

  try {
    if (!fs.existsSync(adminQrDir)) {
      fs.mkdirSync(adminQrDir, { recursive: true });
    }
  } catch (err) {
    adminQrDir = FALLBACK_ADMIN_QR_DIR;
    if (!fs.existsSync(adminQrDir)) {
      fs.mkdirSync(adminQrDir, { recursive: true });
    }
  }

  // Also ensure fallback directories always exist so static serving is never broken
  if (!fs.existsSync(FALLBACK_DEPOSIT_DIR)) {
    fs.mkdirSync(FALLBACK_DEPOSIT_DIR, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_ADMIN_QR_DIR)) {
    fs.mkdirSync(FALLBACK_ADMIN_QR_DIR, { recursive: true });
  }

  return { depositDir, adminQrDir, fallbackDepositDir: FALLBACK_DEPOSIT_DIR, fallbackAdminQrDir: FALLBACK_ADMIN_QR_DIR };
}

const dirs = resolveUploadDirectories();

// Multer storage for deposit proofs
const depositProofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const currentDirs = resolveUploadDirectories();
    cb(null, currentDirs.depositDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `proof_${uniqueSuffix}${ext}`);
  },
});

// Multer storage for admin QR codes
const adminQrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const currentDirs = resolveUploadDirectories();
    cb(null, currentDirs.adminQrDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `qr_${uniqueSuffix}${ext}`);
  },
});

export const uploadDepositProof = multer({
  storage: depositProofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const uploadAdminQr = multer({
  storage: adminQrStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});
