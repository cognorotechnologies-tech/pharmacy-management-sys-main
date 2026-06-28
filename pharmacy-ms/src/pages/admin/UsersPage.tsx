import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import type { UserRole } from '@/types/database';
import {
    Users,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Pencil,
    UserX,
    UserCheck,
    Loader2,
    Clock,
    Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Types ────────────────────────────────────────────────── */

interface UserRow {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
    branch_id: string | null;
    avatar_url: string | null;
    is_active: boolean;
    last_login: string | null;
    last_sign_in_at: string | null;
    invite_pending: boolean;
    created_at: string;
}

interface Branch {
    id: string;
    name: string;
}

/* ─── Constants ────────────────────────────────────────────── */

const ROLE_BADGE_MAP: Record<UserRole, { label: string; variant: 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'emerald' | 'sky' | 'orange' | 'purple' }> = {
    super_admin: { label: 'Super Admin', variant: 'red' },
    admin: { label: 'Admin', variant: 'blue' },
    pharmacist: { label: 'Pharmacist', variant: 'emerald' },
    inventory_staff: { label: 'Inventory', variant: 'orange' },
    cashier: { label: 'Cashier', variant: 'sky' },
};

const ROLE_HIERARCHY: Record<string, number> = {
    super_admin: 5,
    admin: 4,
    pharmacist: 3,
    inventory_staff: 2,
    cashier: 1,
};

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'pharmacist', 'inventory_staff', 'cashier'];
const PER_PAGE = 20;

