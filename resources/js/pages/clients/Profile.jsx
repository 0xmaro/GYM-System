import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    UserCircle,
    ArrowRight,
    PlusCircle,
    Snowflake,
    PlayCircle,
    AlertCircle,
    Calendar,
    CreditCard,
    ClipboardList,
    Clock,
    Smartphone,
    MapPin,
    UserCheck,
    Edit3,
    Settings2,
    TrendingUp,
    MessageCircle,
    Send,
    Loader2,
    X,
    CheckCircle,
    Bell,
    Banknote,
    FileText,
    Shield,
    Wallet,
    BadgeInfo,
} from 'lucide-react';

/* helpers */
const money = (value) => String(Number(value ?? 0));
const num = (value) => Number(value ?? 0);
const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('ar-EG');
};
const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('ar-EG');
};
const formatStatus = (status) => {
    switch (status) {
        case 'active':
            return 'نشط';
        case 'frozen':
            return 'مجمّد';
        case 'expired':
            return 'منتهي';
        case 'pending':
            return 'معلّق';
        case 'paid':
            return 'مدفوع';
        case 'cancelled':
            return 'ملغي';
        default:
            return status ?? '—';
    }
};

const statusClasses = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    frozen: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-orange-50 text-orange-700 border-orange-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const WA_TEMPLATES = {
    custom: () => ``,
    frozen_notice: (name, until, reason) =>
        `مرحباً ${name} 👋\n\nتم تجميد اشتراكك في صالة MyGym مؤقتاً حتى تاريخ *${until}*.\nالسبب: ${reason ?? 'ظروف خاصة'}.\n\nنتمنى لك السلامة، سنكون بانتظارك.`,
    expiry_reminder: (name, endDate, daysLeft) =>
        `مرحباً ${name} 👋\n\nاشتراكك في صالة MyGym سينتهي خلال *${daysLeft} يوم* (${endDate}).\n\nجدد الآن واستمر في رحلتك الرياضية 💪`,
    attendance_summary: (name, count, lastVisit) =>
        `مرحباً ${name} 👋\n\nملخص نشاطك:\nإجمالي الحضور: *${count}*\nآخر زيارة: *${lastVisit}*\n\nاستمر يا بطل 💪`,
    debt_reminder: (name, amount) =>
        `مرحباً ${name} 👋\n\nيوجد على حسابك مبلغ مستحق *${amount} ج.م*.\n\nيرجى التسوية في أقرب فرصة، شكراً لتعاونك.`,
    welcome: (name) =>
        `أهلاً وسهلاً ${name} 🎉\n\nنرحب بك في MyGym، ونتمنى لك رحلة موفقة ومليئة بالإنجازات.`,
};

const WA_TEMPLATE_OPTIONS = [
    { key: 'custom', label: 'رسالة مخصصة', icon: MessageCircle },
    { key: 'frozen_notice', label: 'إشعار التجميد', icon: Snowflake },
    { key: 'expiry_reminder', label: 'تذكير انتهاء الاشتراك', icon: Bell },
    { key: 'attendance_summary', label: 'ملخص الحضور', icon: UserCheck },
    { key: 'debt_reminder', label: 'تذكير المديونية', icon: Banknote },
    { key: 'welcome', label: 'رسالة ترحيب', icon: CheckCircle },
];

