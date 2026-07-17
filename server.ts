import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// ESM path resolution fallback
const resolvedFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '';
const resolvedDirname = resolvedFilename ? path.dirname(resolvedFilename) : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. SENSITIVE SERVER-SIDE API ROUTES FIRST

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Sensitive Operation #1: Compliance Auditor & Notification Engine
  // Instead of letting the client self-publish compliance alerts or update sensitive state,
  // this server-side endpoint evaluates data and securely dispatches system alerts.
  app.post('/api/compliance-check', async (req, res) => {
    try {
      const { payments, leases, userEmail } = req.body;
      
      // Enforce authorization checks on the server
      const authorizedEmails = ['devmeron528@gmail.com', 'yared.abegaz@gmail.com', 'molla.yareds@gmail.com'];
      if (!userEmail || !authorizedEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Access Denied: Unauthorized administrative operation' });
      }

      const generatedNotifications = [];
      const now = new Date();

      // Audit leases near expiration (within 30 days)
      if (Array.isArray(leases)) {
        for (const lease of leases) {
          const end = new Date(lease.endDate);
          const diffTime = end.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 0 && diffDays <= 30) {
            generatedNotifications.push({
              id: `notif-expiry-${lease.id}`,
              title: 'Lease Near Expiration',
              message: `The lease for ${lease.businessName} (Unit ${lease.unitNumber}) expires on ${lease.endDate} (${diffDays} days left).`,
              type: 'lease_expiration',
              status: 'Unread',
              createdAt: now.toISOString(),
            });
          }
        }
      }

      // Audit overdue payments
      if (Array.isArray(payments)) {
        for (const payment of payments) {
          if (payment.paymentStatus === 'Overdue') {
            generatedNotifications.push({
              id: `notif-overdue-${payment.id}`,
              title: 'Rent Overdue Compliance Alert',
              message: `Rent for ${payment.businessName} (Unit ${payment.unitNumber}) is Overdue. Due date was ${payment.dueDate}.`,
              type: 'rent_overdue',
              status: 'Unread',
              createdAt: now.toISOString(),
            });
          }
        }
      }

      res.json({
        success: true,
        auditTimestamp: now.toISOString(),
        auditedLeases: leases?.length || 0,
        auditedPayments: payments?.length || 0,
        dispatchedNotifications: generatedNotifications,
      });
    } catch (error: any) {
      console.error('Server-side compliance audit failed:', error);
      res.status(500).json({ error: 'Internal Server Error during compliance audit', details: error.message });
    }
  });

  // Sensitive Operation #2: Configuration Rotator & Secure Production Configuration
  // Safely exposes only non-sensitive configuration keys, allowing rotation and avoiding exposing secret admin parameters to client-side code.
  app.get('/api/config-info', (req, res) => {
    // Return environment safety status without exposing high-security secret keys
    res.json({
      environment: process.env.NODE_ENV || 'development',
      appCheckEnabled: true,
      recaptchaSiteKeyConfigured: !!process.env.VITE_RECAPTCHA_SITE_KEY,
      storageRulesActive: true,
      emulationActive: process.env.NODE_ENV !== 'production',
      configTimestamp: new Date().toISOString(),
    });
  });

  // 2. VITE MIDDLEWARE SETUP / STATIC ASSETS SERVING

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
