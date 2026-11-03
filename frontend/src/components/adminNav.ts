import { can } from '../services/permissions';
import type { ScreenKey, User } from '../types';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: string; // name understood by Layout's <Icon>
  route: string;
  screen?: ScreenKey; // omitted = every portal user
  adminOnly?: boolean; // the backend allows the ADMIN role only
}

export interface AdminNavGroup {
  id: string;
  label: string; // '' = render items without a group header
  items: AdminNavItem[];
}

/** The admin portal side menu — the single source for AdminShell and the post-login landing page. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'overview', route: '/admin/overview', screen: 'dashboard' },
      { id: 'users', label: 'Employee Management', icon: 'users', route: '/admin/users', screen: 'user_management.user' },
      { id: 'map', label: 'Live Employee Tracking', icon: 'map', route: '/admin/map', screen: 'dashboard' },
      { id: 'attendance', label: 'Attendance Management', icon: 'attendance', route: '/admin/attendance', screen: 'attendance.sessions' },
      { id: 'visits', label: 'Field Visits', icon: 'visits', route: '/admin/visits', screen: 'attendance.visits' },
      { id: 'leaves', label: 'Leave Requests', icon: 'leaves', route: '/admin/leaves', screen: 'attendance.leaves' },
      { id: 'reports', label: 'Reports & Analytics', icon: 'reports', route: '/admin/reports', screen: 'reports' },
    ],
  },
  {
    id: 'settings',
    label: 'Admin Settings',
    items: [
      { id: 'profile', label: 'Admin Profile', icon: 'user', route: '/admin/profile' },
      { id: 'password', label: 'Change Password', icon: 'key', route: '/admin/change-password' },
      { id: 'departments', label: 'Department Management', icon: 'building', route: '/admin/departments', adminOnly: true },
      { id: 'security', label: 'Session & Security', icon: 'shield', route: '/admin/security', adminOnly: true },
    ],
  },
];

/** Groups with only the items `user` may view (empty groups dropped). */
export const visibleNav = (user: User | null) =>
  ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => (i.adminOnly ? user?.role === 'ADMIN' : !i.screen || can(user, i.screen))) })).filter((g) => g.items.length > 0);

/** Where `/admin` lands: the first permission-gated page the user can view, or null if their role grants nothing. */
export const firstAdminRoute = (user: User | null) =>
  ADMIN_NAV.flatMap((g) => g.items).find((i) => i.screen && can(user, i.screen))?.route ?? null;