/* ─── Helpers ──────────────────────────────────────────────── */

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCreatableRoles(currentRole: UserRole): UserRole[] {
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    return ALL_ROLES.filter((r) => ROLE_HIERARCHY[r] < currentLevel);
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function UsersPage() {
    const { role: myRole } = useAuth();

    /* State */
    const [users, setUsers] = useState<UserRow[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    /* Modals */
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<UserRow | null>(null);

    const isSuperAdmin = myRole === 'super_admin';

    /* ─── Fetch users ────────────────────────────────────────── */

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'list',
                    page,
                    perPage: PER_PAGE,
                    search: search || undefined,
                    roleFilter,
                    statusFilter,
                },
            });
            if (error) throw error;
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 0);
        } catch (err) {
            toast.error('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    /* Fetch branches (for super_admin selectors) */
    useEffect(() => {
        if (!isSuperAdmin) return;
        supabase.from('branches').select('id, name').eq('is_active', true).then(({ data }) => {
            setBranches(data || []);
        });
    }, [isSuperAdmin]);

    /* ─── Debounced search ───────────────────────────────────── */

    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    /* ─── Toggle active status ───────────────────────────────── */

    const toggleActive = async (user: UserRow) => {
        const newStatus = !user.is_active;
        const action = newStatus ? 'activate' : 'deactivate';

        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'update', user_id: user.id, is_active: newStatus },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`User ${action}d successfully`);
            fetchUsers();
        } catch (err) {
            toast.error((err as Error).message || `Failed to ${action} user`);
        }
        setActionMenuId(null);
    };

    /* ─── Create user ────────────────────────────────────────── */

    const handleCreate = async (form: CreateFormData) => {
        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'create', ...form },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success('User created successfully');
            setShowCreate(false);
            fetchUsers();
        } catch (err) {
            toast.error((err as Error).message || 'Failed to create user');
        }
    };

    /* ─── Update user ────────────────────────────────────────── */

    const handleUpdate = async (form: EditFormData) => {
        if (!editUser) return;
        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'update', user_id: editUser.id, ...form },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success('User updated successfully');
            setEditUser(null);
            fetchUsers();
        } catch (err) {
            toast.error((err as Error).message || 'Failed to update user');
        }
    };

    /* ─── Render ─────────────────────────────────────────────── */

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            User Management
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage staff accounts, roles, and permissions
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </button>
                </div>

                {/* Filters bar */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search by name or email…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Role filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Roles</option>
                            {ALL_ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_BADGE_MAP[r].label}</option>
                            ))}
                        </select>

                        {/* Status filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                                    {isSuperAdmin && (
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Login</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
                                            <p className="mt-2 text-sm text-slate-500">Loading users…</p>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center">
                                            <Users className="mx-auto h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-sm text-slate-500">No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => {
                                        const canManage =
                                            myRole !== null &&
                                            ROLE_HIERARCHY[myRole] > ROLE_HIERARCHY[user.role];
                                        const roleBadge = ROLE_BADGE_MAP[user.role];

                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                {/* User cell */}
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                                                            {getInitials(user.full_name)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                                                            <p className="text-xs text-slate-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                                                    {user.invite_pending && (
                                                        <Badge variant="amber" dot>
                                                            <Mail className="h-3 w-3" /> Invite pending
                                                        </Badge>
                                                    )}
                                                </td>

                                                {/* Branch (super_admin only) */}
                                                {isSuperAdmin && (
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                        {branches.find((b) => b.id === user.branch_id)?.name || '—'}
                                                    </td>
                                                )}

                                                {/* Status */}
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <Badge
                                                        variant={user.is_active ? 'green' : 'red'}
                                                        dot
                                                    >
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>

                                                {/* Last Login */}
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {formatDate(user.last_sign_in_at)}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                                    {canManage && (
                                                        <div className="relative inline-block">
                                                            <button
                                                                onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                aria-label="Actions"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>

                                                            {actionMenuId === user.id && (
                                                                <>
                                                                    <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                                                                    <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                                                        <button
                                                                            onClick={() => { setEditUser(user); setActionMenuId(null); }}
                                                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" /> Edit User
                                                                        </button>
                                                                        <button
                                                                            onClick={() => toggleActive(user)}
                                                                            className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${user.is_active
                                                                                ? 'text-red-600 hover:bg-red-50'
                                                                                : 'text-green-600 hover:bg-green-50'
                                                                                }`}
                                                                        >
                                                                            {user.is_active ? (
                                                                                <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                                                                            ) : (
                                                                                <><UserCheck className="h-3.5 w-3.5" /> Activate</>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        perPage={PER_PAGE}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            {/* ── Create User Modal ────────────────────────────────── */}
            <CreateUserModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onSubmit={handleCreate}
                myRole={myRole!}
                branches={branches}
                isSuperAdmin={isSuperAdmin}
            />

            {/* ── Edit User Modal ──────────────────────────────────── */}
            {editUser && (
                <EditUserModal
                    open={!!editUser}
                    onClose={() => setEditUser(null)}
                    onSubmit={handleUpdate}
                    user={editUser}
                    myRole={myRole!}
                    branches={branches}
                    isSuperAdmin={isSuperAdmin}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CREATE USER MODAL
   ═══════════════════════════════════════════════════════════════ */

interface CreateFormData {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    branch_id?: string;
    phone?: string;
}

interface CreateModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateFormData) => Promise<void>;
    myRole: UserRole;
    branches: Branch[];
    isSuperAdmin: boolean;
}

function CreateUserModal({ open, onClose, onSubmit, myRole, branches, isSuperAdmin }: CreateModalProps) {
    const creatableRoles = getCreatableRoles(myRole);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<CreateFormData>({
        email: '',
        password: '',
        full_name: '',
        role: creatableRoles[0] || 'cashier',
        branch_id: '',
        phone: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.password || !form.full_name) {
            toast.error('Please fill all required fields');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setSubmitting(true);
        await onSubmit({
            ...form,
            branch_id: isSuperAdmin ? form.branch_id : undefined,
        });
        setSubmitting(false);
    };

    return (
        <Modal open={open} onClose={onClose} title="Create New User">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name *</label>
                    <input
                        type="text" required
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="John Doe"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Email *</label>
                    <input
                        type="email" required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="user@pharmacy.com"
                    />
                </div>

                {/* Temp Password */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Temporary Password *</label>
                    <input
                        type="text" required minLength={6}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Min 6 characters"
                    />
                    <p className="mt-1 text-xs text-slate-500">User should change this on first login</p>
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="+90 5XX XXX XXXX"
                    />
                </div>

                {/* Role */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Role *</label>
                    <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {creatableRoles.map((r) => (
                            <option key={r} value={r}>{ROLE_BADGE_MAP[r].label}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">You can only assign roles below your level</p>
                </div>

                {/* Branch (super_admin only) */}
                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Branch</label>
                        <select
                            value={form.branch_id}
                            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Select branch…</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create User
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════
   EDIT USER MODAL
   ═══════════════════════════════════════════════════════════════ */

interface EditFormData {
    full_name?: string;
    phone?: string;
    role?: UserRole;
    branch_id?: string;
    is_active?: boolean;
}

interface EditModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: EditFormData) => Promise<void>;
    user: UserRow;
    myRole: UserRole;
    branches: Branch[];
    isSuperAdmin: boolean;
}

function EditUserModal({ open, onClose, onSubmit, user, myRole, branches, isSuperAdmin }: EditModalProps) {
    const creatableRoles = getCreatableRoles(myRole);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<EditFormData>({
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role,
        branch_id: user.branch_id || '',
        is_active: user.is_active,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit({
            full_name: form.full_name,
            phone: form.phone,
            role: form.role,
            branch_id: isSuperAdmin ? form.branch_id : undefined,
            is_active: form.is_active,
        });
        setSubmitting(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={`Edit: ${user.full_name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input
                        type="text" required
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Role */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Role</label>
                    <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {creatableRoles.map((r) => (
                            <option key={r} value={r}>{ROLE_BADGE_MAP[r].label}</option>
                        ))}
                    </select>
                </div>

                {/* Branch (super_admin only) */}
                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Branch</label>
                        <select
                            value={form.branch_id}
                            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">No branch</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Active status */}
                <div className="flex items-center gap-3">
                    <label className="relative inline-flex cursor-pointer items-center">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            className="peer sr-only"
                        />
                        <div className="h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5" />
                    </label>
                    <span className="text-sm text-slate-700">
                        {form.is_active ? 'Active' : 'Inactive'}
                        {!form.is_active && (
                            <span className="ml-1 text-xs text-red-500">(sessions will be revoked)</span>
                        )}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </Modal>
    );
}
