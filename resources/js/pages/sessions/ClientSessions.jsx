import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    Search, User, Dumbbell, Save, Loader2, Receipt, BadgeDollarSign,
    Percent, CalendarDays, Hash, Sparkles, RefreshCw
} from 'lucide-react';

const IS_CENTS = true;
const toCents = (v) => IS_CENTS ? Math.round(parseFloat(v || 0) * 100) : parseFloat(v || 0);
const fromCents = (v) => IS_CENTS ? (Number(v || 0) / 100) : Number(v || 0);

export default function ClientSessions() {
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    const [sessionTypes, setSessionTypes] = useState([]);
    const [sessionTypesLoading, setSessionTypesLoading] = useState(true);

    const [subscriptionTypes, setSubscriptionTypes] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        session_type_id: '',
        subscription_type_id: '',
        sessions_count: 1,
        unit_price: '',
        discount_amount: '',
        paid_amount: '',
        notes: '',
    });

    const selectedSessionType = useMemo(
        () => sessionTypes.find(s => String(s.id) === String(form.session_type_id)),
        [sessionTypes, form.session_type_id]
    );

    const gross = useMemo(() => {
        const count = parseInt(form.sessions_count || 0, 10) || 0;
        const price = parseFloat(form.unit_price || 0) || 0;
        return count * price;
    }, [form.sessions_count, form.unit_price]);

    const net = useMemo(() => {
        const discount = parseFloat(form.discount_amount || 0) || 0;
        return Math.max(0, gross - discount);
    }, [gross, form.discount_amount]);

    const remaining = useMemo(() => {
        const paid = parseFloat(form.paid_amount || 0) || 0;
        return Math.max(0, net - paid);
    }, [net, form.paid_amount]);

    const fetchSessionTypes = useCallback(async () => {
        try {
            setSessionTypesLoading(true);
            const res = await api.get('/session-types');
            setSessionTypes((res.data.data || []).filter(i => i.is_active));
        } catch {
            toast.error('فشل تحميل أنواع الحصص');
        } finally {
            setSessionTypesLoading(false);
        }
    }, []);

    const fetchSubscriptionTypes = useCallback(async () => {
        try {
            const res = await api.get('/subscription-types');
            setSubscriptionTypes(res.data.data || []);
        } catch {
            toast.error('فشل تحميل الباقات');
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await api.get('/client-sessions', { params: { per_page: 20 } });
            const payload = res.data.data;
            setHistory(payload?.data || payload || []);
        } catch {
            toast.error('فشل تحميل سجل الحصص');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessionTypes();
        fetchSubscriptionTypes();
        fetchHistory();
    }, [fetchSessionTypes, fetchSubscriptionTypes, fetchHistory]);

    useEffect(() => {
        if (!clientSearch.trim()) {
            setClients([]);
            return;
        }

        const t = setTimeout(async () => {
            try {
                setClientsLoading(true);
                const res = await api.get('/clients', {
                    params: {
                        search: clientSearch,
                        per_page: 8,
                    }
                });

                const payload = res.data?.data;
                setClients(payload?.data || payload || []);
            } catch {
                toast.error('فشل البحث عن العميل');
            } finally {
                setClientsLoading(false);
            }
        }, 350);

        return () => clearTimeout(t);
    }, [clientSearch]);

    useEffect(() => {
        if (selectedSessionType && !form.unit_price) {
            setForm(prev => ({
                ...prev,
                unit_price: fromCents(selectedSessionType.default_price),
            }));
        }
    }, [selectedSessionType, form.unit_price]);

    const set = (key) => (e) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
    };

    const resetForm = () => {
        setForm({
            session_type_id: '',
            subscription_type_id: '',
            sessions_count: 1,
            unit_price: '',
            discount_amount: '',
            paid_amount: '',
            notes: '',
        });
        setSelectedClient(null);
        setClientSearch('');
        setClients([]);
    };

    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setClientSearch(client.name);
        setClients([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedClient?.id) {
            toast.error('اختر العميل أولاً');
            return;
        }

        if (!form.session_type_id) {
            toast.error('اختر نوع الحصة');
            return;
        }

        if (!form.sessions_count || parseInt(form.sessions_count, 10) < 1) {
            toast.error('عدد الحصص يجب أن يكون 1 على الأقل');
            return;
        }

        if (form.unit_price === '' || parseFloat(form.unit_price) < 0) {
            toast.error('سعر الحصة غير صحيح');
            return;
        }

        if ((parseFloat(form.discount_amount || 0) || 0) > gross) {
            toast.error('الخصم أكبر من الإجمالي');
            return;
        }

        if ((parseFloat(form.paid_amount || 0) || 0) > net) {
            toast.error('المبلغ المدفوع أكبر من الصافي');
            return;
        }

        const payload = {
            client_id: selectedClient.id,
            session_type_id: parseInt(form.session_type_id, 10),
            subscription_type_id: form.subscription_type_id ? parseInt(form.subscription_type_id, 10) : null,
            sessions_count: parseInt(form.sessions_count, 10),
            unit_price: toCents(form.unit_price),
            discount_amount: toCents(form.discount_amount || 0),
            paid_amount: form.paid_amount !== '' ? toCents(form.paid_amount) : toCents(net),
            notes: form.notes?.trim() || null,
        };

        setSubmitting(true);
        try {
            await api.post('/client-sessions', payload);
            toast.success('تم تسجيل الحصة / الحصص بنجاح ✅');
            resetForm();
            fetchHistory();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'حدث خطأ أثناء حفظ الحصة');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 pb-16 space-y-6">
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-xl font-black text-ink flex items-center gap-2">
                        <Receipt size={20} className="text-primary" />
                        حصص العملاء
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        تسجيل حصص فردية أو يومية وربطها بالعميل مع السعر والخصم والحساب النهائي
                    </p>
                </div>

                <button
                    onClick={fetchHistory}
                    className="flex items-center gap-2 bg-mist border border-border px-4 py-2.5 rounded-2xl
                        text-sm font-black text-ink hover:bg-white transition-all w-fit"
                >
                    <RefreshCw size={16} />
                    تحديث السجل
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-mist border-b border-border">
                        <h2 className="font-black text-ink flex items-center gap-2">
                            <Sparkles size={16} className="text-primary" />
                            إضافة حصة للعميل
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider">
                                ابحث عن العميل *
                            </label>

                            <div className="relative">
                                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    value={clientSearch}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        setSelectedClient(null);
                                    }}
                                    placeholder="ابحث بالاسم أو الموبايل أو QR"
                                    className="w-full pr-11 p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                />
                            </div>

                            {(clientsLoading || clients.length > 0) && !selectedClient && (
                                <div className="bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
                                    {clientsLoading ? (
                                        <div className="p-4 text-sm text-muted font-bold">جاري البحث...</div>
                                    ) : clients.map(client => (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => handleSelectClient(client)}
                                            className="w-full px-4 py-3 text-right hover:bg-mist transition-colors border-b last:border-b-0 border-border"
                                        >
                                            <div className="font-black text-ink">{client.name}</div>
                                            <div className="text-xs text-muted mt-1 dir-ltr">
                                                {client.phone || 'بدون رقم'} {client.qr_id ? `— ${client.qr_id}` : ''}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedClient && (
                                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-ink truncate">{selectedClient.name}</p>
                                            <p className="text-xs text-muted dir-ltr">
                                                {selectedClient.phone || 'بدون رقم'} {selectedClient.qr_id ? `— ${selectedClient.qr_id}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClient(null);
                                            setClientSearch('');
                                        }}
                                        className="text-xs font-black text-danger hover:underline"
                                    >
                                        تغيير
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    نوع الحصة *
                                </label>
                                <select
                                    value={form.session_type_id}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const found = sessionTypes.find(s => String(s.id) === value);
                                        setForm(prev => ({
                                            ...prev,
                                            session_type_id: value,
                                            unit_price: found ? fromCents(found.default_price) : prev.unit_price,
                                        }));
                                    }}
                                    disabled={sessionTypesLoading}
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                >
                                    <option value="">اختر نوع الحصة</option>
                                    {sessionTypes.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    ربط بباقـة (اختياري)
                                </label>
                                <select
                                    value={form.subscription_type_id}
                                    onChange={set('subscription_type_id')}
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                >
                                    <option value="">بدون باقة</option>
                                    {subscriptionTypes.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    <Hash size={11} className="inline ml-1" />
                                    عدد الحصص
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.sessions_count}
                                    onChange={set('sessions_count')}
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    <BadgeDollarSign size={11} className="inline ml-1" />
                                    سعر الحصة
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.unit_price}
                                    onChange={set('unit_price')}
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-success focus:bg-white transition-all font-black text-success outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    <Percent size={11} className="inline ml-1" />
                                    الخصم
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.discount_amount}
                                    onChange={set('discount_amount')}
                                    placeholder="0"
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                    المدفوع
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.paid_amount}
                                    onChange={set('paid_amount')}
                                    placeholder={net ? String(net) : '0'}
                                    className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                        focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                                ملاحظات
                            </label>
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={set('notes')}
                                placeholder="مثلاً: حصة يوم الجمعة / خصم خاص / مدفوع جزئي"
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-medium text-ink outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-mist rounded-2xl p-4 border border-border">
                                <p className="text-[10px] text-muted font-black uppercase tracking-wider">الإجمالي</p>
                                <p className="text-xl font-black text-ink mt-1">
                                    {gross.toLocaleString('ar-EG')} <span className="text-xs text-muted">ج.م</span>
                                </p>
                            </div>

                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/15">
                                <p className="text-[10px] text-primary font-black uppercase tracking-wider">الصافي</p>
                                <p className="text-xl font-black text-primary mt-1">
                                    {net.toLocaleString('ar-EG')} <span className="text-xs text-muted">ج.م</span>
                                </p>
                            </div>

                            <div className="bg-danger/5 rounded-2xl p-4 border border-danger/15">
                                <p className="text-[10px] text-danger font-black uppercase tracking-wider">المتبقي</p>
                                <p className="text-xl font-black text-danger mt-1">
                                    {remaining.toLocaleString('ar-EG')} <span className="text-xs text-muted">ج.م</span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl
                                font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all
                                active:scale-95 disabled:opacity-60"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            تأكيد وتسجيل الحصة
                        </button>
                    </form>
                </div>

                <div className="xl:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-mist border-b border-border flex items-center justify-between">
                        <h2 className="font-black text-ink flex items-center gap-2">
                            <CalendarDays size={16} className="text-primary" />
                            آخر الحصص المسجلة
                        </h2>
                    </div>

                    <div className="divide-y divide-border max-h-[850px] overflow-y-auto">
                        {historyLoading ? (
                            <div className="p-8 text-center text-muted font-bold">جاري التحميل...</div>
                        ) : history.length === 0 ? (
                            <div className="p-10 text-center text-muted">
                                لا يوجد سجل حصص حتى الآن
                            </div>
                        ) : history.map(item => (
                            <div key={item.id} className="p-4 hover:bg-mist/40 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-black text-ink truncate">
                                            {item.client?.name || 'عميل'}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            {item.session_type?.name || 'نوع غير محدد'}
                                            {item.subscription_type?.name ? ` — ${item.subscription_type.name}` : ''}
                                        </p>
                                    </div>

                                    <div className="text-left shrink-0">
                                        <p className="font-black text-success">
                                            {fromCents(item.total_amount).toLocaleString('ar-EG')} ج.م
                                        </p>
                                        <p className="text-[11px] text-muted mt-1">
                                            {item.status === 'paid' ? 'مدفوع' :
                                             item.status === 'partial' ? 'جزئي' :
                                             item.status === 'pending' ? 'معلق' : 'ملغي'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div className="bg-mist rounded-xl px-3 py-2">
                                        <span className="text-muted">عدد الحصص:</span>{' '}
                                        <span className="font-black text-ink">{item.sessions_count}</span>
                                    </div>
                                    <div className="bg-mist rounded-xl px-3 py-2">
                                        <span className="text-muted">سعر الحصة:</span>{' '}
                                        <span className="font-black text-ink">
                                            {fromCents(item.unit_price).toLocaleString('ar-EG')}
                                        </span>
                                    </div>
                                    <div className="bg-mist rounded-xl px-3 py-2">
                                        <span className="text-muted">الخصم:</span>{' '}
                                        <span className="font-black text-ink">
                                            {fromCents(item.discount_amount).toLocaleString('ar-EG')}
                                        </span>
                                    </div>
                                    <div className="bg-mist rounded-xl px-3 py-2">
                                        <span className="text-muted">التاريخ:</span>{' '}
                                        <span className="font-black text-ink">
                                            {item.created_at ? new Date(item.created_at).toLocaleString('ar-EG') : '-'}
                                        </span>
                                    </div>
                                </div>

                                {item.notes && (
                                    <p className="text-xs text-muted mt-3 leading-6">
                                        {item.notes}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
