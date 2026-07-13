import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logoutUser } from '../firebase';
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

  // Auto-detect legacy seed data and clear it to trigger fresh seed with new requested businesses
  useEffect(() => {
    const tenantsJson = localStorage.getItem('pm_tenants');
    if (
      tenantsJson && (
        tenantsJson.includes('ByteCore') || 
        tenantsJson.includes('Apex Consulting') || 
        tenantsJson.includes('INDOCHINE APPAREL PLC') || 
        !tenantsJson.includes('Omo Microfinance S.C')
      )
    ) {
      localStorage.removeItem('pm_properties');
      localStorage.removeItem('pm_units');
      localStorage.removeItem('pm_tenants');
      localStorage.removeItem('pm_leases');
      localStorage.removeItem('pm_payments');
      localStorage.removeItem('pm_maintenance');
      localStorage.removeItem('pm_notifications');
      localStorage.removeItem('pm_documents');
    }
  }, []);
  
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

  // REST API FETCH HELPER WITH AUTHENTICATION
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    } as Record<string, string>;

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error('Failed to get Firebase Auth token:', err);
      }
    } else if (isGuest) {
      headers['Authorization'] = 'Bearer guest';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Login handler
  const login = async () => {
    try {
      const signedInUser = await signInWithGoogle();
      setUser(signedInUser);
      setIsGuest(false);
      localStorage.setItem('pm_is_guest', 'false');
    } catch (err) {
      console.error("Login failed:", err);
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        setIsGuest(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sync / Load data from backend Express REST APIs
  useEffect(() => {
    if (authLoading) return;

    if (user || isGuest) {
      setLoading(true);
      const loadAllData = async () => {
        try {
          let data = await fetchWithAuth('/api/all');
          
          // Auto-seed if the database is empty
          if (!data.properties || data.properties.length === 0) {
            console.log("Database is empty, auto-seeding sample records...");
            await fetchWithAuth('/api/seed', { method: 'POST' });
            data = await fetchWithAuth('/api/all');
          }

          setProperties((data.properties || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
          setUnits((data.units || []).sort((a: any, b: any) => a.unitNumber.localeCompare(b.unitNumber)));
          setTenants((data.tenants || []).sort((a: any, b: any) => a.businessName.localeCompare(b.businessName)));
          setLeases((data.leases || []).sort((a: any, b: any) => b.endDate.localeCompare(a.endDate)));
          setPayments((data.payments || []).sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate)));
          setMaintenance((data.maintenance || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
          setNotifications((data.notifications || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
          setDocuments((data.documents || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
        } catch (err) {
          console.error("Failed to load Cloud SQL data:", err);
          if (isGuest) {
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
    if (isGuest && !user) {
      saveLocalStorageData('pm_properties', properties);
      saveLocalStorageData('pm_units', units);
      saveLocalStorageData('pm_tenants', tenants);
      saveLocalStorageData('pm_leases', leases);
      saveLocalStorageData('pm_payments', payments);
      saveLocalStorageData('pm_maintenance', maintenance);
      saveLocalStorageData('pm_notifications', notifications);
      saveLocalStorageData('pm_documents', documents);
    }
  }, [isGuest, user, properties, units, tenants, leases, payments, maintenance, notifications, documents]);

  // SEED DATABASE WITH SAMPLE DATA
  const seedDatabase = async () => {
    if (user || isGuest) {
      setLoading(true);
      try {
        await fetchWithAuth('/api/seed', { method: 'POST' });
        // Reload all data
        const data = await fetchWithAuth('/api/all');
        setProperties((data.properties || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
        setUnits((data.units || []).sort((a: any, b: any) => a.unitNumber.localeCompare(b.unitNumber)));
        setTenants((data.tenants || []).sort((a: any, b: any) => a.businessName.localeCompare(b.businessName)));
        setLeases((data.leases || []).sort((a: any, b: any) => b.endDate.localeCompare(a.endDate)));
        setPayments((data.payments || []).sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate)));
        setMaintenance((data.maintenance || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
        setNotifications((data.notifications || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
        setDocuments((data.documents || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
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
    if (user || isGuest) {
      setLoading(true);
      try {
        await fetchWithAuth('/api/clear', { method: 'POST' });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/properties', {
          method: 'POST',
          body: JSON.stringify(newProp),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/properties/${property.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setProperties(prev => prev.map(p => p.id === property.id ? updated : p));
      } catch (err) {
        console.error('Failed to update property:', err);
      }
    } else {
      setProperties(prev => prev.map(p => p.id === property.id ? updated : p));
    }
  };

  const deleteProperty = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/properties/${id}`, {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/units', {
          method: 'POST',
          body: JSON.stringify(newUnit),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/units/${unit.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setUnits(prev => prev.map(u => u.id === unit.id ? updated : u));
      } catch (err) {
        console.error('Failed to update unit:', err);
      }
    } else {
      setUnits(prev => prev.map(u => u.id === unit.id ? updated : u));
    }
  };

  const deleteUnit = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/units/${id}`, {
          method: 'DELETE'
        });
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
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/tenants', {
          method: 'POST',
          body: JSON.stringify(newTenant),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/tenants/${tenant.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setTenants(prev => prev.map(t => t.id === tenant.id ? updated : t));
      } catch (err) {
        console.error('Failed to update tenant:', err);
      }
    } else {
      setTenants(prev => prev.map(t => t.id === tenant.id ? updated : t));
    }
  };

  const deleteTenant = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/tenants/${id}`, {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/leases', {
          method: 'POST',
          body: JSON.stringify(newLease),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/leases/${lease.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setLeases(prev => prev.map(l => l.id === lease.id ? updated : l));
      } catch (err) {
        console.error('Failed to update lease:', err);
      }
    } else {
      setLeases(prev => prev.map(l => l.id === lease.id ? updated : l));
    }
  };

  const deleteLease = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/leases/${id}`, {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/payments', {
          method: 'POST',
          body: JSON.stringify(newPayment),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/payments/${payment.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
      } catch (err) {
        console.error('Failed to update payment:', err);
      }
    } else {
      setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
    }
  };

  const deletePayment = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/payments/${id}`, {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/maintenance', {
          method: 'POST',
          body: JSON.stringify(newMaint),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/maintenance/${request.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setMaintenance(prev => prev.map(m => m.id === request.id ? updated : m));
      } catch (err) {
        console.error('Failed to update maintenance request:', err);
      }
    } else {
      setMaintenance(prev => prev.map(m => m.id === request.id ? updated : m));
    }
  };

  const deleteMaintenance = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/maintenance/${id}`, {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/notifications', {
          method: 'POST',
          body: JSON.stringify(newNotif),
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/notifications/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
    }
  };

  const clearAllNotifications = async () => {
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/notifications', {
          method: 'DELETE'
        });
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
    if (user || isGuest) {
      try {
        await fetchWithAuth('/api/documents', {
          method: 'POST',
          body: JSON.stringify(newDoc),
        });
        setDocuments(prev => [newDoc, ...prev]);
      } catch (err) {
        console.error('Failed to add document:', err);
      }
    } else {
      setDocuments(prev => [newDoc, ...prev]);
    }
  };

  const deleteDocument = async (id: string) => {
    if (user || isGuest) {
      try {
        await fetchWithAuth(`/api/documents/${id}`, {
          method: 'DELETE'
        });
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