function SectionCard({ title, icon: Icon, children, action = null }) {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-sky-700" />}
                    <h2 className="text-sm md:text-base font-black text-slate-900">{title}</h2>
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }) {
    const tones = {
        default: 'from-slate-50 to-white border-slate-200 text-slate-900',
        success: 'from-emerald-50 to-white border-emerald-100 text-emerald-700',
        warning: 'from-amber-50 to-white border-amber-100 text-amber-700',
        danger: 'from-rose-50 to-white border-rose-100 text-rose-700',
        primary: 'from-sky-50 to-white border-sky-100 text-sky-700',
    };

    return (
        <div className={`rounded-3xl border bg-gradient-to-br p-5 ${tones[tone] ?? tones.default}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                    <Icon size={20} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black leading-none tabular-nums">{value}</p>
            {sub ? <p className="text-xs mt-2 text-slate-500 font-bold">{sub}</p> : null}
        </div>
    );
}

function EmptyState({ icon: Icon, title, hint }) {
    return (
        <div className="py-14 flex flex-col items-center justify-center text-center gap-3 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Icon size={28} />
            </div>
            <p className="font-black text-slate-600">{title}</p>
            {hint ? <p className="text-sm font-medium">{hint}</p> : null}
        </div>
    );
}

function WhatsAppModal({ profile, onClose }) {
    const client = profile?.client;
    const activeSub =
        profile?.subscriptions?.find((s) => s.status === 'active' || s.status === 'frozen') ?? null;

    const [selectedTemplate, setSelectedTemplate] = useState('custom');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const totalDebt = profile?.summary?.active_debts_total ?? 0;
    const attendanceCount = profile?.summary?.attendance_count ?? 0;

    const applyTemplate = useCallback(
        (key) => {
            setSelectedTemplate(key);
            if (!client) return;

            const name = client.name;
            const daysLeft = activeSub?.days_remaining ?? 0;
            const lastVisit =
                profile?.attendance?.[0]?.check_in_at
                    ? formatDateTime(profile.attendance[0].check_in_at)
                    : 'غير محدد';

            switch (key) {
                case 'custom':
                    setMessage('');
                    break;
                case 'frozen_notice':
                    setMessage(
                        WA_TEMPLATES.frozen_notice(
                            name,
                            activeSub?.frozen_until ?? activeSub?.end_date ?? '—',
                            activeSub?.freeze_reason
                        )
                    );
                    break;
                case 'expiry_reminder':
                    setMessage(
                        WA_TEMPLATES.expiry_reminder(
                            name,
                            activeSub?.end_date ?? '—',
                            Math.max(0, daysLeft)
                        )
                    );
                    break;
                case 'attendance_summary':
                    setMessage(WA_TEMPLATES.attendance_summary(name, attendanceCount, lastVisit));
                    break;
                case 'debt_reminder':
                    setMessage(WA_TEMPLATES.debt_reminder(name, money(totalDebt)));
                    break;
                case 'welcome':
                    setMessage(WA_TEMPLATES.welcome(name));
                    break;
                default:
                    setMessage('');
                    break;
            }
        },
        [client, activeSub, profile, attendanceCount, totalDebt]
    );

    useEffect(() => {
        applyTemplate(selectedTemplate);
    }, [selectedTemplate, applyTemplate]);

    const handleSend = async () => {
        if (!message.trim()) {
            toast.error('اكتب رسالة أولاً');
            return;
        }

        const phone = client?.phone?.replace(/\D/g, '');
        if (!phone) {
            toast.error('رقم الهاتف غير صحيح');
            return;
        }

        setSending(true);
        try {
            await api
                .post('/whatsapp/log', {
                    client_id: client.id,
                    template: selectedTemplate,
                    message,
                })
                .catch(() => {});

            const encoded = encodeURIComponent(message);
            const intlPhone = phone.startsWith('0') ? `2${phone}` : phone;
            window.open(`https://wa.me/${intlPhone}?text=${encoded}`, '_blank');
            toast.success('تم فتح WhatsApp ✅');
            onClose();
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-[#25D366] text-white">
                    <div>
                        <p className="font-black text-sm">إرسال WhatsApp</p>
                        <p className="text-xs text-white/80 font-medium">
                            {client?.name} — {client?.phone}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2">
                            اختر نوع الرسالة
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {WA_TEMPLATE_OPTIONS.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedTemplate(key)}
                                    className={`rounded-2xl border p-3 text-center transition-all flex flex-col items-center gap-2 font-bold text-xs ${
                                        selectedTemplate === key
                                            ? 'border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E]'
                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#25D366]/30'
                                    }`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2">
                            نص الرسالة
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                            dir="rtl"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366]/40"
                            placeholder="اكتب الرسالة هنا..."
                        />
                        <p className="text-[11px] text-slate-400 mt-2 text-left">{message.length} حرف</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#179b52] text-white font-black flex items-center justify-center gap-2 transition disabled:opacity-60"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        فتح WhatsApp وإرسال
                    </button>
                </div>
            </div>
        </div>
    );
}

function FreezeModal({ profile, onClose, onConfirm }) {
    const activeSub =
        profile?.subscriptions?.find((s) => s.status === 'active' || s.status === 'frozen') ?? null;

    const [days, setDays] = useState(7);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const maxFreeze = activeSub?.subscription_type?.max_freeze_days ?? 30;
    const usedFreeze = activeSub?.freeze_days_count ?? 0;
    const remaining = Math.max(0, maxFreeze - usedFreeze);

    useEffect(() => {
        if (remaining > 0 && days > remaining) setDays(remaining);
    }, [remaining, days]);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast.error('اكتب سبب التجميد');
            return;
        }
        if (remaining <= 0) {
            toast.error('لا توجد أيام تجميد متاحة');
            return;
        }
        if (days > remaining) {
            toast.error(`الحد المتاح ${remaining} يوم فقط`);
            return;
        }

        setLoading(true);
        try {
            await onConfirm(days, reason);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Snowflake size={18} />
                        <p className="font-black text-sm">تجميد الاشتراك</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 font-bold">
                        المتاح للتجميد: {remaining} يوم
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2">
                            عدد أيام التجميد
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={1}
                                max={Math.max(1, remaining)}
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                                className="flex-1 accent-amber-500"
                                disabled={remaining <= 0}
                            />
                            <div className="w-16 text-center rounded-xl bg-slate-50 border border-slate-200 py-2 font-black text-slate-800">
                                {days}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2">
                            سبب التجميد
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            dir="rtl"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
                            placeholder="سفر، إصابة، ظروف خاصة..."
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !reason.trim() || remaining <= 0}
                        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center justify-center gap-2 transition disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Snowflake size={16} />}
                        تأكيد التجميد
                    </button>
                </div>
            </div>
        </div>
    );
}

