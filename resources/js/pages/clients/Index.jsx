import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import {
    Search,
    Plus,
    UserCircle,
    Printer,
    ChevronRight,
    RefreshCw,
    Users,
    Smartphone,
    AlertCircle,
    X,
    Snowflake,
    Clock3,
    CalendarRange,
    Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    active:  { label: 'نشط',   bg: 'bg-emerald-500', text: 'text-white' },
    frozen:  { label: 'مجمّد', bg: 'bg-amber-400',   text: 'text-slate-900' },
    expired: { label: 'منتهي', bg: 'bg-rose-500',    text: 'text-white' },
};

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('ar-EG');
};

const SkeletonCard = () => (
    <div className="bg-card rounded-[2rem] border border-border overflow-hidden animate-pulse">
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-mist rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-mist rounded-xl w-3/4" />
                    <div className="h-3 bg-mist rounded-xl w-1/2" />
                </div>
            </div>
            <div className="h-16 bg-mist rounded-2xl" />
        </div>
    </div>
);

function FilterStat({ label, value, tone = 'default' }) {
    const tones = {
        default: 'text-ink',
        success: 'text-emerald-600',
        warning: 'text-amber-600',
        danger: 'text-rose-600',
    };

    return (
        <div className="bg-mist/60 border border-border rounded-2xl px-4 py-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-muted mb-1">
                {label}
            </div>
            <div className={`text-lg font-black ${tones[tone] ?? tones.default}`}>
                {value}
            </div>
        </div>
    );
}

