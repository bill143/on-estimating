import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Send,
  Shield,
  KeyRound,
  X,
  Clock,
  ChevronDown,
  UserPlus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settingsStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { UserRole, Permission, User } from '@/types/settings';

// ── Constants ──────────────────────────────

const ROLES: UserRole[] = [
  'super_admin',
  'org_admin',
  'estimator',
  'project_manager',
  'subcontractor',
  'viewer',
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  estimator: 'Estimator',
  project_manager: 'Project Manager',
  subcontractor: 'Subcontractor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-orange-100 text-orange-700 border-orange-200',
  org_admin: 'bg-blue-100 text-blue-700 border-blue-200',
  estimator: 'bg-green-100 text-green-700 border-green-200',
  project_manager: 'bg-purple-100 text-purple-700 border-purple-200',
  subcontractor: 'bg-amber-100 text-amber-700 border-amber-200',
  viewer: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-yellow-100 text-yellow-700',
  disabled: 'bg-zinc-100 text-zinc-500',
};

const PERMISSIONS: Permission[] = [
  'takeoff',
  'estimates',
  'bid-tracking',
  'plan-chat',
  'settings',
  'reports',
  'exports',
];

const PERMISSION_LABELS: Record<Permission, string> = {
  takeoff: 'Takeoff',
  estimates: 'Estimates',
  'bid-tracking': 'Bid Tracking',
  'plan-chat': 'Plan Chat',
  settings: 'Settings',
  reports: 'Reports',
  exports: 'Exports',
};

// ── Seed users ─────────────────────────────

const SEED_USERS: User[] = [
  {
    id: '1',
    name: 'Bill Asmar',
    email: 'bill@oneillconstruction.com',
    role: 'super_admin',
    lastActive: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'active',
    mfaEnabled: true,
  },
  {
    id: '2',
    name: 'Sarah Kim',
    email: 'sarah@oneillconstruction.com',
    role: 'estimator',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'active',
    mfaEnabled: true,
  },
  {
    id: '3',
    name: 'Marcus Thompson',
    email: 'marcus@oneillconstruction.com',
    role: 'project_manager',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: 'active',
    mfaEnabled: false,
  },
  {
    id: '4',
    name: 'James Rivera',
    email: 'james@subcontractor-hvac.com',
    role: 'viewer',
    lastActive: '',
    status: 'invited',
    mfaEnabled: false,
  },
];

// ── Helpers ────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return 'Never';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

// ── Section heading helper ─────────────────

