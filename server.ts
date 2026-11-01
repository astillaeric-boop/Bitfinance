import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeDatabase } from './server/db.js';
import { apiRouter } from './server/routes.js';
import { resolveUploadDirectories } from './server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize MariaDB / Relational Database Engine
  await initializeDatabase();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure and serve upload storage directories
  const { depositDir, adminQrDir, fallbackDepositDir, fallbackAdminQrDir } = resolveUploadDirectories();

  // Static handler for deposit proofs (checks primary Termux path then fallback)
  app.get('/api/uploads/deposit-proofs/:filename', (req, res) => {
    const filename = req.params.filename;
    const primaryPath = path.join(depositDir, filename);
    const fallbackPath = path.join(fallbackDepositDir, filename);

    if (fs.existsSync(primaryPath)) {
      res.sendFile(primaryPath);
    } else if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
    } else {
      res.status(404).send('Deposit proof image not found');
    }
  });

  // Static handler for admin QR codes (checks primary Termux path then fallback)
  app.get('/api/uploads/admin-qr/:filename', (req, res) => {
    const filename = req.params.filename;
    const primaryPath = path.join(adminQrDir, filename);
    const fallbackPath = path.join(fallbackAdminQrDir, filename);

    if (fs.existsSync(primaryPath)) {
      res.sendFile(primaryPath);
    } else if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
    } else {
      res.status(404).send('QR code image not found');
    }
  });

  // Mount API router
  app.use('/api', apiRouter);

  // In development, mount Vite middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BitFinance] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[BitFinance] Fatal error starting server:', err);
  process.exit(1);
});