function ClientCard({ client }) {
    const status = STATUS_CONFIG[client.status] ?? STATUS_CONFIG.expired;
    const activeSub = client.active_subscription;

    const daysLeft = activeSub?.end_date
        ? Math.max(0, Math.ceil((new Date(activeSub.end_date) - new Date()) / 86400000))
        : null;

    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
    const isExpired = client.status === 'expired' || (daysLeft !== null && daysLeft === 0);

    return (
        <Link
            to={`/clients/${client.id}`}
            className={`group rounded-[2rem] overflow-hidden relative flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                isExpired
                    ? 'bg-rose-50/50 border border-rose-200'
                    : isExpiringSoon
                    ? 'bg-amber-50/50 border border-amber-200'
                    : 'bg-card border border-border hover:border-primary/30'
            }`}
        >
            <div className={`h-1.5 w-full ${status.bg}`} />

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${status.bg} ${status.text}`}>
                        {client.status === 'frozen' && <Snowflake size={9} />}
                        {status.label}
                    </span>

                    <span className="text-[10px] text-muted font-bold uppercase">
                        {client.gender === 'male' ? '♂ رجال' : '♀ سيدات'}
                    </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-12 h-12 bg-mist rounded-2xl flex items-center justify-center text-primary/30 overflow-hidden border border-border/50">
                        {client.photo_url ? (
                            <img src={client.photo_url} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle size={28} />
                        )}
                    </div>

                    <div className="overflow-hidden">
                        <h3 className="font-black text-ink text-sm truncate group-hover:text-primary transition-colors">
                            {client.name}
                        </h3>
                        <div className="flex items-center gap-1 text-muted text-[11px] font-medium" dir="ltr">
                            <Smartphone size={10} /> {client.phone}
                        </div>
                    </div>
                </div>

                <div className="mt-auto bg-white/70 p-3.5 rounded-2xl border border-border/50 space-y-2">
                    {activeSub ? (
                        <>
                            <div className="flex justify-between items-center text-xs gap-3">
                                <span className="text-muted font-bold shrink-0">الباقة</span>
                                <span className="text-ink font-black truncate text-right">
                                    {activeSub.subscription_type?.name ?? 'اشتراك'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs gap-3">
                                <span className="text-muted font-bold shrink-0">ينتهي</span>
                                <span className={`font-black text-right ${
                                    isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-ink'
                                }`}>
                                    {formatDate(activeSub.end_date)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs gap-3">
                                <span className="text-muted font-bold shrink-0">المتبقي</span>
                                <span className={`font-black ${
                                    isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-primary'
                                }`}>
                                    {daysLeft !== null ? (daysLeft === 0 ? 'اليوم' : `${daysLeft} يوم`) : '—'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs gap-3">
                                <span className="text-muted font-bold shrink-0">الحصص</span>
                                <span className={`font-black ${
                                    activeSub.sessions_remaining !== null && activeSub.sessions_remaining < 3
                                        ? 'text-rose-600'
                                        : 'text-primary'
                                }`}>
                                    {activeSub.sessions_remaining ?? '∞'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-muted font-bold py-1">
                            <AlertCircle size={12} className="text-rose-500/70" />
                            لا يوجد اشتراك فعال
                        </div>
                    )}
                </div>

                <div className="mt-3 flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted/40 uppercase tracking-widest">
                        #{client.qr_id}
                    </span>
                    <ChevronRight size={16} className="text-muted group-hover:-translate-x-1 transition-transform" />
                </div>
            </div>
        </Link>
    );
}

export default function ClientsIndex() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);

    const [page, setPage] = useState(Number(searchParams.get('page') || 1));
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');

    const [filters, setFilters] = useState({
        status: searchParams.get('status') ?? 'all',
        gender: searchParams.get('gender') ?? 'all',
        expiryFrom: searchParams.get('expiry_from') ?? '',
        expiryTo: searchParams.get('expiry_to') ?? '',
    });

    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters.status, filters.gender, filters.expiryFrom, filters.expiryTo]);

    useEffect(() => {
        const p = {};
        if (debouncedSearch) p.search = debouncedSearch;
        if (filters.status !== 'all') p.status = filters.status;
        if (filters.gender !== 'all') p.gender = filters.gender;
        if (filters.expiryFrom) p.expiry_from = filters.expiryFrom;
        if (filters.expiryTo) p.expiry_to = filters.expiryTo;
        if (page > 1) p.page = page;

        setSearchParams(p, { replace: true });
    }, [debouncedSearch, filters, page, setSearchParams]);

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);

            const params = { page };

            if (debouncedSearch) params.search = debouncedSearch;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.gender !== 'all') params.gender = filters.gender;
            if (filters.expiryFrom) params.expiry_from = filters.expiryFrom;
            if (filters.expiryTo) params.expiry_to = filters.expiryTo;

            const res = await api.get('/clients', { params });
            setClients(res.data.data);
            setMeta(res.data.meta ?? null);
        } catch {
            toast.error('فشل تحميل الأعضاء');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filters, page]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const hasFilters =
        debouncedSearch ||
        filters.status !== 'all' ||
        filters.gender !== 'all' ||
        filters.expiryFrom ||
        filters.expiryTo;

    const resetFilters = () => {
        setSearchTerm('');
        setFilters({
            status: 'all',
            gender: 'all',
            expiryFrom: '',
            expiryTo: '',
        });
        setPage(1);
    };

    const counts = useMemo(() => ({
        total: meta?.total ?? clients.length,
        active: clients.filter(c => c.status === 'active').length,
        frozen: clients.filter(c => c.status === 'frozen').length,
        expired: clients.filter(c => c.status === 'expired').length,
    }), [clients, meta]);

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-10 px-4" dir="rtl">
            {/* Header */}
            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/10 text-primary text-[11px] font-black uppercase tracking-[0.18em] mb-2">
                        <Users size={13} />
                        Members
                    </div>

                    <h1 className="text-2xl font-black text-ink">إدارة الأعضاء</h1>

                    <p className="text-sm text-muted font-medium mt-2">
                        فلترة ذكية للأعضاء حسب الحالة والجنس وفترة انتهاء الاشتراك.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-full xl:min-w-[540px]">
                    <FilterStat label="الإجمالي" value={counts.total} />
                    <FilterStat label="نشط" value={counts.active} tone="success" />
                    <FilterStat label="مجمّد" value={counts.frozen} tone="warning" />
                    <FilterStat label="منتهي" value={counts.expired} tone="danger" />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={fetchClients}
                        className="flex items-center gap-1.5 bg-mist px-4 py-2.5 rounded-2xl font-bold text-sm border border-border transition-all hover:bg-white hover:text-primary text-muted"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        تحديث
                    </button>

                    <Link
                        to="/clients/print"
                        className="flex items-center gap-1.5 bg-mist px-4 py-2.5 rounded-2xl font-bold text-sm border border-border transition-all hover:bg-white text-muted"
                    >
                        <Printer size={16} /> طباعة الكروت
                    </Link>

                    <Link
                        to="/clients/create"
                        className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                        <Plus size={18} /> إضافة عضو
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card p-4 rounded-3xl border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-sm font-black text-ink">
                    <Filter size={16} className="text-primary" />
                    فلاتر البحث المتقدم
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <div className="xl:col-span-2 relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />

                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                            >
                                <X size={15} />
                            </button>
                        )}

                        <input
                            type="text"
                            placeholder="بحث بالاسم، الموبايل، أو QR..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-10 py-3 bg-mist rounded-2xl text-sm font-bold text-ink placeholder:text-muted outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/30 transition-all"
                        />
                    </div>

                    <select
                        value={filters.status}
                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                        className="bg-mist py-3 px-4 rounded-2xl text-sm font-bold text-ink outline-none border-2 border-transparent cursor-pointer focus:border-primary/30 focus:bg-white transition-all"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="active">نشط</option>
                        <option value="frozen">مجمّد</option>
                        <option value="expired">منتهي</option>
                    </select>

                    <select
                        value={filters.gender}
                        onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                        className="bg-mist py-3 px-4 rounded-2xl text-sm font-bold text-ink outline-none border-2 border-transparent cursor-pointer focus:border-primary/30 focus:bg-white transition-all"
                    >
                        <option value="all">كل الأجناس</option>
                        <option value="male">رجال</option>
                        <option value="female">سيدات</option>
                    </select>

                    <div className="flex items-center gap-2 rounded-2xl bg-mist px-4 border border-transparent focus-within:border-primary/30 focus-within:bg-white transition-all">
                        <CalendarRange size={16} className="text-muted shrink-0" />
                        <input
                            type="date"
                            value={filters.expiryFrom}
                            onChange={e => setFilters(f => ({ ...f, expiryFrom: e.target.value }))}
                            className="w-full py-3 bg-transparent text-sm font-bold text-ink outline-none"
                            title="ينتهي من"
                        />
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-mist px-4 border border-transparent focus-within:border-primary/30 focus-within:bg-white transition-all">
                        <CalendarRange size={16} className="text-muted shrink-0" />
                        <input
                            type="date"
                            value={filters.expiryTo}
                            onChange={e => setFilters(f => ({ ...f, expiryTo: e.target.value }))}
                            className="w-full py-3 bg-transparent text-sm font-bold text-ink outline-none"
                            title="ينتهي إلى"
                        />
                    </div>
                </div>

                {(filters.expiryFrom || filters.expiryTo) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/10">
                            فلتر انتهاء الاشتراك
                        </span>

                        {filters.expiryFrom && (
                            <span className="px-3 py-1 rounded-full bg-mist text-ink border border-border">
                                من: {formatDate(filters.expiryFrom)}
                            </span>
                        )}

                        {filters.expiryTo && (
                            <span className="px-3 py-1 rounded-full bg-mist text-ink border border-border">
                                إلى: {formatDate(filters.expiryTo)}
                            </span>
                        )}
                    </div>
                )}

                {hasFilters && (
                    <div className="flex justify-end">
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all"
                        >
                            <X size={15} /> مسح الفلاتر
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : clients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 opacity-60">
                        <Users size={48} />
                        <p className="font-black text-lg text-ink">
                            {hasFilters ? 'لا توجد نتائج مطابقة للفلاتر الحالية' : 'لا يوجد أعضاء بعد'}
                        </p>
                    </div>
                ) : (
                    clients.map(client => <ClientCard key={client.id} client={client} />)
                )}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-10 h-10 rounded-2xl text-sm font-black transition-all ${
                                meta.current_page === p
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-mist text-muted hover:bg-white hover:text-ink border border-border'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
