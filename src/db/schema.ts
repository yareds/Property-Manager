import { pgTable, text, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';

export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  address: text('address').notNull(),
  type: text('type').notNull(),
  imageUrl: text('image_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  propertyId: text('property_id').notNull(),
  propertyName: text('property_name').notNull(),
  unitNumber: text('unit_number').notNull(),
  type: text('type').notNull(),
  sizeSqFt: doublePrecision('size_sq_ft').notNull(),
  monthlyRent: doublePrecision('monthly_rent').notNull(),
  occupancyStatus: text('occupancy_status').notNull(),
  tenantId: text('tenant_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  businessName: text('business_name').notNull(),
  contactPerson: text('contact_person').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  businessType: text('business_type').notNull(),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const leases = pgTable('leases', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  tenantId: text('tenant_id').notNull(),
  businessName: text('business_name').notNull(),
  propertyId: text('property_id').notNull(),
  propertyName: text('property_name').notNull(),
  unitId: text('unit_id').notNull(),
  unitNumber: text('unit_number').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  monthlyRent: doublePrecision('monthly_rent').notNull(),
  depositAmount: doublePrecision('deposit_amount'),
  status: text('status').notNull(),
  renewalHistory: jsonb('renewal_history'), // Stores renewal logs array
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  tenantId: text('tenant_id').notNull(),
  businessName: text('business_name').notNull(),
  leaseId: text('lease_id').notNull(),
  propertyId: text('property_id').notNull(),
  unitId: text('unit_id').notNull(),
  unitNumber: text('unit_number').notNull(),
  dueDate: text('due_date').notNull(),
  paymentDate: text('payment_date'),
  amountDue: doublePrecision('amount_due').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull(),
  paymentStatus: text('payment_status').notNull(),
  paymentMethod: text('payment_method'),
  receiptNumber: text('receipt_number'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const maintenance = pgTable('maintenance', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  propertyId: text('property_id').notNull(),
  propertyName: text('property_name').notNull(),
  unitId: text('unit_id').notNull(),
  unitNumber: text('unit_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  assignedContractor: text('assigned_contractor'),
  cost: doublePrecision('cost'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  type: text('type').notNull(),
  associatedWith: text('associated_with').notNull(),
  associatedId: text('associated_id').notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  fileSize: doublePrecision('file_size'),
  expiryDate: text('expiry_date'),
  url: text('url').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
