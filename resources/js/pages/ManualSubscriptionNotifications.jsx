import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import {
    Bell,
    Clock3,
    AlertTriangle,
    ExternalLink,
    CheckCircle2,
    RefreshCw,
    Eye,
    EyeOff,
    Search,
} from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('ar-EG');
};

function SectionCard({
    title,
    icon: Icon,
    tone,
    items,
    onSend,
    processingId,
    search,
}) {
    const filtered = items.filter((i) =>
        `${i.client_name ?? ''} ${i.client_phone ?? ''} ${i.client_qr_id ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                    tone === 'danger'
                        ? 'bg-rose-50 border-rose-100'
                        : 'bg-amber-50 border-amber-100'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Icon
                        size={18}
                        className={
                            tone === 'danger'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                        }
                    />
                    <h2 className="font-black text-slate-800">{title}</h2>
                </div>
                <span className="text-xs font-black text-slate-500">
                    {filtered.length}
                </span>
            </div>

            <div className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold">
                        لا توجد عناصر
                    </div>
                ) : (
                    filtered.map((item) => (
                        <div
                            key={item.id}
                            className={`p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                                item.manual_notified ? 'bg-emerald-50/60' : ''
                            }`}
                        >
                            <div className="space-y-1">
                                <div className="font-black text-slate-800">
                                    {item.client_name}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {item.client_phone || 'بدون رقم'}
                                </div>
                                <div className="text-xs text-slate-500">
                                    الاشتراك:{' '}
                                    {item.subscription_type || '—'} | ينتهي:{' '}
                                    {formatDate(item.end_date)}
                                </div>
                                <div className="text-xs font-bold">
                                    {item.status_group === 'expired' ? (
                                        <span className="text-rose-600">
                                            منتهي
                                        </span>
                                    ) : (
                                        <span className="text-amber-600">
                                            {item.days_diff === 0
                                                ? 'ينتهي اليوم'
                                                : `ينتهي خلال ${item.days_diff} يوم`}
                                        </span>
                                    )}
                                </div>
                                {item.manual_notified_at && (
                                    <div className="text-xs text-emerald-600 font-bold">
                                        تم الإرسال:{' '}
                                        {new Date(
                                            item.manual_notified_at
                                        ).toLocaleString('ar-EG')}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={item.wa_url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`px-4 py-2 rounded-2xl text-sm font-black border transition ${
                                        item.wa_url
                                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                            : 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <ExternalLink size={15} />
                                        فتح واتساب
                                    </span>
                                </a>

                                <button
                                    onClick={() => onSend(item)}
                                    disabled={
                                        processingId === item.id ||
                                        !item.client_phone
                                    }
                                    className={`px-4 py-2 rounded-2xl text-sm font-black transition ${
                                        item.manual_notified
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 text-white hover:bg-black'
                                    } disabled:opacity-50`}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <CheckCircle2 size={15} />
                                        {processingId === item.id
                                            ? 'جارٍ التسجيل...'
                                            : item.manual_notified
                                            ? 'تم الإرسال'
                                            : 'تأكيد الإرسال'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function ManualSubscriptionNotifications() {
    const [data, setData] = useState({
        expired: [],
        expiring_soon: [],
        gym_name: 'GymOS',
    });
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [showSent, setShowSent] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/manual-subscription-notifications', {
                params: { show_sent: showSent ? 1 : 0 },
            });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('فشل تحميل تنبيهات الاشتراكات');
        } finally {
            setLoading(false);
        }
    }, [showSent]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSend = async (item) => {
        if (!item.client_phone) {
            toast.error('لا يوجد رقم هاتف لهذا العميل');
            return;
        }

        setProcessingId(item.id);

        const message =
            item.status_group === 'expired'
                ? `أهلاً ${item.client_name} 🌟\nنحب نفكرك إن اشتراكك في ${data.gym_name} انتهى بتاريخ ${item.end_date}.\nمستنيينك ترجع تكمل تمرينك معنا 💪\nكلّمنا لتجديد الاشتراك.`
                : `أهلاً ${item.client_name} 🌟\nاشتراكك في ${data.gym_name} هينتهي بتاريخ ${item.end_date}.\nجدده بدري وكمل على نفس الحماس 🔥\nنورتنا دائمًا.`;

        try {
            await api.post(
                `/manual-subscription-notifications/${item.id}/mark-as-sent`,
                { message }
            );

            if (item.wa_url) {
                window.open(item.wa_url, '_blank');
            }

            toast.success('تم تسجيل الإرسال وفتح واتساب');
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error('فشل تسجيل الإرسال');
        } finally {
            setProcessingId(null);
        }
    };

    const stats = useMemo(
        () => ({
            expired: data.expired?.length ?? 0,
            expiring: data.expiring_soon?.length ?? 0,
        }),
        [data]
    );

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-4 pb-10" dir="rtl">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black px-3 py-1 rounded-full bg-primary/10 text-primary mb-2">
                        <Bell size={14} />
                        Manual WhatsApp
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">
                        تنبيهات الاشتراكات اليدوية
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        عرض الاشتراكات المنتهية والتي ستنتهي خلال 3 أيام مع تتبع الإرسال اليدوي.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-bold border border-slate-200"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <RefreshCw
                                size={15}
                                className={loading ? 'animate-spin' : ''}
                            />
                            تحديث
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setShowSent((prev) => !prev)
                        }
                        className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-bold border border-slate-200"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            {showSent ? (
                                <EyeOff size={15} />
                            ) : (
                                <Eye size={15} />
                            )}
                            {showSent
                                ? 'إخفاء المرسل'
                                : 'إظهار المرسل'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5">
                    <div className="text-xs font-black text-rose-600 mb-1">
                        المنتهية
                    </div>
                    <div className="text-2xl font-black text-rose-700">
                        {stats.expired}
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
                    <div className="text-xs font-black text-amber-600 mb-1">
                        ستنتهي خلال 3 أيام
                    </div>
                    <div className="text-2xl font-black text-amber-700">
                        {stats.expiring}
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5">
                    <div className="text-xs font-black text-slate-500 mb-1">
                        الجيم
                    </div>
                    <div className="text-lg font-black text-slate-800">
                        {data.gym_name}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
                <div className="relative">
                    <Search
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو الهاتف أو QR"
                        className="w-full pr-10 pl-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none"
                    />
                </div>
            </div>

            <SectionCard
                title="اشتراكات منتهية"
                icon={AlertTriangle}
                tone="danger"
                items={data.expired ?? []}
                onSend={handleSend}
                processingId={processingId}
                search={search}
            />

            <SectionCard
                title="ستنتهي خلال 3 أيام"
                icon={Clock3}
                tone="warning"
                items={data.expiring_soon ?? []}
                onSend={handleSend}
                processingId={processingId}
                search={search}
            />
        </div>
    );
}
