import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, ChevronLeft, Search, MoreVertical,
  Shield, CheckCircle2, XCircle, Loader2, AlertCircle,
  Mail, User, Building2, ChevronDown,
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
} from '../types/roles';
import { useAuth } from '../context/AuthContext';

interface TeamManagementProps {
  onBack: () => void;
}

const ROLE_GROUP_COLORS: Record<string, string> = {
  acce:   'bg-primary/10 text-primary border-primary/20',
  school: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  de:     'bg-violet-50 text-violet-700 border-violet-200',
};

const ROLE_GROUP_DOT: Record<string, string> = {
  acce:   'bg-primary',
  school: 'bg-emerald-500',
  de:     'bg-violet-500',
};

export function TeamManagement({ onBack }: TeamManagementProps) {
  const { userRole } = useAuth();
  const myAssignableRoles = userRole ? assignableRoles(userRole) : [];

  const [members, setMembers]         = useState<TeamMember[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('active');

  // Invite modal state
  const [showInvite,     setShowInvite]     = useState(false);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteName,     setInviteName]     = useState('');
  const [inviteRole,     setInviteRole]     = useState<AppRole>(myAssignableRoles[0] ?? 'acce_staff');
  const [inviteSchoolId, setInviteSchoolId] = useState('');
  const [inviteLoading,  setInviteLoading]  = useState(false);
  const [inviteError,    setInviteError]    = useState<string | null>(null);

  // Inline role editor
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole>('acce_staff');
  const [editLoading, setEditLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTeamMembers();
      setMembers(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Filters ──────────────────────────────────────────────────────────────

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (m.display_name ?? '').toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      ROLE_LABELS[m.role].toLowerCase().includes(q);
    const group = getRoleGroup(m.role);
    const matchesGroup = filterGroup === 'all' || group === filterGroup;
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && m.is_active) ||
      (filterActive === 'inactive' && !m.is_active);
    return matchesSearch && matchesGroup && matchesActive;
  });

  const totalActive = members.filter(m => m.is_active).length;

  // ── Invite ────────────────────────────────────────────────────────────────

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
      setInviteEmail('');
      setInviteName('');
      setInviteSchoolId('');
      await load();
    } catch (e: any) {
      setInviteError(e.message ?? 'Failed to add user.');
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Role update ───────────────────────────────────────────────────────────

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

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await toggleTeamMemberActive(id, !current);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Failed to update status.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
            <span className="text-sm font-bold text-slate-900">Team Management</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">
            {totalActive} active {totalActive === 1 ? 'user' : 'users'}
          </span>
          {myAssignableRoles.length > 0 && (
            <button
              onClick={() => setShowInvite(true)}
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
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
          <FilterChip label="All groups" value="all" current={filterGroup} onChange={setFilterGroup} />
          <FilterChip label="ACCE" value="acce" current={filterGroup} onChange={setFilterGroup} />
          <FilterChip label="School" value="school" current={filterGroup} onChange={setFilterGroup} />
          <FilterChip label="DE" value="de" current={filterGroup} onChange={setFilterGroup} />
          <div className="ml-auto flex gap-2">
            <FilterChip label="Active" value="active" current={filterActive} onChange={setFilterActive} />
            <FilterChip label="Inactive" value="inactive" current={filterActive} onChange={setFilterActive} />
            <FilterChip label="All" value="all" current={filterActive} onChange={setFilterActive} />
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
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">School ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  {myAssignableRoles.length > 0 && (
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(member => {
                  const group = getRoleGroup(member.role);
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
                      {/* Role */}
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <select
                                value={editingRole}
                                onChange={e => setEditingRole(e.target.value as AppRole)}
                                className="pl-2 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none"
                              >
                                {myAssignableRoles.map(r => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
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
                      {/* Group */}
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {ROLE_GROUP_LABELS[group]}
                      </td>
                      {/* School ID */}
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {member.school_id ?? <span className="text-slate-300">—</span>}
                      </td>
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
                      {/* Joined */}
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
                  <FormField label="Role" required>
                    <div className="relative">
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as AppRole)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none bg-white"
                        required
                      >
                        {myAssignableRoles.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]} — {ROLE_GROUP_LABELS[getRoleGroup(r)]}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                  {getRoleGroup(inviteRole) === 'school' && (
                    <FormField label="School ID" required>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={inviteSchoolId}
                          onChange={e => setInviteSchoolId(e.target.value)}
                          placeholder="Dataverse school GUID"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                          required
                        />
                      </div>
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
