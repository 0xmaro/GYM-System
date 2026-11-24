import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
    DollarSign, Plus, CheckCircle, Clock, AlertCircle,
    Search, Filter, RefreshCw, User, Calendar, FileText,
    Bell, ChevronDown, X
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATUS_MAP = {
    pending: { label: 'معلق',   cls: 'bg-warning-pale text-warning',  icon: Clock         },
    paid:    { label: 'مسدّد',  cls: 'bg-success-pale text-success',  icon: CheckCircle   },
    overdue: { label: 'متأخر',  cls: 'bg-danger-pale text-danger',    icon: AlertCircle   },
};

// ✅ جديد — بدون علامة عشرية
const formatMoney = (v) => Number(v).toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
}) + ' ج.م';
// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function Debts() {
    const [debts,   setDebts]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta,    setMeta]    = useState({ current_page: 1, last_page: 1, total: 0 });
    const [page,    setPage]    = useState(1);
    const [filters, setFilters] = useState({ status: '', search: '' });
    const [showForm, setShowForm] = useState(false);
    const [stats,    setStats]   = useState({ total: 0, pending: 0, paid: 0, overdue: 0, total_amount: 0, pending_amount: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [debtsRes, statsRes] = await Promise.all([
                api.get('/debts', { params: { ...filters, page, per_page: 15 } }),
                api.get('/debts/stats'),
            ]);
            const d = debtsRes.data;
            setDebts(d.data ?? d ?? []);
            setMeta({ current_page: d.current_page ?? 1, last_page: d.last_page ?? 1, total: d.total ?? 0 });
            setStats(statsRes.data ?? {});
        } catch { toast.error('تعذر تحميل الديون'); }
        finally { setLoading(false); }
    }, [filters, page]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (k, v) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); };

    const markPaid = async (debt) => {
        if (!confirm(`تأكيد سداد دين "${debt.client?.name}" بقيمة ${formatMoney(debt.amount)}؟`)) return;
        const tid = toast.loading('جاري التسجيل...');
        try {
            await api.post(`/debts/${debt.id}/mark-paid`);
            toast.success('تم تسجيل السداد ✅', { id: tid });
            load();
        } catch { toast.error('فشل التسجيل', { id: tid }); }
    };

    const notifyDebt = async (debt) => {
        const tid = toast.loading('جاري الإرسال...');
        try {
            await api.post(`/debts/${debt.id}/notify`);
            toast.success('تم إرسال التذكير ✅', { id: tid });
            load();
        } catch { toast.error('فشل الإرسال', { id: tid }); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-10 px-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between bg-card p-5 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-4">
                    <div className="bg-danger-pale p-3 rounded-xl text-danger">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-ink">إدارة الديون</h1>
                        <p className="text-muted text-xs mt-0.5">متابعة ديون الأعضاء وتسجيل السداد</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-ink text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                >
                    <Plus size={15} /> إضافة دين
                </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'إجمالي الديون',    value: meta.total,              sub: formatMoney(stats.total_amount   ?? 0), cls: 'text-ink',    icon: FileText    },
                    { label: 'معلقة',             value: stats.pending ?? 0,      sub: formatMoney(stats.pending_amount ?? 0), cls: 'text-warning', icon: Clock       },
                    { label: 'متأخرة',            value: stats.overdue ?? 0,      sub: 'تجاوزت الموعد',                        cls: 'text-danger',  icon: AlertCircle },
                    { label: 'مسدّدة',            value: stats.paid    ?? 0,      sub: 'تم التحصيل',                           cls: 'text-success', icon: CheckCircle },
                ].map(s => (
                    <div key={s.label} className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted font-bold">{s.label}</span>
                            <s.icon size={16} className={s.cls} />
                        </div>
                        <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
                        <p className="text-xs text-muted mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 bg-mist border border-border rounded-xl px-3 py-2">
                    <Search size={14} className="text-muted shrink-0" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم..."
                        value={filters.search}
                        onChange={e => setFilter('search', e.target.value)}
                        className="bg-transparent outline-none text-sm w-full"
                    />
                    {filters.search && (
                        <button onClick={() => setFilter('search', '')} className="text-muted hover:text-danger">
                            <X size={13} />
                        </button>
                    )}
                </div>
                <select
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value)}
                    className="px-3 py-2 bg-mist border border-border rounded-xl text-sm outline-none font-bold"
                >
                    <option value="">كل الحالات</option>
                    <option value="pending">معلق</option>
                    <option value="overdue">متأخر</option>
                    <option value="paid">مسدّد</option>
                </select>
                <button onClick={() => load()} className="text-muted hover:text-ink transition-colors p-2">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* ── Table ── */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-16 gap-3">
                        <RefreshCw size={22} className="animate-spin text-muted" />
                    </div>
                ) : debts.length === 0 ? (
                    <div className="p-16 text-center text-muted">
                        <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold">لا توجد ديون</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-mist border-b border-border text-xs text-muted">
                                <tr>
                                    <th className="p-3 font-bold">العضو</th>
                                    <th className="p-3 font-bold">المبلغ</th>
                                    <th className="p-3 font-bold">السبب</th>
                                    <th className="p-3 font-bold">تاريخ الاستحقاق</th>
                                    <th className="p-3 font-bold">الحالة</th>
                                    <th className="p-3 font-bold">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {debts.map(debt => {
                                    const s = STATUS_MAP[debt.status] ?? STATUS_MAP.pending;
                                    const isOverdue = debt.status === 'pending' && new Date(debt.due_date) < new Date();
                                    return (
                                        <tr key={debt.id} className={`hover:bg-mist transition-colors ${isOverdue ? 'bg-danger-pale/20' : ''}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-mist border border-border flex items-center justify-center text-xs font-black text-ink shrink-0">
                                                        {debt.client?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-ink text-xs">{debt.client?.name}</p>
                                                        <p className="text-muted text-xs" dir="ltr">{debt.client?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 font-black text-danger">{formatMoney(debt.amount)}</td>
                                            <td className="p-3 text-muted max-w-xs">
                                                <p className="line-clamp-2 text-xs">{debt.reason}</p>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Calendar size={11} className="text-muted" />
                                                    <span className={isOverdue ? 'text-danger font-bold' : 'text-muted'}>
                                                        {new Date(debt.due_date).toLocaleDateString('ar-EG')}
                                                    </span>
                                                </div>
                                                {debt.paid_at && (
                                                    <p className="text-success text-xs mt-0.5">
                                                        سُدّد: {new Date(debt.paid_at).toLocaleDateString('ar-EG')}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit ${isOverdue ? STATUS_MAP.overdue.cls : s.cls}`}>
                                                    <s.icon size={10} />
                                                    {isOverdue ? 'متأخر' : s.label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {debt.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => markPaid(debt)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-success text-white rounded-lg text-xs font-bold hover:bg-success/80 transition-all"
                                                            >
                                                                <CheckCircle size={11} /> سداد
                                                            </button>
                                                            <button
                                                                onClick={() => notifyDebt(debt)}
                                                                title="إرسال تذكير واتساب"
                                                                className="p-1.5 bg-mist border border-border rounded-lg text-muted hover:text-primary transition-all"
                                                            >
                                                                <Bell size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {meta.last_page > 1 && (
                    <div className="p-4 border-t border-border flex items-center justify-between">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="px-4 py-1.5 text-sm font-bold bg-mist border border-border rounded-lg disabled:opacity-40">
                            السابق
                        </button>
                        <span className="text-xs text-muted">{page} / {meta.last_page} — إجمالي {meta.total}</span>
                        <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                            className="px-4 py-1.5 text-sm font-bold bg-mist border border-border rounded-lg disabled:opacity-40">
                            التالي
                        </button>
                    </div>
                )}
            </div>

            {/* ── Add Debt Modal ── */}
            {showForm && <AddDebtModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
        </div>
    );
}

// ─────────────────────────────────────────────
// Add Debt Modal
// ─────────────────────────────────────────────
function AddDebtModal({ onClose, onSaved }) {
    const [form,    setForm]    = useState({ client_id: '', amount: '', reason: '', due_date: '' });
    const [clients, setClients] = useState([]);
    const [search,  setSearch]  = useState('');
    const [saving,  setSaving]  = useState(false);
    const [showDrop, setShowDrop] = useState(false);

    useEffect(() => {
        if (search.length < 2) { setClients([]); return; }
        const t = setTimeout(async () => {
            try {
                const r = await api.get('/clients', { params: { search, per_page: 10 } });
                setClients(r.data.data ?? r.data ?? []);
            } catch {}
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const selectClient = (c) => {
        setForm(p => ({ ...p, client_id: c.id }));
        setSearch(c.name);
        setShowDrop(false);
    };

    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.client_id) return toast.error('اختر العضو أولاً');
        setSaving(true);
        const tid = toast.loading('جاري الحفظ...');
        try {
            await api.post('/debts', form);
            toast.success('تم إضافة الدين ✅', { id: tid });
            onSaved();
        } catch (err) {
            const msg = err.response?.data?.message ?? 'فشل الحفظ';
            toast.error(msg, { id: tid });
        } finally { setSaving(false); }
    };

    const QUICK_REASONS = [
        'لم يدفع ثمن الكارت',
        'رسوم التسجيل',
        'اشتراك شهري',
        'ملابس رياضية',
        'حصص خاصة',
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="font-black text-ink flex items-center gap-2">
                        <DollarSign size={18} className="text-danger" /> إضافة دين جديد
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* العضو */}
                    <div>
                        <label className="text-xs font-bold text-muted block mb-1.5">العضو *</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ابحث باسم العضو..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setShowDrop(true); setF('client_id', ''); }}
                                className="w-full px-4 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary"
                            />
                            {showDrop && clients.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {clients.map(c => (
                                        <button
                                            key={c.id} type="button"
                                            onClick={() => selectClient(c)}
                                            className="w-full text-right px-4 py-2.5 hover:bg-mist text-sm flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-mist border border-border flex items-center justify-center text-xs font-black shrink-0">
                                                {c.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-ink">{c.name}</p>
                                                <p className="text-muted text-xs" dir="ltr">{c.phone}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* المبلغ */}
                    <div>
                        <label className="text-xs font-bold text-muted block mb-1.5">المبلغ (ج.م) *</label>
                        <input
                            type="number" min="1" required
                            placeholder="مثال: 150"
                            value={form.amount}
                            onChange={e => setF('amount', e.target.value)}
                            className="w-full px-4 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary"
                        />
                    </div>

                    {/* السبب */}
                    <div>
                        <label className="text-xs font-bold text-muted block mb-1.5">السبب *</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {QUICK_REASONS.map(r => (
                                <button
                                    key={r} type="button"
                                    onClick={() => setF('reason', r)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                        form.reason === r
                                            ? 'bg-ink text-white border-ink'
                                            : 'bg-mist border-border text-muted hover:text-ink'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <textarea
                            required rows={2}
                            placeholder="أو اكتب السبب..."
                            value={form.reason}
                            onChange={e => setF('reason', e.target.value)}
                            className="w-full px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary resize-none"
                            dir="rtl"
                        />
                    </div>

                    {/* تاريخ الاستحقاق */}
                    <div>
                        <label className="text-xs font-bold text-muted block mb-1.5">تاريخ الاستحقاق *</label>
                        <input
                            type="date" required
                            value={form.due_date}
                            onChange={e => setF('due_date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-border">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-mist border border-border rounded-xl text-sm font-bold text-muted hover:text-ink">
                            إلغاء
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex justify-center items-center gap-2 bg-danger text-white py-2.5 rounded-xl text-sm font-bold hover:bg-danger/80 disabled:opacity-50">
                            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                            إضافة الدين
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