function SectionHeading({ icon: Icon, title }: { icon: typeof Users; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-orange-500" />
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

// ── Component ──────────────────────────────

export default function UserManagement() {
  const users = useSettingsStore((s) => s.users);
  const setUsers = useSettingsStore((s) => s.setUsers);
  const addUser = useSettingsStore((s) => s.addUser);
  const updateUser = useSettingsStore((s) => s.updateUser);
  const rolePermissions = useSettingsStore((s) => s.rolePermissions);
  const setRolePermissions = useSettingsStore((s) => s.setRolePermissions);
  const sso = useSettingsStore((s) => s.sso);
  const setSSO = useSettingsStore((s) => s.setSSO);

  // Seed users if empty
  useEffect(() => {
    if (!isSupabaseConfigured() && users.length === 0) {
      setUsers(SEED_USERS);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Local UI state
  const [userSearch, setUserSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Add-user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('estimator');
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  // ── Handlers ───────────────────────

  const validateAndAddUser = () => {
    const errors: { name?: string; email?: string } = {};
    if (!newName.trim()) errors.name = 'Name is required';
    if (!newEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      errors.email = 'Invalid email address';
    } else if (users.some((u) => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      errors.email = 'Email already exists';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      lastActive: '',
      status: 'invited',
      mfaEnabled: false,
    };
    addUser(newUser);
    toast.success(`Invitation sent to ${newEmail.trim()}`);
    setNewName('');
    setNewEmail('');
    setNewRole('estimator');
    setFormErrors({});
    setShowAddModal(false);
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateUser(userId, { role });
    const user = users.find((u) => u.id === userId);
    toast.success(`${user?.name || 'User'} role updated to ${ROLE_LABELS[role]}`);
  };

  const handleRemoveUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers(users.filter((u) => u.id !== userId));
    toast.success(`${user?.name || 'User'} removed`);
    setConfirmRemoveId(null);
  };

  const togglePermission = (role: UserRole, perm: Permission) => {
    const updated = { ...rolePermissions };
    updated[role] = { ...updated[role], [perm]: !updated[role][perm] };
    setRolePermissions(updated);
    toast.success(
      `${PERMISSION_LABELS[perm]} ${!rolePermissions[role][perm] ? 'granted to' : 'revoked from'} ${ROLE_LABELS[role]}`,
    );
  };

  const handleSSOToggle = (provider: 'google' | 'microsoft', value: boolean) => {
    setSSO({ ...sso, [provider]: value });
    toast.success(`${provider === 'google' ? 'Google' : 'Microsoft'} SSO ${value ? 'enabled' : 'disabled'}`);
  };

  const handleSamlToggle = (value: boolean) => {
    setSSO({ ...sso, saml: { ...sso.saml, enabled: value } });
    toast.success(`SAML 2.0 ${value ? 'enabled' : 'disabled'}`);
  };

  // ── Render ─────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── 1. User List ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              <SectionHeading icon={Users} title="User List" />
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
              size="sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name, email, or role..."
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600">Name</th>
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600">Email</th>
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600">Role</th>
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600">Status</th>
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600">Last Active</th>
                  <th className="text-right py-2.5 font-medium text-zinc-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-zinc-600">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-zinc-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">{user.email}</td>
                    <td className="py-3 pr-4">
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="appearance-none rounded-full border px-2.5 py-0.5 text-xs font-medium pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
                          style={{
                            // Inherit the role color classes via inline approach
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="secondary"
                        className={`capitalize ${STATUS_COLORS[user.status] || ''}`}
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1 text-zinc-500 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {relativeTime(user.lastActive)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {confirmRemoveId === user.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveUser(user.id)}
                            className="text-xs"
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRemoveId(user.id)}
                          className="text-zinc-400 hover:text-red-500"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400 text-sm">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Add User Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md border border-zinc-200 bg-white shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <SectionHeading icon={UserPlus} title="Add User" />
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormErrors({});
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-name">Full Name</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="Jane Doe"
                  className={`mt-1 ${formErrors.name ? 'border-red-500' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="new-email">Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (formErrors.email) setFormErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="jane@company.com"
                  className={`mt-1 ${formErrors.email ? 'border-red-500' : ''}`}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="new-role">Role</Label>
                <div className="relative mt-1">
                  <select
                    id="new-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 py-2 pr-8 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={validateAndAddUser}
                  className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Send className="w-4 h-4" />
                  Add User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 3. Role Permission Matrix ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Shield} title="Role Permission Matrix" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2.5 pr-4 font-medium text-zinc-600 min-w-[160px]">
                    Permission
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      className="text-center py-2.5 px-2 font-medium text-zinc-600 min-w-[90px]"
                    >
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((perm) => (
                  <tr key={perm} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-700">
                      {PERMISSION_LABELS[perm]}
                    </td>
                    {ROLES.map((role) => (
                      <td key={role} className="py-3 text-center">
                        <input
                          type="checkbox"
                          checked={rolePermissions[role]?.[perm] ?? false}
                          onChange={() => togglePermission(role, perm)}
                          className="w-4 h-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. SSO Configuration ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={KeyRound} title="SSO Configuration" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google SSO */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-zinc-700">Google SSO</p>
                <p className="text-xs text-zinc-400">Allow users to sign in with Google Workspace</p>
              </div>
              <Switch
                checked={sso.google}
                onCheckedChange={(v) => handleSSOToggle('google', v)}
              />
            </div>

            {/* Microsoft SSO */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-zinc-700">Microsoft SSO</p>
                <p className="text-xs text-zinc-400">Allow users to sign in with Microsoft Entra ID</p>
              </div>
              <Switch
                checked={sso.microsoft}
                onCheckedChange={(v) => handleSSOToggle('microsoft', v)}
              />
            </div>

            {/* SAML */}
            <div className="py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-700">SAML 2.0</p>
                  <p className="text-xs text-zinc-400">Enterprise single sign-on via SAML identity provider</p>
                </div>
                <Switch
                  checked={sso.saml.enabled}
                  onCheckedChange={handleSamlToggle}
                />
              </div>

              {sso.saml.enabled && (
                <div className="mt-4 space-y-3 pl-1">
                  <div>
                    <Label htmlFor="saml-entry">Entry Point URL</Label>
                    <Input
                      id="saml-entry"
                      value={sso.saml.entryPoint || ''}
                      onChange={(e) => {
                        setSSO({
                          ...sso,
                          saml: { ...sso.saml, entryPoint: e.target.value },
                        });
                      }}
                      placeholder="https://idp.example.com/sso/saml"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="saml-cert">Certificate</Label>
                    <textarea
                      id="saml-cert"
                      value={sso.saml.cert || ''}
                      onChange={(e) => {
                        setSSO({
                          ...sso,
                          saml: { ...sso.saml, cert: e.target.value },
                        });
                      }}
                      placeholder="-----BEGIN CERTIFICATE-----"
                      rows={4}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    />
                  </div>
                  <Button
                    onClick={() => toast.success('SAML configuration saved')}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    size="sm"
                  >
                    Save SAML Config
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
