import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logoutUser, db, handleFirestoreError, OperationType } from '../firebase';
import { ShieldAlert, Lock, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Property, 
  Unit, 
  Tenant, 
  Lease, 
  Payment, 
  MaintenanceRequest, 
  Notification, 
  Document 
} from '../types';
import { 
  DEFAULT_PROPERTIES, 
  DEFAULT_UNITS, 
  DEFAULT_TENANTS, 
  DEFAULT_LEASES, 
  DEFAULT_PAYMENTS, 
  DEFAULT_MAINTENANCE, 
  DEFAULT_NOTIFICATIONS, 
  DEFAULT_DOCUMENTS 
} from '../data';

function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

interface FirebaseContextType {
  user: User | null;
  authLoading: boolean;
  isGuest: boolean;
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  maintenance: MaintenanceRequest[];
  notifications: Notification[];
  documents: Document[];
  loading: boolean;
  
  // Auth Operations
  login: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;

  // DB Sync / Seeding
  seedDatabase: () => Promise<void>;
  clearAllData: () => Promise<void>;

  // Property CRUD
  addProperty: (property: Omit<Property, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;

  // Unit CRUD
  addUnit: (unit: Omit<Unit, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUnit: (unit: Unit) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;

  // Tenant CRUD
  addTenant: (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;

  // Lease CRUD
  addLease: (lease: Omit<Lease, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLease: (lease: Lease) => Promise<void>;
  deleteLease: (id: string) => Promise<void>;

  // Payment CRUD
  addPayment: (payment: Omit<Payment, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  // Maintenance CRUD
  addMaintenance: (request: Omit<MaintenanceRequest, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMaintenance: (request: MaintenanceRequest) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  // Notification CRUD
  addNotification: (notif: Omit<Notification, 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Document CRUD
  addDocument: (docInfo: Omit<Document, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('pm_is_guest') === 'true';
  });

  // Clear any cached localStorage data when an authenticated user is logged in to ensure pure Firestore data
  useEffect(() => {
    if (user) {
      const keysToRemove = [
        'pm_properties', 'pm_units', 'pm_tenants', 'pm_leases', 
        'pm_payments', 'pm_maintenance', 'pm_notifications', 'pm_documents'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('pm_user_') || key.startsWith('pm_')) {
            if (key !== 'pm_is_guest') {
              localStorage.removeItem(key);
            }
          }
        });
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [user]);
  
  // Real or offline storage lists
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Allowed Admin Emails
  const ALLOWED_ADMIN_EMAILS = [
    'yared.abegaz@gmail.com',
    'devmeron528@gmail.com',
    'molla.yareds@gmail.com'
  ];

  // Helper: Read LocalStorage fallback data
  const getLocalStorageData = <T,>(key: string, defaults: T[]): T[] => {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return JSON.parse(item);
    } catch {
      return defaults;
    }
  };

  const saveLocalStorageData = <T,>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);

  // Login handler
  const login = async () => {
    try {
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) {
        return;
      }
      if (signedInUser.email) {
        const emailLower = signedInUser.email.toLowerCase();
        const isAuthorized = ALLOWED_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);
        if (!isAuthorized) {
          await logoutUser();
          setUser(null);
          setUnauthorizedEmail(signedInUser.email);
          return;
        }
      }
      setUser(signedInUser);
      setIsGuest(false);
      localStorage.setItem('pm_is_guest', 'false');
    } catch (err: any) {
      console.warn("Login process completed or cancelled:", err?.message || err);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem('pm_is_guest');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Guest entry handler
  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('pm_is_guest', 'true');
    setLoading(false);
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const emailLower = firebaseUser.email.toLowerCase();
        const isAuthorized = ALLOWED_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);
        if (!isAuthorized) {
          console.warn("Unauthorized login attempt blocked:", firebaseUser.email);
          await logoutUser();
          setUser(null);
          setAuthLoading(false);
          setUnauthorizedEmail(firebaseUser.email);
          return;
        }
      }
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        setIsGuest(false);
      }
    });
    return unsubscribe;
  }, []);

  // Direct Firestore Seeding Helper (Client Side)
  const seedDatabaseDirect = async (uid: string) => {
    const batch = writeBatch(db);
    const nowStr = new Date().toISOString();
    const prefix = (id: string | undefined) => id ? `${uid}_${id}` : '';

    const props = DEFAULT_PROPERTIES.map(p => ({
      ...p,
      id: prefix(p.id),
      userId: uid,
      createdAt: p.createdAt || nowStr,
      updatedAt: p.updatedAt || nowStr
    }));

    const tenants = DEFAULT_TENANTS.map(t => ({
      ...t,
      id: prefix(t.id),
      userId: uid,
      createdAt: t.createdAt || nowStr,
      updatedAt: t.updatedAt || nowStr
    }));

    const units = DEFAULT_UNITS.map(u => ({
      ...u,
      id: prefix(u.id),
      propertyId: prefix(u.propertyId),
      tenantId: u.tenantId ? prefix(u.tenantId) : undefined,
      userId: uid,
      createdAt: u.createdAt || nowStr,
      updatedAt: u.updatedAt || nowStr
    }));

    const leases = DEFAULT_LEASES.map(l => ({
      ...l,
      id: prefix(l.id),
      tenantId: prefix(l.tenantId),
      propertyId: prefix(l.propertyId),
      unitId: prefix(l.unitId),
      renewalHistory: l.renewalHistory || null,
      userId: uid,
      createdAt: l.createdAt || nowStr,
      updatedAt: l.updatedAt || nowStr
    }));

    const payments = DEFAULT_PAYMENTS.map(p => ({
      ...p,
      id: prefix(p.id),
      tenantId: prefix(p.tenantId),
      leaseId: prefix(p.leaseId),
      propertyId: prefix(p.propertyId),
      unitId: prefix(p.unitId),
      userId: uid,
      createdAt: p.createdAt || nowStr,
      updatedAt: p.updatedAt || nowStr
    }));

    const maintenance = DEFAULT_MAINTENANCE.map(m => ({
      ...m,
      id: prefix(m.id),
      propertyId: prefix(m.propertyId),
      unitId: prefix(m.unitId),
      userId: uid,
      createdAt: m.createdAt || nowStr,
      updatedAt: m.updatedAt || nowStr
    }));

    const notifications = DEFAULT_NOTIFICATIONS.map(n => ({
      ...n,
      id: prefix(n.id),
      userId: uid,
      createdAt: n.createdAt || nowStr
    }));

    const documents = (DEFAULT_DOCUMENTS || []).map(d => ({
      ...d,
      id: prefix(d.id),
      associatedId: prefix(d.associatedId),
      userId: uid,
      createdAt: d.createdAt || nowStr,
      updatedAt: d.updatedAt || nowStr
    }));

    const seeds = [
      { coll: 'properties', items: props },
      { coll: 'tenants', items: tenants },
      { coll: 'units', items: units },
      { coll: 'leases', items: leases },
      { coll: 'payments', items: payments },
      { coll: 'maintenance', items: maintenance },
      { coll: 'notifications', items: notifications },
      { coll: 'documents', items: documents }
    ];

    for (const seed of seeds) {
      seed.items.forEach((item: any) => {
        const docRef = doc(db, seed.coll, item.id);
        batch.set(docRef, item);
      });
    }
    await batch.commit();
  };

  // Direct Firestore Clear Helper (Client Side)
  const clearAllDataDirect = async (uid: string) => {
    const colls = ['properties', 'units', 'tenants', 'leases', 'payments', 'maintenance', 'notifications', 'documents'];
    const batch = writeBatch(db);
    let count = 0;
    
    await Promise.all(colls.map(async (name) => {
      const q = query(collection(db, name), where('userId', '==', uid));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
        count++;
      });
    }));

    if (count > 0) {
      await batch.commit();
    }
  };

  // Sync / Load data directly from Firestore Client SDK
  useEffect(() => {
    if (authLoading) return;

    if (user || isGuest) {
      setLoading(true);
      const loadAllData = async () => {
        try {
          if (user) {
            const uid = user.uid;
            
            // Helper to load collection for user
            const loadColl = async (name: string) => {
              try {
                const q = query(collection(db, name), where('userId', '==', uid));
                const snap = await getDocs(q);
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              } catch (err: any) {
                if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
                  handleFirestoreError(err, OperationType.LIST, name);
                }
                throw err;
              }
            };

            let [
              propsData,
              unitsData,
              tenantsData,
              leasesData,
              paymentsData,
              maintData,
              notifData,
              docsData
            ] = await Promise.all([
              loadColl('properties'),
              loadColl('units'),
              loadColl('tenants'),
              loadColl('leases'),
              loadColl('payments'),
              loadColl('maintenance'),
              loadColl('notifications'),
              loadColl('documents')
            ]);

            const pList = propsData.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')) as Property[];
            const uList = unitsData.sort((a: any, b: any) => (a.unitNumber || '').localeCompare(b.unitNumber || '')) as Unit[];
            const tList = tenantsData.sort((a: any, b: any) => (a.businessName || '').localeCompare(b.businessName || '')) as Tenant[];
            const lList = leasesData.sort((a: any, b: any) => (b.endDate || '').localeCompare(a.endDate || '')) as Lease[];
            const payList = paymentsData.sort((a: any, b: any) => (b.dueDate || '').localeCompare(a.dueDate || '')) as Payment[];
            const mList = maintData.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')) as MaintenanceRequest[];
            const nList = notifData.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')) as Notification[];
            const dList = docsData.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')) as Document[];

            setProperties(pList);
            setUnits(uList);
            setTenants(tList);
            setLeases(lList);
            setPayments(payList);
            setMaintenance(mList);
            setNotifications(nList);
            setDocuments(dList);
          } else if (isGuest) {
            setProperties(getLocalStorageData('pm_properties', DEFAULT_PROPERTIES));
            setUnits(getLocalStorageData('pm_units', DEFAULT_UNITS));
            setTenants(getLocalStorageData('pm_tenants', DEFAULT_TENANTS));
            setLeases(getLocalStorageData('pm_leases', DEFAULT_LEASES));
            setPayments(getLocalStorageData('pm_payments', DEFAULT_PAYMENTS));
            setMaintenance(getLocalStorageData('pm_maintenance', DEFAULT_MAINTENANCE));
            setNotifications(getLocalStorageData('pm_notifications', DEFAULT_NOTIFICATIONS));
            setDocuments(getLocalStorageData('pm_documents', DEFAULT_DOCUMENTS));
          }
        } catch (err) {
          console.error("Failed to load database data:", err);
          if (user) {
            // Authenticated users strictly use Firestore; no fallback to local storage or guest sample data
            setProperties([]);
            setUnits([]);
            setTenants([]);
            setLeases([]);
            setPayments([]);
            setMaintenance([]);
            setNotifications([]);
            setDocuments([]);
          } else if (isGuest) {
            setProperties(getLocalStorageData('pm_properties', DEFAULT_PROPERTIES));
            setUnits(getLocalStorageData('pm_units', DEFAULT_UNITS));
            setTenants(getLocalStorageData('pm_tenants', DEFAULT_TENANTS));
            setLeases(getLocalStorageData('pm_leases', DEFAULT_LEASES));
            setPayments(getLocalStorageData('pm_payments', DEFAULT_PAYMENTS));
            setMaintenance(getLocalStorageData('pm_maintenance', DEFAULT_MAINTENANCE));
            setNotifications(getLocalStorageData('pm_notifications', DEFAULT_NOTIFICATIONS));
            setDocuments(getLocalStorageData('pm_documents', DEFAULT_DOCUMENTS));
          }
        } finally {
          setLoading(false);
        }
      };

      loadAllData();
    } else {
      setProperties([]);
      setUnits([]);
      setTenants([]);
      setLeases([]);
      setPayments([]);
      setMaintenance([]);
      setNotifications([]);
      setDocuments([]);
      setLoading(false);
    }
  }, [user, isGuest, authLoading]);

  // Save guest lists to LocalStorage whenever they change
  useEffect(() => {
    if (isGuest && !user && !loading) {
      saveLocalStorageData('pm_properties', properties);
      saveLocalStorageData('pm_units', units);
      saveLocalStorageData('pm_tenants', tenants);
      saveLocalStorageData('pm_leases', leases);
      saveLocalStorageData('pm_payments', payments);
      saveLocalStorageData('pm_maintenance', maintenance);
      saveLocalStorageData('pm_notifications', notifications);
      saveLocalStorageData('pm_documents', documents);
    }
  }, [isGuest, user, loading, properties, units, tenants, leases, payments, maintenance, notifications, documents]);

  // Auto-sync missing tenants from leases to ensure every tenant with a lease appears in Tenant Directory and Units
  useEffect(() => {
    if (loading || leases.length === 0) return;

    const missingTenantsToCreate: Tenant[] = [];
    const existingNames = new Set(tenants.map(t => t.businessName.toLowerCase().trim()));
    const existingIds = new Set(tenants.map(t => t.id));

    leases.forEach(lease => {
      const nameLower = lease.businessName ? lease.businessName.toLowerCase().trim() : '';
      if (nameLower && !existingNames.has(nameLower) && (!lease.tenantId || !existingIds.has(lease.tenantId))) {
        existingNames.add(nameLower);
        const tenantId = lease.tenantId || `tenant-${crypto.randomUUID()}`;
        existingIds.add(tenantId);

        const newTenant: Tenant = {
          id: tenantId,
          businessName: lease.businessName,
          contactPerson: 'Primary Contact',
          email: `${nameLower.replace(/[^a-z0-9]/g, '')}@tenant.com`,
          phone: '',
          businessType: 'Commercial Tenant',
          status: 'Active',
          createdAt: lease.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        missingTenantsToCreate.push(newTenant);
      }
    });

    if (missingTenantsToCreate.length > 0) {
      setTenants(prev => [...prev, ...missingTenantsToCreate]);

      if (user) {
        missingTenantsToCreate.forEach(async (t) => {
          try {
            await setDoc(doc(db, 'tenants', t.id), cleanForFirestore({
              ...t,
              userId: user.uid
            }), { merge: true });
          } catch (err) {
            console.error('Failed to auto-sync missing tenant to Firestore:', err);
          }
        });
      }
    }
  }, [leases, tenants, user, loading]);

  // SEED DATABASE WITH SAMPLE DATA
  const seedDatabase = async () => {
    if (user) {
      setLoading(true);
      try {
        await seedDatabaseDirect(user.uid);
        
        // Reload all data
        const loadColl = async (name: string) => {
          try {
            const q = query(collection(db, name), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (err: any) {
            if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
              handleFirestoreError(err, OperationType.LIST, name);
            }
            throw err;
          }
        };

        const [p, u, t, l, pay, m, n, d] = await Promise.all([
          loadColl('properties'),
          loadColl('units'),
          loadColl('tenants'),
          loadColl('leases'),
          loadColl('payments'),
          loadColl('maintenance'),
          loadColl('notifications'),
          loadColl('documents')
        ]);

        setProperties(p.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as Property[]);
        setUnits(u.sort((a: any, b: any) => a.unitNumber.localeCompare(b.unitNumber)) as Unit[]);
        setTenants(t.sort((a: any, b: any) => a.businessName.localeCompare(b.businessName)) as Tenant[]);
        setLeases(l.sort((a: any, b: any) => b.endDate.localeCompare(a.endDate)) as Lease[]);
        setPayments(pay.sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate)) as Payment[]);
        setMaintenance(m.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as MaintenanceRequest[]);
        setNotifications(n.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as Notification[]);
        setDocuments(d.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as Document[]);
      } catch (err) {
        console.error("Failed to seed database:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setProperties(DEFAULT_PROPERTIES);
      setUnits(DEFAULT_UNITS);
      setTenants(DEFAULT_TENANTS);
      setLeases(DEFAULT_LEASES);
      setPayments(DEFAULT_PAYMENTS);
      setMaintenance(DEFAULT_MAINTENANCE);
      setNotifications(DEFAULT_NOTIFICATIONS);
      setDocuments(DEFAULT_DOCUMENTS);
    }
  };

  // CLEAR ALL DATA
  const clearAllData = async () => {
    if (user) {
      setLoading(true);
      try {
        await clearAllDataDirect(user.uid);
        const uid = user.uid;
        localStorage.removeItem(`pm_user_${uid}_properties`);
        localStorage.removeItem(`pm_user_${uid}_units`);
        localStorage.removeItem(`pm_user_${uid}_tenants`);
        localStorage.removeItem(`pm_user_${uid}_leases`);
        localStorage.removeItem(`pm_user_${uid}_payments`);
        localStorage.removeItem(`pm_user_${uid}_maintenance`);
        localStorage.removeItem(`pm_user_${uid}_notifications`);
        localStorage.removeItem(`pm_user_${uid}_documents`);

        setProperties([]);
        setUnits([]);
        setTenants([]);
        setLeases([]);
        setPayments([]);
        setMaintenance([]);
        setNotifications([]);
        setDocuments([]);
      } catch (err) {
        console.error("Failed to clear database:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setProperties([]);
      setUnits([]);
      setTenants([]);
      setLeases([]);
      setPayments([]);
      setMaintenance([]);
      setNotifications([]);
      setDocuments([]);
      localStorage.clear();
    }
  };

  // ==========================================
  // PROPERTY CRUD IMPLEMENTATION
  // ==========================================
  const addProperty = async (property: Omit<Property, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newProp: Property = {
      ...property,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'properties', newProp.id), cleanForFirestore({
          ...newProp,
          userId: user.uid
        }));
        setProperties(prev => [newProp, ...prev]);
      } catch (err) {
        console.error('Failed to add property:', err);
      }
    } else {
      setProperties(prev => [newProp, ...prev]);
    }
  };

  const updateProperty = async (property: Property) => {
    const updated: Property = {
      ...property,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'properties', property.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setProperties(prev => prev.map(p => p.id === property.id ? updated : p));
      } catch (err) {
        console.error('Failed to update property:', err);
      }
    } else {
      setProperties(prev => prev.map(p => p.id === property.id ? updated : p));
    }
  };

  const deleteProperty = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'properties', id));
        setProperties(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error('Failed to delete property:', err);
      }
    } else {
      setProperties(prev => prev.filter(p => p.id !== id));
    }
  };

  // ==========================================
  // UNIT CRUD IMPLEMENTATION
  // ==========================================
  const addUnit = async (unit: Omit<Unit, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newUnit: Unit = {
      ...unit,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'units', newUnit.id), cleanForFirestore({
          ...newUnit,
          userId: user.uid
        }));
        setUnits(prev => [...prev, newUnit]);
      } catch (err) {
        console.error('Failed to add unit:', err);
      }
    } else {
      setUnits(prev => [...prev, newUnit]);
    }
  };

  const updateUnit = async (unit: Unit) => {
    const updated: Unit = {
      ...unit,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'units', unit.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setUnits(prev => prev.map(u => u.id === unit.id ? updated : u));
      } catch (err) {
        console.error('Failed to update unit:', err);
      }
    } else {
      setUnits(prev => prev.map(u => u.id === unit.id ? updated : u));
    }
  };

  const deleteUnit = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'units', id));
        setUnits(prev => prev.filter(u => u.id !== id));
      } catch (err) {
        console.error('Failed to delete unit:', err);
      }
    } else {
      setUnits(prev => prev.filter(u => u.id !== id));
    }
  };

  // ==========================================
  // TENANT CRUD IMPLEMENTATION
  // ==========================================
  const addTenant = async (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newTenant: Tenant = {
      ...tenant,
      status: tenant.status || 'Active',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'tenants', newTenant.id), cleanForFirestore({
          ...newTenant,
          userId: user.uid
        }));
        setTenants(prev => [...prev, newTenant]);
      } catch (err) {
        console.error('Failed to add tenant:', err);
      }
    } else {
      setTenants(prev => [...prev, newTenant]);
    }
  };

  const updateTenant = async (tenant: Tenant) => {
    const updated: Tenant = {
      ...tenant,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'tenants', tenant.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }));
        setTenants(prev => prev.map(t => t.id === tenant.id ? updated : t));
      } catch (err) {
        console.error('Failed to update tenant:', err);
      }
    } else {
      setTenants(prev => prev.map(t => t.id === tenant.id ? updated : t));
    }
  };

  const archiveTenant = async (id: string) => {
    const targetTenant = tenants.find(t => t.id === id);
    if (!targetTenant) return;
    const tenantNameLower = targetTenant.businessName.toLowerCase();

    // Find all leases belonging to this tenant
    const tenantLeases = leases.filter(l => 
      l.tenantId === id || (tenantNameLower && l.businessName.toLowerCase() === tenantNameLower)
    );

    // Collect unit IDs linked to this tenant directly or through their leases and free them
    const unitIdsToFree = new Set<string>();
    tenantLeases.forEach(l => {
      if (l.unitId) unitIdsToFree.add(l.unitId);
    });
    units.filter(u => u.tenantId === id).forEach(u => unitIdsToFree.add(u.id));

    tenantLeases.forEach(l => {
      const matchedUnit = units.find(u => 
        u.unitNumber === l.unitNumber && (u.propertyId === l.propertyId || u.propertyName === l.propertyName)
      );
      if (matchedUnit) unitIdsToFree.add(matchedUnit.id);
    });

    for (const unitId of unitIdsToFree) {
      const targetUnit = units.find(u => u.id === unitId);
      if (targetUnit) {
        const hasOtherTenantLease = leases.some(l => 
          l.tenantId !== id && 
          (!tenantNameLower || l.businessName.toLowerCase() !== tenantNameLower) &&
          (l.status === 'Active' || l.status === 'Pending') &&
          (l.unitId === targetUnit.id || (l.unitNumber === targetUnit.unitNumber && l.propertyId === targetUnit.propertyId))
        );

        if (!hasOtherTenantLease) {
          const updatedUnit: Unit = {
            ...targetUnit,
            occupancyStatus: 'Vacant',
            tenantId: undefined,
            updatedAt: new Date().toISOString()
          };
          await updateUnit(updatedUnit);
        }
      }
    }

    // Set active or pending leases to 'Terminated' (preserve documents)
    for (const l of tenantLeases) {
      if (l.status === 'Active' || l.status === 'Pending') {
        const terminatedLease: Lease = {
          ...l,
          status: 'Terminated',
          updatedAt: new Date().toISOString()
        };
        await updateLease(terminatedLease);
      }
    }

    // Set tenant status to 'Archived' (preserve tenant document & payment records)
    const archivedTenant: Tenant = {
      ...targetTenant,
      status: 'Archived',
      updatedAt: new Date().toISOString()
    };
    await updateTenant(archivedTenant);
  };

  const deleteTenant = async (id: string) => {
    const targetTenant = tenants.find(t => t.id === id);
    if (!targetTenant) return;
    const tenantNameLower = targetTenant.businessName.toLowerCase();
    
    // Check if any payment history exists for this tenant
    const hasPayments = payments.some(p => p.tenantId === id || (tenantNameLower && p.businessName.toLowerCase() === tenantNameLower));

    if (hasPayments) {
      // Archive profile and leases to preserve financial payment history
      await archiveTenant(id);
      return;
    }

    // Hard-delete path if no payment history exists
    const tenantLeases = leases.filter(l => 
      l.tenantId === id || (tenantNameLower && l.businessName.toLowerCase() === tenantNameLower)
    );

    // Collect unit IDs linked to this tenant directly or through their leases
    const unitIdsToFree = new Set<string>();
    tenantLeases.forEach(l => {
      if (l.unitId) unitIdsToFree.add(l.unitId);
    });
    units.filter(u => u.tenantId === id).forEach(u => unitIdsToFree.add(u.id));

    // Also match units by unitNumber and propertyId/propertyName if unitId wasn't set on lease
    tenantLeases.forEach(l => {
      const matchedUnit = units.find(u => 
        u.unitNumber === l.unitNumber && (u.propertyId === l.propertyId || u.propertyName === l.propertyName)
      );
      if (matchedUnit) unitIdsToFree.add(matchedUnit.id);
    });

    // Make those units Vacant if no other active leases exist
    for (const unitId of unitIdsToFree) {
      const targetUnit = units.find(u => u.id === unitId);
      if (targetUnit) {
        const hasOtherTenantLease = leases.some(l => 
          l.tenantId !== id && 
          (!tenantNameLower || l.businessName.toLowerCase() !== tenantNameLower) &&
          (l.status === 'Active' || l.status === 'Pending') &&
          (l.unitId === targetUnit.id || (l.unitNumber === targetUnit.unitNumber && l.propertyId === targetUnit.propertyId))
        );

        if (!hasOtherTenantLease) {
          const updatedUnit: Unit = {
            ...targetUnit,
            occupancyStatus: 'Vacant',
            tenantId: undefined,
            updatedAt: new Date().toISOString()
          };
          await updateUnit(updatedUnit);
        }
      }
    }

    // Delete associated leases from DB and state
    for (const l of tenantLeases) {
      if (user) {
        try {
          await deleteDoc(doc(db, 'leases', l.id));
        } catch (err) {
          console.error('Failed to delete tenant lease:', err);
        }
      }
    }
    setLeases(prev => prev.filter(l => l.tenantId !== id && (!tenantNameLower || l.businessName.toLowerCase() !== tenantNameLower)));

    if (user) {
      try {
        await deleteDoc(doc(db, 'tenants', id));
        setTenants(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Failed to delete tenant:', err);
      }
    } else {
      setTenants(prev => prev.filter(t => t.id !== id));
    }
  };

  // ==========================================
  // LEASE CRUD IMPLEMENTATION
  // ==========================================
  const addLease = async (lease: Omit<Lease, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newLease: Lease = {
      ...lease,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'leases', newLease.id), cleanForFirestore({
          ...newLease,
          userId: user.uid
        }));
        setLeases(prev => [newLease, ...prev]);
      } catch (err) {
        console.error('Failed to add lease:', err);
      }
    } else {
      setLeases(prev => [newLease, ...prev]);
    }
  };

  const updateLease = async (lease: Lease) => {
    const updated: Lease = {
      ...lease,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'leases', lease.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setLeases(prev => prev.map(l => l.id === lease.id ? updated : l));
      } catch (err) {
        console.error('Failed to update lease:', err);
      }
    } else {
      setLeases(prev => prev.map(l => l.id === lease.id ? updated : l));
    }
  };

  const deleteLease = async (id: string) => {
    const targetLease = leases.find(l => l.id === id);
    if (!targetLease) return;

    // Check if any payment records reference this lease
    const hasPayments = payments.some(p => p.leaseId === id);

    // Find unit associated with this lease and free it if no other active/pending leases use it
    const targetUnit = units.find(u => 
      u.id === targetLease.unitId || 
      (u.unitNumber === targetLease.unitNumber && (u.propertyId === targetLease.propertyId || u.propertyName === targetLease.propertyName))
    );

    if (targetUnit) {
      const hasOtherActiveLease = leases.some(l => 
        l.id !== id && 
        (l.status === 'Active' || l.status === 'Pending') &&
        (l.unitId === targetUnit.id || (l.unitNumber === targetUnit.unitNumber && l.propertyId === targetUnit.propertyId))
      );

      if (!hasOtherActiveLease) {
        const updatedUnit: Unit = {
          ...targetUnit,
          occupancyStatus: 'Vacant',
          tenantId: undefined,
          updatedAt: new Date().toISOString()
        };
        await updateUnit(updatedUnit);
      }
    }

    if (hasPayments) {
      // Terminate lease contract rather than deleting document
      const terminatedLease: Lease = {
        ...targetLease,
        status: 'Terminated',
        updatedAt: new Date().toISOString()
      };
      await updateLease(terminatedLease);
      return;
    }

    // Hard-delete lease if no payment history exists
    if (user) {
      try {
        await deleteDoc(doc(db, 'leases', id));
        setLeases(prev => prev.filter(l => l.id !== id));
      } catch (err) {
        console.error('Failed to delete lease:', err);
      }
    } else {
      setLeases(prev => prev.filter(l => l.id !== id));
    }
  };

  // ==========================================
  // PAYMENT CRUD IMPLEMENTATION
  // ==========================================
  const addPayment = async (payment: Omit<Payment, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newPayment: Payment = {
      ...payment,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'payments', newPayment.id), cleanForFirestore({
          ...newPayment,
          userId: user.uid
        }));
        setPayments(prev => [newPayment, ...prev]);
      } catch (err) {
        console.error('Failed to add payment:', err);
      }
    } else {
      setPayments(prev => [newPayment, ...prev]);
    }
  };

  const updatePayment = async (payment: Payment) => {
    const updated: Payment = {
      ...payment,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'payments', payment.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
      } catch (err) {
        console.error('Failed to update payment:', err);
      }
    } else {
      setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
    }
  };

  const deletePayment = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'payments', id));
        setPayments(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error('Failed to delete payment:', err);
      }
    } else {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
  };

  // ==========================================
  // MAINTENANCE CRUD IMPLEMENTATION
  // ==========================================
  const addMaintenance = async (request: Omit<MaintenanceRequest, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newMaint: MaintenanceRequest = {
      ...request,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'maintenance', newMaint.id), cleanForFirestore({
          ...newMaint,
          userId: user.uid
        }));
        setMaintenance(prev => [newMaint, ...prev]);
      } catch (err) {
        console.error('Failed to add maintenance request:', err);
      }
    } else {
      setMaintenance(prev => [newMaint, ...prev]);
    }
  };

  const updateMaintenance = async (request: MaintenanceRequest) => {
    const updated: MaintenanceRequest = {
      ...request,
      updatedAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'maintenance', request.id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setMaintenance(prev => prev.map(m => m.id === request.id ? updated : m));
      } catch (err) {
        console.error('Failed to update maintenance request:', err);
      }
    } else {
      setMaintenance(prev => prev.map(m => m.id === request.id ? updated : m));
    }
  };

  const deleteMaintenance = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'maintenance', id));
        setMaintenance(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        console.error('Failed to delete maintenance request:', err);
      }
    } else {
      setMaintenance(prev => prev.filter(m => m.id !== id));
    }
  };

  // ==========================================
  // NOTIFICATION CRUD IMPLEMENTATION
  // ==========================================
  const addNotification = async (notif: Omit<Notification, 'createdAt'>) => {
    const newNotif: Notification = {
      ...notif,
      createdAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'notifications', newNotif.id), cleanForFirestore({
          ...newNotif,
          userId: user.uid
        }));
        setNotifications(prev => [newNotif, ...prev]);
      } catch (err) {
        console.error('Failed to add notification:', err);
      }
    } else {
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    const match = notifications.find(n => n.id === id);
    if (!match) return;
    
    const updated: Notification = {
      ...match,
      status: 'Read'
    };
    if (user) {
      try {
        await setDoc(doc(db, 'notifications', id), cleanForFirestore({
          ...updated,
          userId: user.uid
        }), { merge: true });
        setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
    }
  };

  const clearAllNotifications = async () => {
    if (user) {
      try {
        const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
        setNotifications([]);
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    } else {
      setNotifications([]);
    }
  };

  // ==========================================
  // DOCUMENT CRUD IMPLEMENTATION
  // ==========================================
  const addDocument = async (docInfo: Omit<Document, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const newDoc: Document = {
      ...docInfo,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user) {
      try {
        await setDoc(doc(db, 'documents', newDoc.id), cleanForFirestore({
          ...newDoc,
          userId: user.uid
        }));
        setDocuments(prev => [newDoc, ...prev]);
      } catch (err) {
        console.error('Failed to add document:', err);
      }
    } else {
      setDocuments(prev => [newDoc, ...prev]);
    }
  };

  const deleteDocument = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'documents', id));
        setDocuments(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    } else {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      authLoading,
      isGuest,
      properties,
      units,
      tenants,
      leases,
      payments,
      maintenance,
      notifications,
      documents,
      loading,
      
      login,
      logout,
      continueAsGuest,
      seedDatabase,
      clearAllData,

      addProperty,
      updateProperty,
      deleteProperty,

      addUnit,
      updateUnit,
      deleteUnit,

      addTenant,
      updateTenant,
      deleteTenant,

      addLease,
      updateLease,
      deleteLease,

      addPayment,
      updatePayment,
      deletePayment,

      addMaintenance,
      updateMaintenance,
      deleteMaintenance,

      addNotification,
      markNotificationAsRead,
      clearAllNotifications,

      addDocument,
      deleteDocument
    }}>
      {children}

      {/* Access Denied Modal for Unauthorized Login Attempts */}
      <AnimatePresence>
        {unauthorizedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Gradient Accent */}
              <div className="h-1 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500 w-full" />

              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white font-sans">Access Restricted</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Workspace Security Authorization</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUnauthorizedEmail(null);
                    logout();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-start space-x-3">
                  <Lock size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="text-slate-400 block">Signed-in account:</span>
                    <span className="font-mono text-indigo-300 font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40 break-all inline-block">
                      {unauthorizedEmail}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  The account <strong className="text-white font-semibold">{unauthorizedEmail}</strong> isn't authorized for this workspace. Access is restricted to designated property managers for this portfolio.
                </p>
              </div>

              {/* Footer */}
              <div className="p-5 pt-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setUnauthorizedEmail(null);
                    logout();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Try a Different Account</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
