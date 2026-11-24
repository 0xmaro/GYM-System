import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
    Shield, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
    User, Clock, Monitor, Globe, ChevronDown, ChevronUp, Eye, X,
    AlertTriangle, CheckCircle, Info, Loader2, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────

const ACTION_TYPES = [
    { value: '', label: 'كل الإجراءات' },
    { value: 'attendance', label: 'الحضور' },
    { value: 'subscription', label: 'الاشتراكات' },
    { value: 'client', label: 'العملاء' },
    { value: 'discount_request', label: 'طلبات الخصم' },
    { value: 'shift', label: 'الشيفتات' },
    { value: 'transaction', label: 'المعاملات المالية' },
    { value: 'qr_card', label: 'كروت QR' },
    { value: 'class', label: 'الحصص' },
    { value: 'debt', label: 'الديون' },
    { value: 'setting', label: 'الإعدادات' },
];

const COLOR_MAP = {
    danger:  'bg-red-50 text-red-700 border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    primary: 'bg-teal-50 text-teal-700 border-teal-200',
    muted:   'bg-gray-100 text-gray-600 border-gray-200',
};

// ─── Sub-components ───────────────────────────────────────────

const StatPill = ({ icon: Icon, label, value, color = 'text-ink' }) => (
    <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
        <Icon size={16} className="text-muted shrink-0" />
        <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black tabular-nums leading-none mt-0.5 ${color}`}>{value}</p>
        </div>
    </div>
);

const DiffRow = ({ field, before, after }) => (
    <div className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
        <span className="font-bold text-muted truncate">{field}</span>
        <span className="font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded truncate">
            {before ?? <span className="italic opacity-50">فارغ</span>}
        </span>
        <span className="font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded truncate">
            {after ?? <span className="italic opacity-50">فارغ</span>}
        </span>
    </div>
);

const DetailModal = ({ log, onClose }) => {
    if (!log) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border bg-ink text-white">
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-primary" />
                        <div>
                            <h3 className="font-black text-sm">تفاصيل الحدث #{log.id}</h3>
                            <p className="text-[10px] text-white/50 font-bold mt-0.5">{log.time_formatted}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'الإجراء', value: log.action_label ?? log.action },
                            { label: 'النوع', value: log.entity_label ?? log.entity_type },
                            { label: 'رقم السجل', value: `#${log.entity_id}` },
                            { label: 'المستخدم', value: log.user?.name ?? 'النظام' },
                            { label: 'IP', value: log.ip_address ?? '—' },
                            { label: 'الجهاز', value: log.device_info ?? '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-mist/50 rounded-2xl p-3 border border-border/50">
                                <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">{label}</p>
                                <p className="text-sm font-bold text-ink truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Diff */}
                    {log.changes_diff?.length > 0 && (
                        <div className="bg-mist/30 rounded-2xl p-4 border border-border/50">
                            <h4 className="text-xs font-black text-ink mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-warning rounded-full" />
                                التغييرات ({log.changes_diff.length} حقل)
                            </h4>
                            <div className="grid grid-cols-[140px_1fr_1fr] gap-2 text-[10px] text-muted font-black uppercase tracking-wider pb-2 border-b border-border mb-1">
                                <span>الحقل</span>
                                <span className="text-red-500">قبل</span>
                                <span className="text-emerald-600">بعد</span>
                            </div>
                            {log.changes_diff.map((d, i) => (
                                <DiffRow key={i} {...d} />
                            ))}
                        </div>
                    )}

                    {/* Raw JSON toggle */}
                    {(log.old_values || log.new_values) && (
                        <details className="group">
                            <summary className="cursor-pointer text-xs font-bold text-muted hover:text-ink
                                transition-colors flex items-center gap-2 select-none">
                                <FileText size={12} />
                                عرض البيانات الخام (JSON)
                                <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {log.old_values && (
                                    <pre className="text-[10px] bg-red-50 text-red-800 rounded-xl p-3 overflow-auto max-h-40 font-mono">
                                        {JSON.stringify(
    typeof log.old_values === 'string'
        ? JSON.parse(log.old_values)
        : log.old_values,
    null, 2
)}
                                    </pre>
                                )}
                                {log.new_values && (
                                    <pre className="text-[10px] bg-emerald-50 text-emerald-800 rounded-xl p-3 overflow-auto max-h-40 font-mono">

{JSON.stringify(
    typeof log.new_values === 'string'
        ? JSON.parse(log.new_values)
        : log.new_values,
    null, 2
)}                                    </pre>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────

const INITIAL_FILTERS = {
    search: '', action: '', entity_type: '', user_id: '',
    date_from: '', date_to: '', per_page: 50,
};

export default function AuditLogs() {
    const [logs, setLogs]         = useState([]);
    const [meta, setMeta]         = useState(null);
    const [stats, setStats]       = useState(null);
    const [users, setUsers]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage]         = useState(1);
    const [filters, setFilters]   = useState(INITIAL_FILTERS);
    const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);
    const [selected, setSelected] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const searchRef = useRef();

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/audit-logs/stats');
            setStats(res.data);
        } catch { /* silent */ }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data?.data ?? []);
        } catch { /* silent */ }
    }, []);

    const fetchLogs = useCallback(async (currentPage = 1, f = activeFilters) => {
        setLoading(true);
        try {
            const params = { page: currentPage, ...f };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.data);
            setMeta(res.data.meta);
        } catch {
            toast.error('فشل في تحميل سجل الرقابة');
        } finally {
            setLoading(false);
        }
    }, [activeFilters]);

    useEffect(() => { fetchLogs(page); }, [page, activeFilters]);
    useEffect(() => { fetchStats(); fetchUsers(); }, []);

    const applyFilters = () => {
        setActiveFilters({ ...filters });
        setPage(1);
        setShowFilters(false);
    };

    const resetFilters = () => {
        setFilters(INITIAL_FILTERS);
        setActiveFilters(INITIAL_FILTERS);
        setPage(1);
    };

    const handleExport = async () => {
        if (!activeFilters.date_from || !activeFilters.date_to) {
            toast.error('يجب تحديد نطاق التاريخ للتصدير');
            return;
        }
        setExporting(true);
        try {
            const params = new URLSearchParams({ ...activeFilters });
            const token = document.cookie.match(/token=([^;]+)/)?.[1] ?? '';
            const link = document.createElement('a');
            link.href = `${api.defaults.baseURL}/audit-logs/export?${params}`;
            link.click();
            toast.success('جاري تحميل ملف CSV');
        } catch {
            toast.error('فشل التصدير');
        } finally {
            setExporting(false);
        }
    };

    const activeFilterCount = Object.entries(activeFilters)
        .filter(([k, v]) => k !== 'per_page' && v).length;

    return (
        <div className="space-y-5 max-w-screen-xl mx-auto pb-10 px-4 animate-in fade-in duration-500">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4
                bg-card border border-border rounded-3xl p-5 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-xl font-black text-ink flex items-center gap-2">
                        <Shield size={22} className="text-primary" />
                        سجل الرقابة الكامل
                    </h1>
                    <p className="text-xs text-muted font-medium mt-1">
                        كل الإجراءات مسجلة — لا يُحذف أبداً
                    </p>
                </div>
                <div className="flex items-center gap-2 z-10">
                    <button onClick={() => fetchLogs(page)}
                        className="p-2.5 bg-mist hover:bg-primary-pale hover:text-primary
                            rounded-xl transition-all border border-border"
                        title="تحديث">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleExport} disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white
                            rounded-xl text-sm font-bold hover:bg-ink/90 transition-all
                            disabled:opacity-50">
                        {exporting
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Download size={15} />}
                        تصدير CSV
                    </button>
                </div>
                <Shield size={160} className="absolute -left-8 -top-8 text-primary/4 pointer-events-none" />
            </div>

            {/* ── Stats ──────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatPill icon={Clock}    label="إجمالي اليوم"     value={stats.total_today?.toLocaleString('ar-EG')}  color="text-primary" />
                    <StatPill icon={Shield}   label="آخر 7 أيام"       value={stats.total_week?.toLocaleString('ar-EG')}   color="text-ink" />
                    <StatPill icon={FileText} label="الإجمالي الكلي"   value={stats.total_all?.toLocaleString('ar-EG')}    color="text-ink" />
                    <StatPill icon={Globe}    label="IPs مختلفة اليوم" value={stats.unique_ips_today?.toLocaleString('ar-EG')} color="text-warning" />
                </div>
            )}

            {/* ── Search + Filter Bar ────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex gap-2">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="بحث في الإجراء، النوع، IP..."
                            value={filters.search}
                            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            className="w-full bg-mist border border-border rounded-xl pr-9 pl-4 py-2.5
                                text-sm font-medium text-ink placeholder:text-muted
                                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                transition-all"
                        />
                    </div>

                    {/* Filter toggle */}
                    <button onClick={() => setShowFilters(p => !p)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                            border transition-all
                            ${showFilters
                                ? 'bg-primary text-white border-primary'
                                : 'bg-mist border-border hover:border-primary hover:text-primary text-ink'}`}>
                        <Filter size={15} />
                        فلاتر
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger text-white
                                text-[9px] font-black rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button onClick={resetFilters}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold
                                text-danger bg-danger/5 border border-danger/20 hover:bg-danger/10 transition-all">
                            <X size={14} />
                            مسح
                        </button>
                    )}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border">
                        {/* Action type */}
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                نوع الإجراء
                            </label>
                            <select value={filters.action}
                                onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}
                                className="w-full bg-mist border border-border rounded-xl px-3 py-2 text-sm
                                    font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary transition-all">
                                {ACTION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* User */}
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                الموظف
                            </label>
                            <select value={filters.user_id}
                                onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))}
                                className="w-full bg-mist border border-border rounded-xl px-3 py-2 text-sm
                                    font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary transition-all">
                                <option value="">كل الموظفين</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date from */}
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                من تاريخ
                            </label>
                            <input type="date" value={filters.date_from}
                                onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
                                className="w-full bg-mist border border-border rounded-xl px-3 py-2 text-sm
                                    font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary transition-all" />
                        </div>

                        {/* Date to */}
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                إلى تاريخ
                            </label>
                            <input type="date" value={filters.date_to}
                                onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
                                className="w-full bg-mist border border-border rounded-xl px-3 py-2 text-sm
                                    font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary transition-all" />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                            <button onClick={resetFilters}
                                className="px-4 py-2 text-sm font-bold text-muted hover:text-ink
                                    border border-border rounded-xl transition-all">
                                إعادة تعيين
                            </button>
                            <button onClick={applyFilters}
                                className="px-6 py-2 bg-primary text-white text-sm font-bold
                                    rounded-xl hover:bg-primary/90 transition-all">
                                تطبيق الفلاتر
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table ──────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="px-5 py-3.5 border-b border-border flex justify-between items-center bg-mist/50">
                    <p className="text-xs font-black text-muted uppercase tracking-wider">
                        {meta ? `${meta.total?.toLocaleString('ar-EG')} سجل` : '...'}
                    </p>
                    <select value={filters.per_page}
                        onChange={e => {
                            setFilters(p => ({ ...p, per_page: e.target.value }));
                            setActiveFilters(p => ({ ...p, per_page: e.target.value }));
                            setPage(1);
                        }}
                        className="text-xs font-bold bg-card border border-border rounded-lg px-2 py-1
                            text-ink focus:outline-none focus:ring-1 focus:ring-primary/20">
                        {[25, 50, 100, 200].map(n => (
                            <option key={n} value={n}>{n} / صفحة</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead className="text-[10px] text-muted bg-mist font-black uppercase tracking-wider border-b border-border">
                            <tr>
                                <th className="px-4 py-3 w-12">#</th>
                                <th className="px-4 py-3">الإجراء</th>
                                <th className="px-4 py-3">المستخدم</th>
                                <th className="px-4 py-3">السجل</th>
                                <th className="px-4 py-3">IP / الجهاز</th>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-mist rounded animate-pulse"
                                                    style={{ width: `${60 + Math.random() * 40}%` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Shield size={36} />
                                            <p className="font-bold">لا توجد سجلات تطابق الفلاتر</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, i) => (
                                    <tr key={log.id}
                                        className="hover:bg-mist/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelected(log)}>
                                        <td className="px-4 py-3 text-muted text-xs font-bold tabular-nums">
                                            {log.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center text-[11px] font-black
                                                px-2.5 py-1 rounded-full border
                                                ${COLOR_MAP[log.action_color] ?? COLOR_MAP.muted}`}>
                                                {log.action_label ?? log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-ink text-white rounded-full flex items-center
                                                    justify-center text-[11px] font-black shrink-0">
                                                    {log.user?.name?.charAt(0) ?? 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-ink text-xs leading-none">
                                                        {log.user?.name ?? 'النظام'}
                                                    </p>
                                                    <p className="text-[10px] text-muted mt-0.5">
                                                        {log.user?.role ?? '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-bold text-ink">
                                                    {log.entity_label ?? log.entity_type}
                                                </p>
                                                <p className="text-[10px] text-muted font-mono mt-0.5">
                                                    #{log.entity_id}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-mono text-ink flex items-center gap-1">
                                                    <Globe size={9} className="text-muted" />
                                                    {log.ip_address ?? '—'}
                                                </span>
                                                <span className="text-[10px] text-muted flex items-center gap-1 max-w-[140px] truncate">
                                                    <Monitor size={9} />
                                                    {log.device_info
                                                        ? log.device_info.substring(0, 30) + (log.device_info.length > 30 ? '…' : '')
                                                        : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-bold text-ink tabular-nums">
                                                    {log.time_formatted}
                                                </p>
                                                <p className="text-[10px] text-muted mt-0.5">{log.time_ago}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            <Eye size={15} className="group-hover:text-primary transition-colors" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-mist/30">
                        <p className="text-xs text-muted font-bold">
                            صفحة {meta.current_page} من {meta.last_page}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button disabled={meta.current_page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-xl border border-border bg-card hover:border-primary
                                    hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronRight size={15} />
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                                const start = Math.max(1, meta.current_page - 2);
                                const p = start + i;
                                if (p > meta.last_page) return null;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all
                                            ${p === meta.current_page
                                                ? 'bg-primary text-white'
                                                : 'border border-border bg-card hover:border-primary hover:text-primary text-ink'}`}>
                                        {p}
                                    </button>
                                );
                            })}

                            <button disabled={meta.current_page === meta.last_page}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-xl border border-border bg-card hover:border-primary
                                    hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Detail Modal ────────────────────────────────── */}
            <DetailModal log={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
