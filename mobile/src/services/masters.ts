// The Setup masters of the admin portal. Every master uses the same list + form screen: the form fields come from the
// backend itself (an OPTIONS request lists each field, whether it is required, and its choices).
export interface MasterDef {
  kind: string;
  title: string;
  endpoint: string;
  screen: string; // portal screen permission, same keys as the web portal
}

export const MASTERS: MasterDef[] = [
  { kind: 'zones', title: 'Zone / District', endpoint: '/admin/masters/zones/', screen: 'setup.zone_district' },
  { kind: 'talukas', title: 'Taluka / Village', endpoint: '/admin/masters/talukas/', screen: 'setup.taluka_village' },
  { kind: 'agencies', title: 'Agency', endpoint: '/admin/masters/agencies/', screen: 'setup.agency' },
  { kind: 'offices', title: 'Office', endpoint: '/admin/masters/offices/', screen: 'setup.office' },
  { kind: 'designations', title: 'Designation', endpoint: '/admin/masters/designations/', screen: 'setup.designation' },
  { kind: 'wtp-sites', title: 'WTP Inspection', endpoint: '/admin/masters/wtp-sites/', screen: 'setup.wtp_inspection' },
  { kind: 'employees', title: 'Employee', endpoint: '/admin/employees/', screen: 'setup.employee' },
];

// Which list in /admin/options/ fills a relation field of the same name.
export const RELATION_OPTIONS: Record<string, string> = {
  company: 'companies',
  companies: 'companies',
  zone: 'zones',
  district: 'districts',
  taluka: 'talukas',
  village: 'villages',
  agency: 'agencies',
  office: 'offices',
  reporting_office: 'offices',
  designation: 'designations',
  wtp_sites: 'wtp_sites',
  access_role: 'access_roles',
  employee: 'employees',
};

// Relation fields that hold several values.
export const MULTI_FIELDS = new Set(['companies', 'wtp_sites']);
