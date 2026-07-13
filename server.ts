import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { 
  properties, 
  units, 
  tenants, 
  leases, 
  payments, 
  maintenance, 
  notifications, 
  documents 
} from './src/db/schema.ts';
import { requireAuth } from './src/middleware/auth.ts';

// Import seed data
import { 
  DEFAULT_PROPERTIES, 
  DEFAULT_UNITS, 
  DEFAULT_TENANTS, 
  DEFAULT_LEASES, 
  DEFAULT_PAYMENTS, 
  DEFAULT_MAINTENANCE, 
  DEFAULT_NOTIFICATIONS, 
  DEFAULT_DOCUMENTS 
} from './src/data.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // HEALTH CHECK
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'postgres_cloud_sql' });
  });

  // SEED DATABASE
  app.post('/api/seed', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      console.log(`Seeding database with default data for user ${userId}...`);
      
      // Clear current user's tables and any orphan null-userId rows first to avoid key conflicts
      await db.delete(documents).where(or(eq(documents.userId, userId), isNull(documents.userId)));
      await db.delete(notifications).where(or(eq(notifications.userId, userId), isNull(notifications.userId)));
      await db.delete(maintenance).where(or(eq(maintenance.userId, userId), isNull(maintenance.userId)));
      await db.delete(payments).where(or(eq(payments.userId, userId), isNull(payments.userId)));
      await db.delete(leases).where(or(eq(leases.userId, userId), isNull(leases.userId)));
      await db.delete(units).where(or(eq(units.userId, userId), isNull(units.userId)));
      await db.delete(tenants).where(or(eq(tenants.userId, userId), isNull(tenants.userId)));
      await db.delete(properties).where(or(eq(properties.userId, userId), isNull(properties.userId)));

      const nowStr = new Date().toISOString();

      // Insert Properties
      if (DEFAULT_PROPERTIES.length > 0) {
        await db.insert(properties).values(DEFAULT_PROPERTIES.map(p => ({
          ...p,
          userId,
          createdAt: p.createdAt || nowStr,
          updatedAt: p.updatedAt || nowStr
        })));
      }

      // Insert Tenants
      if (DEFAULT_TENANTS.length > 0) {
        await db.insert(tenants).values(DEFAULT_TENANTS.map(t => ({
          ...t,
          userId,
          createdAt: t.createdAt || nowStr,
          updatedAt: t.updatedAt || nowStr
        })));
      }

      // Insert Units
      if (DEFAULT_UNITS.length > 0) {
        await db.insert(units).values(DEFAULT_UNITS.map(u => ({
          ...u,
          userId,
          createdAt: u.createdAt || nowStr,
          updatedAt: u.updatedAt || nowStr
        })));
      }

      // Insert Leases
      if (DEFAULT_LEASES.length > 0) {
        await db.insert(leases).values(DEFAULT_LEASES.map(l => ({
          ...l,
          userId,
          renewalHistory: l.renewalHistory || null,
          createdAt: l.createdAt || nowStr,
          updatedAt: l.updatedAt || nowStr
        })));
      }

      // Insert Payments
      if (DEFAULT_PAYMENTS.length > 0) {
        await db.insert(payments).values(DEFAULT_PAYMENTS.map(p => ({
          ...p,
          userId,
          createdAt: p.createdAt || nowStr,
          updatedAt: p.updatedAt || nowStr
        })));
      }

      // Insert Maintenance
      if (DEFAULT_MAINTENANCE.length > 0) {
        await db.insert(maintenance).values(DEFAULT_MAINTENANCE.map(m => ({
          ...m,
          userId,
          createdAt: m.createdAt || nowStr,
          updatedAt: m.updatedAt || nowStr
        })));
      }

      // Insert Notifications
      if (DEFAULT_NOTIFICATIONS.length > 0) {
        await db.insert(notifications).values(DEFAULT_NOTIFICATIONS.map(n => ({
          ...n,
          userId,
          createdAt: n.createdAt || nowStr
        })));
      }

      // Insert Documents
      if (DEFAULT_DOCUMENTS && DEFAULT_DOCUMENTS.length > 0) {
        await db.insert(documents).values(DEFAULT_DOCUMENTS.map(d => ({
          ...d,
          userId,
          createdAt: d.createdAt || nowStr,
          updatedAt: d.updatedAt || nowStr
        })));
      }

      res.json({ message: 'Database seeded successfully' });
    } catch (error) {
      console.error('Failed to seed database:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // CLEAR ALL DATA
  app.post('/api/clear', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      console.log(`Clearing database tables for user ${userId}...`);
      await db.delete(documents).where(or(eq(documents.userId, userId), isNull(documents.userId)));
      await db.delete(notifications).where(or(eq(notifications.userId, userId), isNull(notifications.userId)));
      await db.delete(maintenance).where(or(eq(maintenance.userId, userId), isNull(maintenance.userId)));
      await db.delete(payments).where(or(eq(payments.userId, userId), isNull(payments.userId)));
      await db.delete(leases).where(or(eq(leases.userId, userId), isNull(leases.userId)));
      await db.delete(units).where(or(eq(units.userId, userId), isNull(units.userId)));
      await db.delete(tenants).where(or(eq(tenants.userId, userId), isNull(tenants.userId)));
      await db.delete(properties).where(or(eq(properties.userId, userId), isNull(properties.userId)));
      res.json({ message: 'Database cleared successfully' });
    } catch (error) {
      console.error('Failed to clear database:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // BULK GET ALL DATA
  app.get('/api/all', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const [
        propsList,
        unitsList,
        tenantsList,
        leasesList,
        paymentsList,
        maintList,
        notifsList,
        docsList
      ] = await Promise.all([
        db.select().from(properties).where(eq(properties.userId, userId)),
        db.select().from(units).where(eq(units.userId, userId)),
        db.select().from(tenants).where(eq(tenants.userId, userId)),
        db.select().from(leases).where(eq(leases.userId, userId)),
        db.select().from(payments).where(eq(payments.userId, userId)),
        db.select().from(maintenance).where(eq(maintenance.userId, userId)),
        db.select().from(notifications).where(eq(notifications.userId, userId)),
        db.select().from(documents).where(eq(documents.userId, userId))
      ]);

      res.json({
        properties: propsList,
        units: unitsList,
        tenants: tenantsList,
        leases: leasesList,
        payments: paymentsList,
        maintenance: maintList,
        notifications: notifsList,
        documents: docsList
      });
    } catch (error) {
      console.error('Failed to fetch bulk data:', error);
      res.status(500).json({ error: 'Database query failed. Please try again later.' });
    }
  });

  // PROPERTIES CRUD
  app.get('/api/properties', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(properties).where(eq(properties.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  app.post('/api/properties', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(properties).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create property' });
    }
  });

  app.put('/api/properties/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        updatedAt: nowStr
      };
      // Omit id and userId from body just to be safe
      delete payload.id;
      delete payload.userId;
      await db.update(properties).set(payload).where(and(eq(properties.id, id), eq(properties.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update property' });
    }
  });

  app.delete('/api/properties/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(properties).where(and(eq(properties.id, id), eq(properties.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete property' });
    }
  });

  // UNITS CRUD
  app.get('/api/units', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(units).where(eq(units.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  });

  app.post('/api/units', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(units).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create unit' });
    }
  });

  app.put('/api/units/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        updatedAt: nowStr
      };
      delete payload.id;
      delete payload.userId;
      await db.update(units).set(payload).where(and(eq(units.id, id), eq(units.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update unit' });
    }
  });

  app.delete('/api/units/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(units).where(and(eq(units.id, id), eq(units.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  });

  // TENANTS CRUD
  app.get('/api/tenants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(tenants).where(eq(tenants.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  });

  app.post('/api/tenants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(tenants).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  });

  app.put('/api/tenants/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        updatedAt: nowStr
      };
      delete payload.id;
      delete payload.userId;
      await db.update(tenants).set(payload).where(and(eq(tenants.id, id), eq(tenants.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  });

  app.delete('/api/tenants/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(tenants).where(and(eq(tenants.id, id), eq(tenants.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  });

  // LEASES CRUD
  app.get('/api/leases', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(leases).where(eq(leases.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leases' });
    }
  });

  app.post('/api/leases', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        renewalHistory: req.body.renewalHistory || null,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(leases).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create lease' });
    }
  });

  app.put('/api/leases/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        renewalHistory: req.body.renewalHistory || null,
        updatedAt: nowStr
      };
      delete payload.id;
      delete payload.userId;
      await db.update(leases).set(payload).where(and(eq(leases.id, id), eq(leases.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lease' });
    }
  });

  app.delete('/api/leases/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(leases).where(and(eq(leases.id, id), eq(leases.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete lease' });
    }
  });

  // PAYMENTS CRUD
  app.get('/api/payments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(payments).where(eq(payments.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  app.post('/api/payments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(payments).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  app.put('/api/payments/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        updatedAt: nowStr
      };
      delete payload.id;
      delete payload.userId;
      await db.update(payments).set(payload).where(and(eq(payments.id, id), eq(payments.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update payment' });
    }
  });

  app.delete('/api/payments/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  });

  // MAINTENANCE CRUD
  app.get('/api/maintenance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(maintenance).where(eq(maintenance.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch maintenance requests' });
    }
  });

  app.post('/api/maintenance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(maintenance).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create maintenance request' });
    }
  });

  app.put('/api/maintenance/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        updatedAt: nowStr
      };
      delete payload.id;
      delete payload.userId;
      await db.update(maintenance).set(payload).where(and(eq(maintenance.id, id), eq(maintenance.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update maintenance request' });
    }
  });

  app.delete('/api/maintenance/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(maintenance).where(and(eq(maintenance.id, id), eq(maintenance.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete maintenance request' });
    }
  });

  // NOTIFICATIONS CRUD
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(notifications).where(eq(notifications.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr
      };
      await db.insert(notifications).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  app.put('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      const payload = {
        ...req.body
      };
      delete payload.id;
      delete payload.userId;
      await db.update(notifications).set(payload).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
      res.json({ id, ...payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  app.delete('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      await db.delete(notifications).where(eq(notifications.userId, userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear notifications' });
    }
  });

  // DOCUMENTS CRUD
  app.get('/api/documents', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const result = await db.select().from(documents).where(eq(documents.userId, userId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.post('/api/documents', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const payload = {
        ...req.body,
        userId,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.insert(documents).values(payload);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create document record' });
    }
  });

  app.delete('/api/documents/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const { id } = req.params;
      await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete document record' });
    }
  });

  // Vite development middleware OR production asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