const Skeleton = () => (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse space-y-5">
        <div className="h-44 rounded-[2.5rem] bg-slate-100" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="h-32 rounded-[2rem] bg-slate-100" />
            <div className="h-32 rounded-[2rem] bg-slate-100" />
            <div className="h-32 rounded-[2rem] bg-slate-100" />
            <div className="h-32 rounded-[2rem] bg-slate-100" />
        </div>
        <div className="h-96 rounded-[2rem] bg-slate-100" />
    </div>
);

export default function ClientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showWA, setShowWA] = useState(false);
    const [showFreeze, setShowFreeze] = useState(false);

    const fetchClientProfile = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/clients/${id}/profile`);
            setProfile(res.data);
        } catch (error) {
            toast.error(error?.response?.data?.message ?? 'حدث خطأ أثناء جلب بيانات العضو');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchClientProfile();
    }, [fetchClientProfile]);

    const client = profile?.client ?? null;
    const summary = profile?.summary ?? {};
    const subscriptions = profile?.subscriptions ?? [];
    const attendance = profile?.attendance ?? [];
    const debts = profile?.debts ?? [];

    const activeSub = useMemo(
        () => subscriptions.find((s) => s.status === 'active' || s.status === 'frozen') ?? null,
        [subscriptions]
    );

    const statusMeta = {
        active: {
            bar: 'bg-emerald-500',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            label: 'نشط',
        },
        frozen: {
            bar: 'bg-amber-500',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            label: 'مجمّد',
        },
        expired: {
            bar: 'bg-rose-500',
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            label: 'منتهي',
        },
    }[client?.status] ?? {
        bar: 'bg-slate-300',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        label: formatStatus(client?.status),
    };

    const handleFreeze = async (days, reason) => {
        try {
            await api.post(`/clients/${id}/freeze`, {
                freeze_days: days,
                reason,
            });
            toast.success('تم تجميد الاشتراك بنجاح ❄️');
            fetchClientProfile();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'فشل التجميد');
            throw err;
        }
    };

    const handleUnfreeze = async () => {
        if (!window.confirm('هل تريد فك التجميد الآن؟')) return;
        try {
            const res = await api.post(`/clients/${id}/unfreeze`);
            const extra = res?.data?.extra_days;
            toast.success(`تم فك التجميد بنجاح${extra ? ` — وتم تمديد ${extra} يوم` : ''}`);
            fetchClientProfile();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'فشل فك التجميد');
        }
    };

    if (loading) return <Skeleton />;

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4 text-rose-600">
                <AlertCircle size={52} className="opacity-40" />
                <p className="font-black text-lg">العضو غير موجود</p>
                <button
                    onClick={() => navigate('/clients')}
                    className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:underline"
                >
                    <ArrowRight size={14} />
                    العودة لقائمة العملاء
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 pb-10 pt-4 space-y-5">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className={`h-1.5 w-full ${statusMeta.bar}`} />
                <div className="p-6 flex flex-col xl:flex-row gap-6 xl:items-center">
                    <div className="flex items-start gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="shrink-0 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                            <ArrowRight size={18} />
                        </button>

                        <div className="relative shrink-0">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center">
                                {client.photo_url ? (
                                    <img
                                        src={client.photo_url}
                                        alt={client.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserCircle size={76} className="text-slate-300" />
                                )}
                            </div>
                            <div
                                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${
                                    client.gender === 'female' ? 'bg-pink-400' : 'bg-sky-400'
                                }`}
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 text-center xl:text-right">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-3">
                            <h1 className="text-2xl font-black text-slate-900 truncate">{client.name}</h1>
                            <span
                                className={`inline-flex self-center xl:self-auto items-center justify-center px-3 py-1 rounded-full text-[11px] font-black border ${statusMeta.badge}`}
                            >
                                {statusMeta.label}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center xl:justify-start">
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                                <Smartphone size={13} />
                                <span dir="ltr">{client.phone}</span>
                            </span>

                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-xs font-black text-sky-700">
                                <CreditCard size={13} />
                                {client.qr_id}
                            </span>

                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                                <BadgeInfo size={13} />
                                {client.gender === 'female' ? 'أنثى' : 'ذكر'}
                            </span>

                            {client.age ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                                    العمر: {client.age}
                                </span>
                            ) : null}

                            {client.address ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                                    <MapPin size={13} />
                                    {client.address}
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-4 text-xs text-slate-500 font-bold flex flex-wrap gap-x-4 gap-y-2 justify-center xl:justify-start">
                            <span>آخر زيارة: {formatDateTime(client.last_visit_at)}</span>
                            <span>تاريخ الإضافة: {formatDate(client.created_at)}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowWA(true)}
                            className="p-3 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition"
                            title="WhatsApp"
                        >
                            <MessageCircle size={18} />
                        </button>

                        <Link
                            to={`/clients/${id}/edit`}
                            className="p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition"
                            title="تعديل"
                        >
                            <Edit3 size={18} />
                        </Link>

                        <Link
                            to={`/clients/${id}/subscribe`}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm transition"
                        >
                            <PlusCircle size={18} />
                            تجديد / اشتراك جديد
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    icon={UserCheck}
                    label="إجمالي الحضور"
                    value={summary.attendance_count ?? 0}
                    sub="كل الزيارات المسجلة"
                    tone="primary"
                />
                <StatCard
                    icon={CreditCard}
                    label="الاشتراكات"
                    value={summary.subscriptions_count ?? subscriptions.length}
                    sub={activeSub ? `الحالي: ${activeSub.subscription_type?.label || activeSub.subscription_type?.name || '—'}` : 'لا يوجد اشتراك فعال'}
                    tone="default"
                />
                <StatCard
                    icon={Banknote}
                    label="المديونية"
                    value={money(summary.active_debts_total ?? 0)}
                    sub={`عدد المديونيات المفتوحة: ${summary.active_debts_count ?? 0}`}
                    tone={num(summary.active_debts_total) > 0 ? 'danger' : 'success'}
                />
                <StatCard
                    icon={Calendar}
                    label="الأيام المتبقية"
                    value={activeSub ? Math.max(-999, num(activeSub.days_remaining)) : '—'}
                    sub={activeSub ? `ينتهي في ${formatDate(activeSub.end_date)}` : 'لا يوجد اشتراك فعال'}
                    tone={activeSub?.status === 'frozen' ? 'warning' : 'success'}
                />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex flex-wrap gap-2">
                    {[
                        { id: 'overview', label: 'نظرة عامة', icon: Shield },
                        { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCard },
                        { id: 'attendance', label: 'الحضور', icon: UserCheck },
                        { id: 'debts', label: 'الديون', icon: Wallet },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs md:text-sm font-black transition ${
                                activeTab === tab.id
                                    ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <div className="xl:col-span-2 space-y-5">
                                <SectionCard
                                    title="الاشتراك الحالي"
                                    icon={TrendingUp}
                                    action={
                                        activeSub ? (
                                            <div className="flex flex-wrap gap-2">
                                                {activeSub.status === 'active' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowFreeze(true)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-black text-xs hover:bg-amber-100"
                                                    >
                                                        <Snowflake size={14} />
                                                        تجميد
                                                    </button>
                                                ) : null}

                                                {activeSub.status === 'frozen' ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleUnfreeze}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs hover:bg-emerald-100"
                                                    >
                                                        <PlayCircle size={14} />
                                                        إنهاء التجميد
                                                    </button>
                                                ) : null}

                                                <Link
                                                    to={`/clients/${id}/subscriptions/${activeSub.id}/contract`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-black text-xs hover:bg-sky-100"
                                                >
                                                    <FileText size={14} />
                                                    عرض العقد
                                                </Link>
                                                <Link
    to={`/clients/${id}/subscriptions/${activeSub.id}/edit`}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 font-black text-xs hover:bg-slate-100 transition"
>
    <Settings2 size={14} />
    تعديل
</Link>
                                            </div>
                                        ) : null
                                    }
                                >
                                    {activeSub ? (
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-[11px] text-slate-500 font-black mb-2">اسم الباقة</p>
                                                <p className="font-black text-slate-900 text-lg">
                                                    {activeSub.subscription_type?.label ||
                                                        activeSub.subscription_type?.name ||
                                                        '—'}
                                                </p>
                                                <p className="text-xs text-slate-500 font-bold mt-2">
                                                    المدة: {activeSub.subscription_type?.duration_days ?? '—'} يوم
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-[11px] text-slate-500 font-black mb-2">حالة الاشتراك</p>
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-black border ${
                                                        statusClasses[activeSub.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    {formatStatus(activeSub.status)}
                                                </span>
                                                <p className="text-xs text-slate-500 font-bold mt-3">
                                                    البداية: {formatDate(activeSub.start_date)}
                                                </p>
                                                <p className="text-xs text-slate-500 font-bold mt-1">
                                                    النهاية: {formatDate(activeSub.end_date)}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-[11px] text-slate-500 font-black mb-2">الماليات</p>
                                                <div className="space-y-2 text-sm font-bold text-slate-700">
                                                    <p>المدفوع: {money(activeSub.amount_paid)}</p>
                                                    <p>الخصم: {money(activeSub.discount_amount)}</p>
                                                    <p>
                                                        السعر الأصلي:{' '}
                                                        {money(activeSub.subscription_type?.price ?? 0)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-[11px] text-slate-500 font-black mb-2">الحضور والمتبقي</p>
                                                <div className="space-y-2 text-sm font-bold text-slate-700">
                                                    <p>إجمالي حضور الباقة: {activeSub.attendance_count ?? 0}</p>
                                                    <p>
                                                        الحصص المتبقية:{' '}
                                                        {activeSub.sessions_remaining ?? 'غير محدد'}
                                                    </p>
                                                    <p>الأيام المتبقية: {activeSub.days_remaining ?? '—'}</p>
                                                </div>
                                            </div>

                                            {activeSub.status === 'frozen' && (
                                                <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                                                    <p className="font-black mb-1">الاشتراك مجمّد</p>
                                                    <p className="text-sm font-bold">
                                                        حتى: {formatDate(activeSub.frozen_until)}
                                                    </p>
                                                    {activeSub.freeze_reason ? (
                                                        <p className="text-sm font-bold mt-1">
                                                            السبب: {activeSub.freeze_reason}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={CreditCard}
                                            title="لا يوجد اشتراك فعال"
                                            hint="قم بإنشاء اشتراك جديد أو تجديد الاشتراك للعميل"
                                        />
                                    )}
                                </SectionCard>

                                <SectionCard title="آخر الحضور" icon={Clock}>
                                    {attendance.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm" dir="rtl">
                                                <thead>
                                                    <tr className="text-slate-500 text-[11px] uppercase border-b border-slate-100">
                                                        <th className="p-3 text-right font-black">التاريخ</th>
                                                        <th className="p-3 text-right font-black">الوقت</th>
                                                        <th className="p-3 text-right font-black">النوع</th>
                                                        <th className="p-3 text-right font-black">ملاحظات</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attendance.slice(0, 8).map((row) => {
                                                        const date = new Date(row.check_in_at);
                                                        return (
                                                            <tr
                                                                key={row.id}
                                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                                            >
                                                                <td className="p-3 font-bold text-slate-800">
                                                                    {formatDate(row.check_in_at)}
                                                                </td>
                                                                <td className="p-3 font-bold text-slate-500">
                                                                    {!Number.isNaN(date.getTime())
                                                                        ? date.toLocaleTimeString('ar-EG', {
                                                                              hour: '2-digit',
                                                                              minute: '2-digit',
                                                                          })
                                                                        : '—'}
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className="inline-flex px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-black">
                                                                        {row.type === 'qr'
                                                                            ? 'QR'
                                                                            : row.type === 'manual'
                                                                            ? 'يدوي'
                                                                            : row.type}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-medium text-slate-500">
                                                                    {row.notes ?? '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={UserCheck}
                                            title="لا يوجد حضور مسجل"
                                            hint="سيظهر هنا آخر حضور للعميل"
                                        />
                                    )}
                                </SectionCard>
                            </div>

                            <div className="space-y-5">
                                <SectionCard title="معلومات سريعة" icon={Shield}>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <span className="text-slate-500 font-bold">الاسم</span>
                                            <span className="font-black text-slate-900">{client.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <span className="text-slate-500 font-bold">الهاتف</span>
                                            <span className="font-black text-slate-900" dir="ltr">
                                                {client.phone}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <span className="text-slate-500 font-bold">QR</span>
                                            <span className="font-black text-slate-900">{client.qr_id}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <span className="text-slate-500 font-bold">الحالة</span>
                                            <span className="font-black text-slate-900">
                                                {formatStatus(client.status)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                            <span className="text-slate-500 font-bold">العنوان</span>
                                            <span className="font-black text-slate-900">
                                                {client.address || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="الديون الحالية" icon={Wallet}>
                                    {debts.filter((d) => d.status === 'pending').length > 0 ? (
                                        <div className="space-y-3">
                                            {debts
                                                .filter((d) => d.status === 'pending')
                                                .map((debt) => (
                                                    <div
                                                        key={debt.id}
                                                        className="rounded-2xl border border-rose-100 bg-rose-50 p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-black text-rose-700">
                                                                    مبلغ مستحق
                                                                </p>
                                                                <p className="text-xs text-rose-600 font-bold mt-1">
                                                                    الاستحقاق: {formatDate(debt.due_date)}
                                                                </p>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-xl font-black text-rose-700">
                                                                    {money(debt.amount)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-rose-700 font-medium mt-3">
                                                            {debt.reason}
                                                        </p>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={Banknote}
                                            title="لا توجد ديون حالية"
                                            hint="حساب العميل سليم حالياً"
                                        />
                                    )}
                                </SectionCard>
                            </div>
                        </div>
                    )}

                    {activeTab === 'subscriptions' && (
                        <div className="space-y-4">
                            {subscriptions.length > 0 ? (
                                subscriptions.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="rounded-[1.75rem] border border-slate-200 bg-white p-5 hover:shadow-sm transition"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700">
                                                    <CreditCard size={20} />
                                                </div>

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-black text-slate-900 text-lg">
                                                            {sub.subscription_type?.label ||
                                                                sub.subscription_type?.name ||
                                                                'اشتراك'}
                                                        </p>
                                                        <span
                                                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black border ${
                                                                statusClasses[sub.status] ??
                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            {formatStatus(sub.status)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">بداية</p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {formatDate(sub.start_date)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">نهاية</p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {formatDate(sub.end_date)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">
                                                                إجمالي الحضور
                                                            </p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {sub.attendance_count ?? 0}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">
                                                                الأيام المتبقية
                                                            </p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {sub.days_remaining ?? '—'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                                                            <p className="text-emerald-700 font-bold text-xs">المدفوع</p>
                                                            <p className="font-black text-emerald-700 text-lg mt-1">
                                                                {money(sub.amount_paid)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                                                            <p className="text-amber-700 font-bold text-xs">الخصم</p>
                                                            <p className="font-black text-amber-700 text-lg mt-1">
                                                                {money(sub.discount_amount)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">
                                                                الحصص المتبقية
                                                            </p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {sub.sessions_remaining ?? 'غير محدد'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                                            <p className="text-slate-500 font-bold text-xs">
                                                                آخر حضور
                                                            </p>
                                                            <p className="font-black text-slate-900 mt-1">
                                                                {formatDateTime(sub.last_attendance_at)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {(sub.freeze_days_count > 0 || sub.freeze_reason) && (
                                                        <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
                                                            <p className="font-black">
                                                                التجميد المستخدم: {sub.freeze_days_count ?? 0} يوم
                                                            </p>
                                                            {sub.freeze_reason ? (
                                                                <p className="font-bold mt-1">
                                                                    السبب: {sub.freeze_reason}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex lg:flex-col gap-2 shrink-0">
                                                <Link
                                                    to={`/clients/${id}/subscriptions/${sub.id}/contract`}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-black text-sm"
                                                >
                                                    <FileText size={16} />
                                                    العقد
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={CreditCard}
                                    title="لا يوجد سجل اشتراكات"
                                    hint="سيظهر هنا تاريخ اشتراكات العميل بالكامل"
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <SectionCard title="سجل الحضور" icon={ClipboardList}>
                            {attendance.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm" dir="rtl">
                                        <thead>
                                            <tr className="text-slate-500 text-[11px] uppercase border-b border-slate-100">
                                                <th className="p-3 text-right font-black">التاريخ</th>
                                                <th className="p-3 text-right font-black">الوقت</th>
                                                <th className="p-3 text-right font-black">النوع</th>
                                                <th className="p-3 text-right font-black">قبل</th>
                                                <th className="p-3 text-right font-black">بعد</th>
                                                <th className="p-3 text-right font-black">ملاحظات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.map((row) => {
                                                const date = new Date(row.check_in_at);
                                                return (
                                                    <tr
                                                        key={row.id}
                                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                                    >
                                                        <td className="p-3 font-bold text-slate-800">
                                                            {formatDate(row.check_in_at)}
                                                        </td>
                                                        <td className="p-3 font-bold text-slate-500">
                                                            {!Number.isNaN(date.getTime())
                                                                ? date.toLocaleTimeString('ar-EG', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                  })
                                                                : '—'}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="inline-flex px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-black">
                                                                {row.type === 'qr'
                                                                    ? 'QR'
                                                                    : row.type === 'manual'
                                                                    ? 'يدوي'
                                                                    : row.type}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-black text-slate-700">
                                                            {row.sessions_before ?? '—'}
                                                        </td>
                                                        <td className="p-3 font-black text-slate-700">
                                                            {row.sessions_after ?? '—'}
                                                        </td>
                                                        <td className="p-3 font-medium text-slate-500">
                                                            {row.notes ?? '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={UserCheck}
                                    title="لا يوجد حضور حتى الآن"
                                    hint="بمجرد تسجيل الحضور سيظهر هنا بالتفصيل"
                                />
                            )}
                        </SectionCard>
                    )}

                    {activeTab === 'debts' && (
                        <SectionCard title="سجل الديون" icon={Wallet}>
                            {debts.length > 0 ? (
                                <div className="space-y-3">
                                    {debts.map((debt) => (
                                        <div
                                            key={debt.id}
                                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-black text-slate-900">
                                                            {debt.reason || 'مديونية'}
                                                        </p>
                                                        <span
                                                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black border ${
                                                                statusClasses[debt.status] ??
                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            {formatStatus(debt.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-bold mt-2">
                                                        تاريخ الاستحقاق: {formatDate(debt.due_date)}
                                                    </p>
                                                    <p className="text-sm text-slate-500 font-bold mt-1">
                                                        تاريخ الإنشاء: {formatDateTime(debt.created_at)}
                                                    </p>
                                                    {debt.paid_at ? (
                                                        <p className="text-sm text-emerald-600 font-bold mt-1">
                                                            تم السداد: {formatDateTime(debt.paid_at)}
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div className="text-left">
                                                    <p className="text-2xl font-black text-slate-900">
                                                        {money(debt.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Banknote}
                                    title="لا يوجد ديون"
                                    hint="لا توجد أي مبالغ مستحقة على العميل حالياً"
                                />
                            )}
                        </SectionCard>
                    )}
                </div>
            </div>

            {showWA && <WhatsAppModal profile={profile} onClose={() => setShowWA(false)} />}
            {showFreeze && activeSub && (
                <FreezeModal
                    profile={profile}
                    onClose={() => setShowFreeze(false)}
                    onConfirm={handleFreeze}
                />
            )}
        </div>
    );
}
