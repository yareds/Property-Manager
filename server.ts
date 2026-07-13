import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { adminDb } from './src/db/firebase-admin.ts';
import { requireAuth } from './src/middleware/auth.ts';
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

  // Firestore Collection names
  const COLLECTIONS = {
    properties: 'properties',
    units: 'units',
    tenants: 'tenants',
    leases: 'leases',
    payments: 'payments',
    maintenance: 'maintenance',
    notifications: 'notifications',
    documents: 'documents'
  };

  // HEALTH CHECK
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'firestore' });
  });

  // SEED DATABASE
  app.post('/api/seed', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      console.log(`Seeding Firestore with default data for user ${userId}...`);
      
      // Clear current user's collections first to avoid conflict and keep database pristine
      await Promise.all(
        Object.values(COLLECTIONS).map(async (collName) => {
          const snapshot = await adminDb.collection(collName).get();
          const batch = adminDb.batch();
          let count = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.userId === userId || !data.userId) {
              batch.delete(doc.ref);
              count++;
            }
          });
          if (count > 0) {
            await batch.commit();
          }
        })
      );

      const nowStr = new Date().toISOString();

      const seeds = [
        { coll: COLLECTIONS.properties, items: DEFAULT_PROPERTIES },
        { coll: COLLECTIONS.tenants, items: DEFAULT_TENANTS },
        { coll: COLLECTIONS.units, items: DEFAULT_UNITS },
        { coll: COLLECTIONS.leases, items: DEFAULT_LEASES.map(l => ({ ...l, renewalHistory: l.renewalHistory || null })) },
        { coll: COLLECTIONS.payments, items: DEFAULT_PAYMENTS },
        { coll: COLLECTIONS.maintenance, items: DEFAULT_MAINTENANCE },
        { coll: COLLECTIONS.notifications, items: DEFAULT_NOTIFICATIONS },
        { coll: COLLECTIONS.documents, items: DEFAULT_DOCUMENTS || [] }
      ];

      for (const seed of seeds) {
        if (seed.items && seed.items.length > 0) {
          const batch = adminDb.batch();
          seed.items.forEach((item: any) => {
            const docRef = adminDb.collection(seed.coll).doc(item.id);
            batch.set(docRef, {
              ...item,
              userId,
              createdAt: item.createdAt || nowStr,
              updatedAt: item.updatedAt || nowStr
            });
          });
          await batch.commit();
        }
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
      console.log(`Clearing Firestore collections for user ${userId}...`);
      await Promise.all(
        Object.values(COLLECTIONS).map(async (collName) => {
          const snapshot = await adminDb.collection(collName).get();
          const batch = adminDb.batch();
          let count = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.userId === userId || !data.userId) {
              batch.delete(doc.ref);
              count++;
            }
          });
          if (count > 0) {
            await batch.commit();
          }
        })
      );
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
        adminDb.collection(COLLECTIONS.properties).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.units).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.tenants).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.leases).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.payments).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.maintenance).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.notifications).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data())),
        adminDb.collection(COLLECTIONS.documents).where('userId', '==', userId).get().then(s => s.docs.map(d => d.data()))
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

  // Helper function to create generic CRUD endpoints for Firestore
  const createCrudRoutes = (endpoint: string, collectionName: string) => {
    // GET List
    app.get(`/api/${endpoint}`, requireAuth, async (req: any, res) => {
      try {
        const userId = req.user?.uid || 'guest_user';
        const snapshot = await adminDb.collection(collectionName).where('userId', '==', userId).get();
        const list = snapshot.docs.map(doc => doc.data());
        res.json(list);
      } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error);
        res.status(500).json({ error: `Failed to fetch ${endpoint}` });
      }
    });

    // POST Create
    app.post(`/api/${endpoint}`, requireAuth, async (req: any, res) => {
      try {
        const userId = req.user?.uid || 'guest_user';
        const nowStr = new Date().toISOString();
        const id = req.body.id || adminDb.collection(collectionName).doc().id;
        const payload = {
          ...req.body,
          id,
          userId,
          createdAt: req.body.createdAt || nowStr,
          updatedAt: req.body.updatedAt || nowStr
        };
        await adminDb.collection(collectionName).doc(id).set(payload);
        res.status(201).json(payload);
      } catch (error) {
        console.error(`Failed to create ${endpoint}:`, error);
        res.status(500).json({ error: `Failed to create ${endpoint}` });
      }
    });

    // PUT Update
    app.put(`/api/${endpoint}/:id`, requireAuth, async (req: any, res) => {
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

        const docRef = adminDb.collection(collectionName).doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          return res.status(404).json({ error: `${endpoint} not found` });
        }
        const existingData = docSnap.data();
        if (existingData?.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized to update this record' });
        }

        await docRef.update(payload);
        res.json({ id, ...payload });
      } catch (error) {
        console.error(`Failed to update ${endpoint}:`, error);
        res.status(500).json({ error: `Failed to update ${endpoint}` });
      }
    });

    // DELETE Remove
    app.delete(`/api/${endpoint}/:id`, requireAuth, async (req: any, res) => {
      try {
        const userId = req.user?.uid || 'guest_user';
        const { id } = req.params;

        const docRef = adminDb.collection(collectionName).doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          return res.status(404).json({ error: `${endpoint} not found` });
        }
        const existingData = docSnap.data();
        if (existingData?.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized to delete this record' });
        }

        await docRef.delete();
        res.json({ success: true });
      } catch (error) {
        console.error(`Failed to delete ${endpoint}:`, error);
        res.status(500).json({ error: `Failed to delete ${endpoint}` });
      }
    });
  };

  // Register standard CRUD routes
  createCrudRoutes('properties', COLLECTIONS.properties);
  createCrudRoutes('units', COLLECTIONS.units);
  createCrudRoutes('tenants', COLLECTIONS.tenants);
  createCrudRoutes('leases', COLLECTIONS.leases);
  createCrudRoutes('payments', COLLECTIONS.payments);
  createCrudRoutes('maintenance', COLLECTIONS.maintenance);
  createCrudRoutes('documents', COLLECTIONS.documents);

  // Special notification routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const snapshot = await adminDb.collection(COLLECTIONS.notifications).where('userId', '==', userId).get();
      const list = snapshot.docs.map(doc => doc.data());
      res.json(list);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const nowStr = new Date().toISOString();
      const id = req.body.id || adminDb.collection(COLLECTIONS.notifications).doc().id;
      const payload = {
        ...req.body,
        id,
        userId,
        createdAt: req.body.createdAt || nowStr
      };
      await adminDb.collection(COLLECTIONS.notifications).doc(id).set(payload);
      res.status(201).json(payload);
    } catch (error) {
      console.error('Failed to create notification:', error);
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

      const docRef = adminDb.collection(COLLECTIONS.notifications).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      const existingData = docSnap.data();
      if (existingData?.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update this notification' });
      }

      await docRef.update(payload);
      res.json({ id, ...payload });
    } catch (error) {
      console.error('Failed to update notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  app.delete('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.uid || 'guest_user';
      const snapshot = await adminDb.collection(COLLECTIONS.notifications).where('userId', '==', userId).get();
      const batch = adminDb.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      res.status(500).json({ error: 'Failed to clear notifications' });
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
