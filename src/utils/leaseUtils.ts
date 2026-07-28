import { Unit, Lease, Tenant } from '../types';

/**
 * Checks if a date string YYYY-MM-DD has expired relative to today.
 */
export function isDateExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return false;
  const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
}

/**
 * Gets the active, non-expired lease for a given unit.
 */
export function getActiveLeaseForUnit(unit: Unit, leases: Lease[] = []): Lease | null {
  return leases.find(l => {
    const isMatchingUnit = l.unitId === unit.id || 
      (l.unitNumber === unit.unitNumber && (l.propertyId === unit.propertyId || l.propertyName === unit.propertyName));
    
    if (!isMatchingUnit) return false;
    
    // Check if lease status is active/pending and date has not expired
    const isActiveStatus = l.status === 'Active' || l.status === 'Pending';
    const isNotExpired = !isDateExpired(l.endDate);

    return isActiveStatus && isNotExpired;
  }) || null;
}

/**
 * Computes dynamic occupancy status and active tenant for a unit based on live leases.
 */
export function getUnitOccupancyAndTenant(
  unit: Unit,
  leases: Lease[] = [],
  tenants: Tenant[] = []
): {
  occupancyStatus: 'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance';
  activeTenant: Tenant | null;
  activeLease: Lease | null;
  expiredLeases: Lease[];
} {
  // If explicitly under maintenance, preserve Maintenance status
  if (unit.occupancyStatus === 'Maintenance') {
    return {
      occupancyStatus: 'Maintenance',
      activeTenant: null,
      activeLease: null,
      expiredLeases: []
    };
  }

  const activeLease = getActiveLeaseForUnit(unit, leases);
  const unitLeases = leases.filter(l => 
    l.unitId === unit.id || 
    (l.unitNumber === unit.unitNumber && (l.propertyId === unit.propertyId || l.propertyName === unit.propertyName))
  );

  const expiredLeases = unitLeases.filter(l => l.status === 'Expired' || isDateExpired(l.endDate));

  if (activeLease) {
    let tenant = tenants.find(t => t.id === activeLease.tenantId) ||
      tenants.find(t => t.businessName.toLowerCase() === activeLease.businessName.toLowerCase()) ||
      null;

    if (!tenant && activeLease.businessName) {
      tenant = {
        id: activeLease.tenantId || `tenant-${activeLease.id}`,
        businessName: activeLease.businessName,
        contactPerson: 'Primary Contact',
        email: '',
        phone: '',
        businessType: 'Commercial Tenant',
        status: 'Active',
        createdAt: activeLease.createdAt,
        updatedAt: activeLease.updatedAt
      };
    }

    const status = activeLease.status === 'Pending' ? 'Reserved' : 'Occupied';

    return {
      occupancyStatus: status,
      activeTenant: tenant,
      activeLease,
      expiredLeases
    };
  }

  // If no active lease, unit is Vacant
  return {
    occupancyStatus: 'Vacant',
    activeTenant: null,
    activeLease: null,
    expiredLeases
  };
}

/**
 * Checks if a unit has an existing Active or Pending lease that overlaps with [startDate, endDate].
 */
export function checkLeaseOverlap(
  unitId: string,
  startDate: string,
  endDate: string,
  leases: Lease[] = [],
  excludeLeaseId?: string
): Lease | null {
  if (!unitId || !startDate || !endDate) return null;

  for (const lease of leases) {
    if (excludeLeaseId && lease.id === excludeLeaseId) continue;
    if (lease.status !== 'Active' && lease.status !== 'Pending') continue;
    if (isDateExpired(lease.endDate)) continue; // ignore expired leases

    if (lease.unitId === unitId) {
      // Lease A overlaps with Lease B if StartA <= EndB AND StartB <= EndA
      if (lease.startDate <= endDate && startDate <= lease.endDate) {
        return lease;
      }
    }
  }

  return null;
}

/**
 * Returns units eligible for lease assignment.
 * Filters out units that have an overlapping active lease for given [startDate, endDate].
 */
export function getAvailableUnits(
  units: Unit[] = [],
  leases: Lease[] = [],
  startDate?: string,
  endDate?: string,
  excludeLeaseId?: string
): Unit[] {
  return units.filter(u => {
    if (u.occupancyStatus === 'Maintenance') return false;

    if (startDate && endDate) {
      const overlap = checkLeaseOverlap(u.id, startDate, endDate, leases, excludeLeaseId);
      if (overlap) return false;
    } else {
      const activeLease = getActiveLeaseForUnit(u, leases);
      if (activeLease) return false;
    }

    return true;
  });
}

/**
 * Calculates default security deposit (2x monthly rent)
 */
export function calculateDefaultDeposit(monthlyRent: number): number {
  return monthlyRent * 2;
}
