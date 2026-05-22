import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, ChevronLeft, Search,
  Shield, CheckCircle2, Loader2, AlertCircle,
  Mail, User, Building2, Lock,
} from 'lucide-react';
import {
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  toggleTeamMemberActive,
  type TeamMember,
} from '../services/supabase';
import {
  ROLE_LABELS,
  ROLE_GROUP_LABELS,
  assignableRoles,
  getRoleGroup,
  type AppRole,
  type RoleGroup,
} from '../types/roles';
import { useAuth } from '../context/AuthContext';
import { Eye, RotateCcw } from 'lucide-react';
import { SearchableDropdown } from './ui/SearchableDropdown';

const ROLE_GROUP_OPTIONS = [
  { value: 'acce', label: 'ACCE' },
  { value: 'school', label: 'School' },
  { value: 'de', label: 'Department of Education' },
] as const;

interface SchoolOption {
  id:   string;
  name: string;
}

interface TeamManagementProps {
  onBack:    () => void;
  schools?:  SchoolOption[];
}

const ROLE_GROUP_COLORS: Record<RoleGroup, string> = {
  acce:   'bg-primary/10 text-primary border-primary/20',
  school: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  de:     'bg-violet-50 text-violet-700 border-violet-200',
};

const ROLE_GROUP_DOT: Record<RoleGroup, string> = {
  acce:   'bg-primary',
  school: 'bg-emerald-500',
  de:     'bg-violet-500',
};

// ── Per-role UI config ────────────────────────────────────────────────────────

interface RoleConfig {
  title:          string;
  subtitle:       string;
  showGroupChips: boolean;
  showGroupCol:   boolean;
  showSchoolCol:  boolean;
}

