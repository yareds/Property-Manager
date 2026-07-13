export interface Property {
  id: string;
  name: string;
  address: string;
  type: 'Commercial' | 'Office' | 'Retail' | 'Industrial' | 'Residential';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  type: string;
  sizeSqFt: number;
  monthlyRent: number;
  occupancyStatus: 'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance';
  tenantId?: string; // Reference to Tenant
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  businessType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalLog {
  extendedAt: string;
  oldEndDate: string;
  newEndDate: string;
  notes: string;
}

export interface Lease {
  id: string;
  tenantId: string;
  businessName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  status: 'Active' | 'Pending' | 'Expired' | 'Terminated';
  renewalHistory?: RenewalLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  businessName: string;
  leaseId: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  dueDate: string;
  paymentDate?: string;
  amountDue: number;
  amountPaid: number;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Overdue' | 'Unpaid';
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'New' | 'In Progress' | 'On Hold' | 'Completed';
  assignedContractor?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'lease_expiration' | 'rent_overdue' | 'payment_received' | 'document_expiry' | 'system';
  status: 'Unread' | 'Read';
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'Lease Agreement' | 'Insurance Certificate' | 'Business License' | 'Inspection Report' | 'Receipt' | 'Other';
  associatedWith: 'Tenant' | 'Property' | 'Unit' | 'Payment' | 'Maintenance';
  associatedId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  expiryDate?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}
