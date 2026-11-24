import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
    CreditCard, Printer, RefreshCw, Search,
    CheckSquare, Square, X, AlertCircle,
    ChevronLeft, ChevronRight, ScanLine,
    Plus, RotateCcw, Trash2, Undo2, UserPlus
} from 'lucide-react';

const STATUS_CONFIG = {
    available:   { label: 'متاح بالمخزن',  bg: 'bg-mist',          text: 'text-muted'   },
    distributed: { label: 'مصروف لعضو',    bg: 'bg-success-pale',  text: 'text-success' },
    lost:        { label: 'مفقود',          bg: 'bg-danger-pale',   text: 'text-danger'  },
    cancelled:   { label: 'ملغي',           bg: 'bg-ink',           text: 'text-white'   },
    damaged:     { label: 'تالف',           bg: 'bg-warning-pale',  text: 'text-warning' },
    returned:    { label: 'راجع للمخزن',    bg: 'bg-primary/10',    text: 'text-primary' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-mist', text: 'text-muted' };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
};

const SkeletonRow = () => (
    <tr>
        {Array.from({ length: 5 }).map((_, i) => (
            <td key={i} className="p-4">
                <div className="h-4 bg-mist rounded-lg animate-pulse" />
            </td>
        ))}
    </tr>
);

const emptyReplaceState = {
    isOpen: false,
    card: null,
    reason: 'استبدال كارت العضو',
    old_card_status: 'lost',
    new_qr_id: '',
    notes: '',
    loading: false,
    error: null,
};

const emptyAddState = {
    isOpen: false,
    qr_id: '',
    notes: '',
    loading: false,
    error: null,
};

const emptyReturnState = {
    isOpen: false,
    card: null,
    return_status: 'returned',
    notes: '',
    loading: false,
    error: null,
};

export default function QrCards() {
    const [cards, setCards] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const [replaceModal, setReplaceModal] = useState(emptyReplaceState);
    const [addModal, setAddModal] = useState(emptyAddState);
    const [returnModal, setReturnModal] = useState(emptyReturnState);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

    const fetchCards = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, per_page: 50 };
            if (filter !== 'all') params.status = filter;
            if (debouncedSearch) params.search = debouncedSearch;

            const res = await api.get('/qr-cards', { params });
            setCards(res.data.data ?? []);
            setMeta(res.data.meta ?? null);
        } catch {
            toast.error('فشل في تحميل الكروت');
        } finally {
            setLoading(false);
        }
    }, [page, filter, debouncedSearch]);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    const handleReplace = async (e) => {
        e.preventDefault();
        setReplaceModal(p => ({ ...p, loading: true, error: null }));

        try {
            await api.post(`/qr-cards/${replaceModal.card.id}/replace`, {
                new_qr_id: replaceModal.new_qr_id.trim(),
                replacement_reason: replaceModal.reason,
                old_card_status: replaceModal.old_card_status,
                notes: replaceModal.notes || null,
            });

            toast.success('تم استبدال الكارت بنجاح ✅');
            setReplaceModal(emptyReplaceState);
            fetchCards();
        } catch (err) {
            const msg = err.response?.data?.message || 'حدث خطأ أثناء الاستبدال';
            setReplaceModal(p => ({ ...p, loading: false, error: msg }));
        }
    };

    const handleAddCard = async (e) => {
        e.preventDefault();
        setAddModal(p => ({ ...p, loading: true, error: null }));

        try {
            await api.post('/qr-cards', {
                qr_id: addModal.qr_id.trim(),
                notes: addModal.notes || null,
            });

            toast.success('تمت إضافة الكارت للمخزن ✅');
            setAddModal(emptyAddState);
            fetchCards();
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل في إضافة الكارت';
            setAddModal(p => ({ ...p, loading: false, error: msg }));
        }
    };

    const handleReturnCard = async (e) => {
        e.preventDefault();
        setReturnModal(p => ({ ...p, loading: true, error: null }));

        try {
            await api.post(`/qr-cards/${returnModal.card.id}/return`, {
                return_status: returnModal.return_status,
                notes: returnModal.notes || null,
            });

            toast.success('تم تحديث حالة الكارت بنجاح ✅');
            setReturnModal(emptyReturnState);
            fetchCards();
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل في تحديث حالة الكارت';
            setReturnModal(p => ({ ...p, loading: false, error: msg }));
        }
    };

    const handleRestore = async (card) => {
        if (!window.confirm(`إعادة الكارت ${card.qr_id} للخدمة؟`)) return;

        const toastId = toast.loading('جاري إعادة الكارت للخدمة...');
        try {
            await api.post(`/qr-cards/${card.id}/restore`, { status: 'available' });
            toast.success('تمت إعادة الكارت للخدمة ✅', { id: toastId });
            fetchCards();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في إعادة الكارت للخدمة', { id: toastId });
        }
    };

    const handleDelete = async (card) => {
        if (!window.confirm(`هل أنت متأكد من حذف الكارت ${card.qr_id}؟`)) return;

        const toastId = toast.loading('جاري حذف الكارت...');
        try {
            await api.delete(`/qr-cards/${card.id}`);
            toast.success('تم حذف الكارت بنجاح ✅', { id: toastId });
            fetchCards();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في حذف الكارت', { id: toastId });
        }
    };

    const toggleSelect = (clientId) => {
        if (!clientId) return;
        setSelectedIds(prev =>
            prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
        );
    };

    const toggleSelectAll = () => {
        const distributed = cards
            .filter(c => c.status === 'distributed' && c.client_id)
            .map(c => c.client_id);

        const allSelected = distributed.every(id => selectedIds.includes(id));
        setSelectedIds(allSelected ? [] : distributed);
    };

    const printSelected = async () => {
        if (selectedIds.length === 0) return toast.error('حدد كارت واحد على الأقل للطباعة');
        const toastId = toast.loading('جاري تجهيز الطباعة...');
        try {
            const params = selectedIds.map(id => `client_ids[]=${id}`).join('&');
            const res = await api.get(`/qr-cards/print-batch?${params}`, { responseType: 'text' });
            const w = window.open('', '_blank');
            w.document.write(res.data);
            w.document.close();
            setTimeout(() => w.print(), 500);
            toast.success('تم فتح نافذة الطباعة', { id: toastId });
        } catch {
            toast.error('حدث خطأ أثناء الطباعة', { id: toastId });
        }
    };

    const distributedOnPage = cards.filter(c => c.status === 'distributed' && c.client_id);
    const allPageSelected = distributedOnPage.length > 0 &&
        distributedOnPage.every(c => selectedIds.includes(c.client_id));

    const counts = {
        total: meta?.total ?? 0,
        available: cards.filter(c => c.status === 'available').length,
        distributed: cards.filter(c => c.status === 'distributed').length,
    };

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-10 px-4">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-5 rounded-2xl shadow-sm border border-border gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-pale p-3 rounded-xl text-primary">
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-ink">إدارة كروت الـ QR</h1>
                        <div className="flex gap-3 mt-1 text-xs font-bold text-muted">
                            <span>الإجمالي: <span className="text-ink">{counts.total}</span></span>
                            <span>متاح: <span className="text-success">{counts.available}</span></span>
                            <span>مصروف: <span className="text-primary">{counts.distributed}</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setAddModal({ ...emptyAddState, isOpen: true })}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                    >
                        <Plus size={16} />
                        إضافة كارت
                    </button>

                    <button
                        onClick={fetchCards}
                        disabled={loading}
                        className="p-2.5 bg-mist hover:bg-gray-200 rounded-xl transition-all border border-border"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={printSelected}
                        disabled={selectedIds.length === 0}
                        className="flex items-center gap-2 bg-ink hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                    >
                        <Printer size={16} />
                        طباعة ({selectedIds.length})
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="بحث برقم الكارت أو اسم العضو..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-bold outline-none focus:border-primary cursor-pointer transition-all"
                >
                    <option value="all">كل الحالات</option>
                    <option value="available">متاح بالمخزن</option>
                    <option value="distributed">مصروف لعضو</option>
                    <option value="returned">راجع للمخزن</option>
                    <option value="lost">مفقود</option>
                    <option value="damaged">تالف</option>
                    <option value="cancelled">ملغي</option>
                </select>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-mist text-muted text-xs font-black uppercase border-b border-border">
                            <tr>
                                <th className="p-4 text-center w-10">
                                    <button onClick={toggleSelectAll}>
                                        {allPageSelected
                                            ? <CheckSquare size={18} className="text-primary mx-auto" />
                                            : <Square size={18} className="mx-auto" />}
                                    </button>
                                </th>
                                <th className="p-4">كود الـ QR</th>
                                <th className="p-4">العضو المرتبط</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : cards.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <CreditCard size={40} />
                                            <p className="font-black text-ink">لا توجد كروت مطابقة</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                cards.map(card => {
                                    const isSelected = card.client_id && selectedIds.includes(card.client_id);

                                    return (
                                        <tr
                                            key={card.id}
                                            className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-mist'}`}
                                        >
                                            <td className="p-4 text-center">
                                                {card.status === 'distributed' && card.client_id ? (
                                                    <button onClick={() => toggleSelect(card.client_id)}>
                                                        {isSelected
                                                            ? <CheckSquare size={18} className="text-primary mx-auto" />
                                                            : <Square size={18} className="text-muted mx-auto" />}
                                                    </button>
                                                ) : (
                                                    <span className="text-muted/30">—</span>
                                                )}
                                            </td>

                                            <td className="p-4 font-mono font-black text-ink text-sm">
                                                {card.qr_id}
                                            </td>

                                            <td className="p-4">
                                                {card.client ? (
                                                    <div>
                                                        <p className="font-bold text-sm text-ink">{card.client.name}</p>
                                                        <p className="text-xs text-muted font-medium">{card.client.phone}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted text-xs font-bold">— غير مرتبط —</span>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <StatusBadge status={card.status} />
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    {card.status === 'distributed' && (
                                                        <>
                                                            <button
                                                                onClick={() => setReplaceModal({
                                                                    ...emptyReplaceState,
                                                                    isOpen: true,
                                                                    card,
                                                                })}
                                                                className="text-xs font-bold bg-warning-pale text-warning px-3 py-1.5 rounded-lg hover:bg-warning hover:text-white transition-all"
                                                            >
                                                                استبدال
                                                            </button>

                                                            <button
                                                                onClick={() => setReturnModal({
                                                                    ...emptyReturnState,
                                                                    isOpen: true,
                                                                    card,
                                                                })}
                                                                className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all"
                                                            >
                                                                إرجاع
                                                            </button>
                                                        </>
                                                    )}

                                                    {['lost', 'damaged', 'returned'].includes(card.status) && (
                                                        <button
                                                            onClick={() => handleRestore(card)}
                                                            className="text-xs font-bold bg-success-pale text-success px-3 py-1.5 rounded-lg hover:bg-success hover:text-white transition-all"
                                                        >
                                                            <RotateCcw size={14} className="inline ml-1" />
                                                            إعادة للخدمة
                                                        </button>
                                                    )}

                                                    {(card.status !== 'distributed') && (
                                                        <button
                                                            onClick={() => handleDelete(card)}
                                                            className="text-xs font-bold bg-danger-pale text-danger px-3 py-1.5 rounded-lg hover:bg-danger hover:text-white transition-all"
                                                        >
                                                            <Trash2 size={14} className="inline ml-1" />
                                                            حذف
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {meta && meta.last_page > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-mist text-sm font-bold text-muted">
                        <span>
                            {meta.from}–{meta.to} من {meta.total} كارت
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={meta.current_page === 1}
                                className="p-1.5 rounded-lg hover:bg-card disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>

                            {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                                const p = meta.current_page <= 3 ? i + 1 : meta.current_page + i - 2;
                                if (p > meta.last_page) return null;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                            meta.current_page === p ? 'bg-primary text-white' : 'hover:bg-card text-muted'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                                disabled={meta.current_page === meta.last_page}
                                className="p-1.5 rounded-lg hover:bg-card disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {addModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-black text-ink">إضافة كارت جديد</h2>
                            <button onClick={() => setAddModal(emptyAddState)} className="p-1.5 hover:bg-mist rounded-lg transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {addModal.error && (
                            <div className="flex items-center gap-2 p-3 bg-danger-pale text-danger rounded-xl mb-4 text-sm font-bold">
                                <AlertCircle size={16} className="shrink-0" />
                                {addModal.error}
                            </div>
                        )}

                        <form onSubmit={handleAddCard} className="space-y-4">
                            <div>
                                <label className="block text-sm font-black text-ink mb-2">
                                    <ScanLine size={14} className="inline ml-1" />
                                    كود الكارت
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={addModal.qr_id}
                                    onChange={e => setAddModal(p => ({ ...p, qr_id: e.target.value, error: null }))}
                                    className="w-full px-4 py-3 border-2 border-primary/40 border-dashed rounded-xl outline-none focus:border-primary font-mono tracking-widest text-center text-lg transition-all"
                                    placeholder="QR-XXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-ink mb-2">ملاحظات</label>
                                <textarea
                                    value={addModal.notes}
                                    onChange={e => setAddModal(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-4 py-3 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                    rows={3}
                                    placeholder="أي ملاحظة إضافية..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={addModal.loading || !addModal.qr_id.trim()}
                                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-black text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                                >
                                    {addModal.loading ? <RefreshCw size={16} className="animate-spin mx-auto" /> : 'إضافة الكارت'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddModal(emptyAddState)}
                                    className="flex-1 bg-mist text-ink py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {replaceModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-black text-ink">استبدال كارت العضو</h2>
                            <button onClick={() => setReplaceModal(emptyReplaceState)} className="p-1.5 hover:bg-mist rounded-lg transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-mist p-3 rounded-xl mb-5 flex items-center gap-3">
                            <div className="p-2 bg-warning-pale rounded-lg">
                                <CreditCard size={18} className="text-warning" />
                            </div>
                            <div>
                                <p className="text-xs text-muted font-bold">العضو</p>
                                <p className="font-black text-sm text-ink">{replaceModal.card?.client?.name}</p>
                                <p className="text-xs font-mono text-muted">كارت حالي: {replaceModal.card?.qr_id}</p>
                            </div>
                        </div>

                        {replaceModal.error && (
                            <div className="flex items-center gap-2 p-3 bg-danger-pale text-danger rounded-xl mb-4 text-sm font-bold">
                                <AlertCircle size={16} className="shrink-0" />
                                {replaceModal.error}
                            </div>
                        )}

                        <form onSubmit={handleReplace} className="space-y-4">
                            <div>
                                <label className="block text-sm font-black text-ink mb-2">الكارت الجديد</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={replaceModal.new_qr_id}
                                    onChange={e => setReplaceModal(p => ({ ...p, new_qr_id: e.target.value, error: null }))}
                                    className="w-full px-4 py-3 border-2 border-primary/40 border-dashed rounded-xl outline-none focus:border-primary font-mono tracking-widest text-center text-lg transition-all"
                                    placeholder="QR-XXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-ink mb-2">حالة الكارت القديم</label>
                                <select
                                    value={replaceModal.old_card_status}
                                    onChange={e => setReplaceModal(p => ({ ...p, old_card_status: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                >
                                    <option value="lost">مفقود</option>
                                    <option value="damaged">تالف</option>
                                    <option value="cancelled">ملغي</option>
                                    <option value="returned">راجع للمخزن</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-ink mb-2">سبب الاستبدال</label>
                                <input
                                    type="text"
                                    required
                                    value={replaceModal.reason}
                                    onChange={e => setReplaceModal(p => ({ ...p, reason: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                    placeholder="مثال: ضائع، تالف..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-ink mb-2">ملاحظات</label>
                                <textarea
                                    value={replaceModal.notes}
                                    onChange={e => setReplaceModal(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-4 py-3 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                    rows={3}
                                    placeholder="أي تفاصيل إضافية..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={replaceModal.loading || !replaceModal.new_qr_id.trim()}
                                    className="flex-1 bg-warning text-white py-2.5 rounded-xl font-black text-sm hover:bg-warning/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                                >
                                    {replaceModal.loading ? <RefreshCw size={16} className="animate-spin" /> : 'تأكيد الاستبدال'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReplaceModal(emptyReplaceState)}
                                    className="flex-1 bg-mist text-ink py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {returnModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-black text-ink">إرجاع / سحب كارت</h2>
                            <button onClick={() => setReturnModal(emptyReturnState)} className="p-1.5 hover:bg-mist rounded-lg transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {returnModal.error && (
                            <div className="flex items-center gap-2 p-3 bg-danger-pale text-danger rounded-xl mb-4 text-sm font-bold">
                                <AlertCircle size={16} className="shrink-0" />
                                {returnModal.error}
                            </div>
                        )}

                        <form onSubmit={handleReturnCard} className="space-y-4">
                            <div>
                                <label className="block text-sm font-black text-ink mb-2">الحالة الجديدة للكارت</label>
                                <select
                                    value={returnModal.return_status}
                                    onChange={e => setReturnModal(p => ({ ...p, return_status: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                >
                                    <option value="returned">راجع للمخزن</option>
                                    <option value="available">متاح مباشرة</option>
                                    <option value="lost">مفقود</option>
                                    <option value="damaged">تالف</option>
                                    <option value="cancelled">ملغي</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-ink mb-2">ملاحظات</label>
                                <textarea
                                    value={returnModal.notes}
                                    onChange={e => setReturnModal(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-4 py-3 border border-border rounded-xl outline-none focus:border-primary text-sm transition-all"
                                    rows={3}
                                    placeholder="مثال: العميل سلّم الكارت، أو الكارت رجع غير صالح..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={returnModal.loading}
                                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-black text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                                >
                                    {returnModal.loading ? <RefreshCw size={16} className="animate-spin" /> : 'حفظ الحالة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReturnModal(emptyReturnState)}
                                    className="flex-1 bg-mist text-ink py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