function getRoleConfig(role: AppRole): RoleConfig {
  switch (role) {
    case 'acce_admin':
      return {
        title:          'Team Management',
        subtitle:       'Manage all ACCE, School, and DE users across the platform.',
        showGroupChips: true,
        showGroupCol:   true,
        showSchoolCol:  true,
      };
    case 'school_admin':
      return {
        title:          'My School Team',
        subtitle:       'Manage staff accounts for your school.',
        showGroupChips: false,
        showGroupCol:   false,
        showSchoolCol:  false,
      };
    case 'de_admin':
      return {
        title:          'DE Team',
        subtitle:       'Manage Department of Education user accounts.',
        showGroupChips: false,
        showGroupCol:   false,
        showSchoolCol:  false,
      };
    default:
      return {
        title:          'Team',
        subtitle:       '',
        showGroupChips: false,
        showGroupCol:   false,
        showSchoolCol:  false,
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TeamManagement({ onBack, schools = [] }: TeamManagementProps) {
  const { userRole, actualRole, schoolId: mySchoolId, isImpersonating, setImpersonation, clearImpersonation } = useAuth();
  const myAssignableRoles = userRole ? assignableRoles(userRole) : [];
  const cfg = userRole ? getRoleConfig(userRole) : getRoleConfig('acce_admin');

  // Derive the initial type group for the current admin
  const defaultInviteType: RoleGroup =
    userRole === 'school_admin' ? 'school' :
    userRole === 'de_admin'     ? 'de'     : 'acce';

  const [members,       setMembers]       = useState<TeamMember[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [filterGroup,   setFilterGroup]   = useState<string>('all');
  const [filterActive,  setFilterActive]  = useState<string>('active');

  // Add user modal
  const [showInvite,     setShowInvite]     = useState(false);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteName,     setInviteName]     = useState('');
  const [inviteType,     setInviteType]     = useState<RoleGroup>(defaultInviteType);
  const [inviteRole,     setInviteRole]     = useState<AppRole>(myAssignableRoles[0] ?? 'acce_staff');
  const [inviteSchoolId, setInviteSchoolId] = useState(mySchoolId ?? '');
  const [inviteLoading,  setInviteLoading]  = useState(false);
  const [inviteError,    setInviteError]    = useState<string | null>(null);

  // Inline role editor
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole>('acce_staff');
  const [editLoading, setEditLoading] = useState(false);

  // Preview-as-role picker (acce_admin only, UI-only, no DB changes)
  const [previewPickType,     setPreviewPickType]     = useState<RoleGroup>('acce');
  const [previewPickRole,     setPreviewPickRole]     = useState<AppRole>('acce_staff');
  const [previewPickSchoolId, setPreviewPickSchoolId] = useState<string>('');

  function handlePreviewTypeChange(type: RoleGroup) {
    setPreviewPickType(type);
    const first = (['acce_admin','acce_staff','school_admin','school_staff','de_admin','de_staff'] as AppRole[])
      .find(r => getRoleGroup(r) === type);
    if (first) setPreviewPickRole(first);
    setPreviewPickSchoolId('');
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await listTeamMembers());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Scope filter — narrows data to what this admin is allowed to see ─────

  const scoped = members.filter(m => {
    if (userRole === 'school_admin') {
      return getRoleGroup(m.role) === 'school' && m.school_id === mySchoolId;
    }
    if (userRole === 'de_admin') {
      return getRoleGroup(m.role) === 'de';
    }
    return true; // acce_admin sees all
  });

  // ── UI filters (search, group chip, active toggle) ───────────────────────

  const filtered = scoped.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (m.display_name ?? '').toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      ROLE_LABELS[m.role].toLowerCase().includes(q);
    const matchesGroup = filterGroup === 'all' || getRoleGroup(m.role) === filterGroup;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active'   && m.is_active) ||
      (filterActive === 'inactive' && !m.is_active);
    return matchesSearch && matchesGroup && matchesActive;
  });

  const totalActive = scoped.filter(m => m.is_active).length;

  // ── Roles filtered by the currently selected invite type ────────────────
  const typeFilteredRoles = myAssignableRoles.filter(r => getRoleGroup(r) === inviteType);

  // ── Add user ─────────────────────────────────────────────────────────────

  function openInvite() {
    const startType: RoleGroup = defaultInviteType;
    const startRole = myAssignableRoles.find(r => getRoleGroup(r) === startType) ?? myAssignableRoles[0] ?? 'acce_staff';
    setInviteEmail('');
    setInviteName('');
    setInviteType(startType);
    setInviteRole(startRole);
    // school_admin: pre-fill + lock school_id to their own school
    setInviteSchoolId(userRole === 'school_admin' ? (mySchoolId ?? '') : '');
    setInviteError(null);
    setShowInvite(true);
  }

  // When type changes: reset role to first valid for that type and clear school
  function handleInviteTypeChange(type: RoleGroup) {
    setInviteType(type);
    const firstRole = myAssignableRoles.find(r => getRoleGroup(r) === type);
    if (firstRole) setInviteRole(firstRole);
    setInviteSchoolId('');
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    try {
      const needsSchool = getRoleGroup(inviteRole) === 'school';
      await addTeamMember(
        inviteEmail.trim(),
        inviteRole,
        inviteName.trim() || undefined,
        needsSchool && inviteSchoolId.trim() ? inviteSchoolId.trim() : undefined,
      );
      setShowInvite(false);
      await load();
    } catch (e: any) {
      setInviteError(e.message ?? 'Failed to add user.');
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Role update ──────────────────────────────────────────────────────────

  async function handleRoleUpdate(id: string) {
    setEditLoading(true);
    try {
      await updateTeamMemberRole(id, editingRole);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Failed to update role.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await toggleTeamMemberActive(id, !current);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Failed to update status.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showSchoolIdFieldInModal  = userRole === 'acce_admin' && inviteType === 'school';
  const showSchoolIdLockedInModal = userRole === 'school_admin';

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors font-medium group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <span className="text-sm font-bold text-slate-900">{cfg.title}</span>
              {cfg.subtitle && (
                <span className="ml-2 text-xs text-slate-400">{cfg.subtitle}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">
            {totalActive} active {totalActive === 1 ? 'user' : 'users'}
          </span>
          {myAssignableRoles.length > 0 && (
            <button
              onClick={openInvite}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add user
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-600 font-semibold hover:text-red-800">Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">

        {/* Preview As Role — acce_admin only */}
        {actualRole === 'acce_admin' && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">Preview as role</span>
              <span className="text-xs text-amber-600 font-medium">— UI only, no data or permissions change</span>
            </div>

            {isImpersonating ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-amber-800 font-semibold">
                  Currently previewing as: <span className="text-amber-900">{ROLE_LABELS[userRole!]}</span>
                </span>
                <button
                  onClick={clearImpersonation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 text-amber-900 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore my access
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                {/* Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Type</label>
                  <SearchableDropdown
                    value={previewPickType}
                    onChange={v => handlePreviewTypeChange(v as RoleGroup)}
                    options={[...ROLE_GROUP_OPTIONS]}
                    placeholder="Type"
                    allValue="__none__"
                    searchPlaceholder="Search types…"
                    panelWidthClass="w-56"
                    triggerClassName="min-w-[10rem]"
                  />
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Role</label>
                  <SearchableDropdown
                    value={previewPickRole}
                    onChange={v => setPreviewPickRole(v as AppRole)}
                    options={(['acce_admin', 'acce_staff', 'school_admin', 'school_staff', 'de_admin', 'de_staff'] as AppRole[])
                      .filter(r => getRoleGroup(r) === previewPickType)
                      .map(r => ({ value: r, label: ROLE_LABELS[r] }))}
                    placeholder="Role"
                    allValue="__none__"
                    searchPlaceholder="Search roles…"
                    panelWidthClass="w-56"
                    triggerClassName="min-w-[10rem]"
                  />
                </div>

                {/* School — only when type is school */}
                {previewPickType === 'school' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">School</label>
                    <div className="relative">
                      {schools.length > 0 ? (
                        <SearchableDropdown
                          value={previewPickSchoolId}
                          onChange={setPreviewPickSchoolId}
                          options={schools.map(s => ({ value: s.id, label: s.name }))}
                          placeholder="Select a school…"
                          allValue=""
                          searchPlaceholder="Search schools…"
                          panelWidthClass="w-64"
                          triggerClassName="min-w-[200px]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={previewPickSchoolId}
                          onChange={e => setPreviewPickSchoolId(e.target.value)}
                          placeholder="School ID"
                          className="pl-3 pr-4 py-2 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-48 font-mono"
                        />
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setImpersonation(previewPickRole, previewPickType === 'school' ? (previewPickSchoolId || null) : null)}
                  disabled={previewPickType === 'school' && !previewPickSchoolId}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          {/* Group chips — acce_admin only */}
          {cfg.showGroupChips && (
            <>
              <FilterChip label="All groups" value="all"    current={filterGroup} onChange={setFilterGroup} />
              <FilterChip label="ACCE"       value="acce"   current={filterGroup} onChange={setFilterGroup} />
              <FilterChip label="School"     value="school" current={filterGroup} onChange={setFilterGroup} />
              <FilterChip label="DE"         value="de"     current={filterGroup} onChange={setFilterGroup} />
            </>
          )}

          {/* Active status chips — always shown */}
          <div className="ml-auto flex gap-2">
            <FilterChip label="Active"   value="active"   current={filterActive} onChange={setFilterActive} />
            <FilterChip label="Inactive" value="inactive" current={filterActive} onChange={setFilterActive} />
            <FilterChip label="All"      value="all"      current={filterActive} onChange={setFilterActive} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  {cfg.showGroupCol  && <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>}
                  {cfg.showSchoolCol && <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">School ID</th>}
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Added</th>
                  {myAssignableRoles.length > 0 && (
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(member => {
                  const group     = getRoleGroup(member.role);
                  const isEditing = editingId === member.id;
                  return (
                    <tr key={member.id} className={`hover:bg-slate-50/50 transition-colors ${!member.is_active ? 'opacity-50' : ''}`}>

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${ROLE_GROUP_DOT[group]}`}>
                            {(member.display_name ?? member.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{member.display_name ?? '—'}</p>
                            <p className="text-xs text-slate-400 truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role — inline editor for admins */}
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <SearchableDropdown
                              value={editingRole}
                              onChange={v => setEditingRole(v as AppRole)}
                              options={myAssignableRoles.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
                              placeholder="Role"
                              allValue="__none__"
                              searchPlaceholder="Search roles…"
                              panelWidthClass="w-56"
                              triggerClassName="min-w-[9rem]"
                            />
                            <button
                              onClick={() => void handleRoleUpdate(member.id)}
                              disabled={editLoading}
                              className="px-2 py-1 text-xs bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                              {editLoading ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${ROLE_GROUP_COLORS[group]}`}>
                            {ROLE_LABELS[member.role]}
                          </span>
                        )}
                      </td>

                      {/* Group — acce_admin only */}
                      {cfg.showGroupCol && (
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {ROLE_GROUP_LABELS[group]}
                        </td>
                      )}

                      {/* School ID — acce_admin only */}
                      {cfg.showSchoolCol && (
                        <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                          {member.school_id ?? <span className="text-slate-300">—</span>}
                        </td>
                      )}

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {member.user_id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <Shield className="w-3.5 h-3.5" />
                            Pending login
                          </span>
                        )}
                      </td>

                      {/* Added date */}
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(member.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      {myAssignableRoles.length > 0 && (
                        <td className="px-5 py-3.5">
                          {!isEditing && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditingId(member.id); setEditingRole(member.role); }}
                                className="text-xs text-slate-500 hover:text-primary font-medium transition-colors"
                              >
                                Edit role
                              </button>
                              <span className="text-slate-200">|</span>
                              <button
                                onClick={() => void handleToggleActive(member.id, member.is_active)}
                                className={`text-xs font-medium transition-colors ${member.is_active ? 'text-red-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-700'}`}
                              >
                                {member.is_active ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add user modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => { setShowInvite(false); setInviteError(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-5">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-slate-900">Add team member</h2>
                </div>

                {inviteError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{inviteError}</p>
                  </div>
                )}

                <form onSubmit={handleInvite} className="space-y-4">
                  {/* Email */}
                  <FormField label="Email address" required>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="user@organisation.edu.au"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                        required
                      />
                    </div>
                  </FormField>

                  {/* Display name */}
                  <FormField label="Display name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="Jane Smith (optional)"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      />
                    </div>
                  </FormField>

                  {/* Type — shown only for acce_admin; scoped admins have a fixed type */}
                  {userRole === 'acce_admin' && (
                    <FormField label="Type" required>
                      <SearchableDropdown
                        className="w-full"
                        triggerClassName="w-full"
                        panelWidthClass="w-full"
                        value={inviteType}
                        onChange={v => handleInviteTypeChange(v as RoleGroup)}
                        options={[...ROLE_GROUP_OPTIONS]}
                        placeholder="Type"
                        allValue="__none__"
                        searchPlaceholder="Search types…"
                      />
                    </FormField>
                  )}

                  {/* Role — filtered by selected type */}
                  <FormField label="Role" required>
                    <SearchableDropdown
                      className="w-full"
                      triggerClassName="w-full"
                      panelWidthClass="w-full"
                      value={inviteRole}
                      onChange={v => setInviteRole(v as AppRole)}
                      options={(userRole === 'acce_admin' ? typeFilteredRoles : myAssignableRoles).map(r => ({
                        value: r,
                        label: ROLE_LABELS[r],
                      }))}
                      placeholder="Role"
                      allValue="__none__"
                      searchPlaceholder="Search roles…"
                    />
                  </FormField>

                  {/* School — dropdown for acce_admin assigning school roles */}
                  {showSchoolIdFieldInModal && (
                    <FormField label="School" required>
                      {schools.length > 0 ? (
                        <SearchableDropdown
                          className="w-full"
                          triggerClassName="w-full"
                          panelWidthClass="w-full"
                          value={inviteSchoolId}
                          onChange={setInviteSchoolId}
                          options={schools.map(s => ({ value: s.id, label: s.name }))}
                          placeholder="Select a school…"
                          allValue=""
                          searchPlaceholder="Search schools…"
                        />
                      ) : (
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={inviteSchoolId}
                            onChange={e => setInviteSchoolId(e.target.value)}
                            placeholder="School ID (GUID)"
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                            required
                          />
                        </div>
                      )}
                    </FormField>
                  )}

                  {/* School locked — school_admin can only add within their own school */}
                  {showSchoolIdLockedInModal && (
                    <FormField label="School">
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                        <input
                          type="text"
                          value={
                            schools.find(s => s.id === mySchoolId)?.name ?? mySchoolId ?? ''
                          }
                          readOnly
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Locked to your school — users you add will be scoped to this school.</p>
                    </FormField>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowInvite(false); setInviteError(null); }}
                      className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add user'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function FilterChip({ label, value, current, onChange }: {
  label: string; value: string; current: string; onChange: (v: string) => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
