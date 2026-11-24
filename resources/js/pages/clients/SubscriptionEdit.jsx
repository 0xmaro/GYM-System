import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowRight,
    Save,
    Loader2,
    Calendar,
    Hash,
    Wallet,
    Settings2,
    AlertCircle,
    CheckCircle,
    CreditCard,
    Infinity,
} from 'lucide-react';

/* ─── helpers ───────────────────────────────────────── */
const formatDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ar-EG');
};

/* ─── sub-components ────────────────────────────────── */
function Field({ label, hint, children }) {
    return (
        <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-slate-400 font-medium">{hint}</p>}
        </div>
    );
}

function Input({ ...props }) {
    return (
        <input
            {...props}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition"
        />
    );
}

function Select({ children, ...props }) {
    return (
        <select
            {...props}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition"
        >
            {children}
        </select>
    );
}

function SectionCard({ title, icon: Icon, children }) {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                {Icon && <Icon size={16} className="text-sky-700" />}
                <h2 className="text-sm font-black text-slate-800">{title}</h2>
            </div>
            <div className="p-5 space-y-5">{children}</div>
        </div>
    );
}

const Skeleton = () => (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-5">
        <div className="h-12 rounded-2xl bg-slate-100 w-1/3" />
        <div className="h-64 rounded-[2rem] bg-slate-100" />
        <div className="h-64 rounded-[2rem] bg-slate-100" />
    </div>
);

/* ─── main page ─────────────────────────────────────── */
export default function SubscriptionEdit() {
    const { clientId, subscriptionId } = useParams();
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        start_date: '',
        end_date: '',
        sessions_remaining: '',
        sessions_unlimited: false,
        amount_paid: 0,
        discount_amount: 0,
        status: 'active',
        notes: '',
    });

    const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

    /* ── fetch ── */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/clients/${clientId}/profile`);
            const profile = res.data;
            const sub = profile?.subscriptions?.find(
                (s) => String(s.id) === String(subscriptionId)
            );

            if (!sub) {
                toast.error('الاشتراك غير موجود');
                navigate(`/clients/${clientId}`);
                return;
            }

            setClient(profile.client);
            setSubscription(sub);
            setForm({
                start_date: sub.start_date ?? '',
                end_date: sub.end_date ?? '',
                sessions_remaining: sub.sessions_remaining ?? '',
                sessions_unlimited: sub.sessions_remaining === null,
                amount_paid: sub.amount_paid ?? 0,
                discount_amount: sub.discount_amount ?? 0,
                status: sub.status ?? 'active',
                notes: sub.notes ?? '',
            });
        } catch {
            toast.error('فشل تحميل بيانات الاشتراك');
        } finally {
            setLoading(false);
        }
    }, [clientId, subscriptionId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.sessions_unlimited && form.sessions_remaining === '') {
            toast.error('أدخل عدد الحصص أو اختر "مفتوح"');
            return;
        }

        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            toast.error('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية');
            return;
        }

        setSaving(true);
        try {
            await api.put(`/subscriptions/${subscriptionId}`, {
                start_date: form.start_date || undefined,
                end_date: form.end_date || undefined,
                sessions_unlimited: form.sessions_unlimited,
                sessions_remaining: form.sessions_unlimited
                    ? undefined
                    : Number(form.sessions_remaining),
                amount_paid: Number(form.amount_paid),
                discount_amount: Number(form.discount_amount),
                status: form.status,
                notes: form.notes || undefined,
            });

            toast.success('تم حفظ التعديلات بنجاح ✅');
            navigate(`/clients/${clientId}`);
        } catch (err) {
            const errors = err?.response?.data?.errors;
            if (errors) {
                Object.values(errors).flat().forEach((msg) => toast.error(msg));
            } else {
                toast.error(err?.response?.data?.message ?? 'فشل الحفظ');
            }
        } finally {
            setSaving(false);
        }
    };

    /* ── render ── */
    if (loading) return <Skeleton />;

    if (!subscription) return null;

    const subTypeName =
        subscription.subscription_type?.label ||
        subscription.subscription_type?.name ||
        '—';

    return (
        <div className="max-w-3xl mx-auto px-4 pb-12 pt-4 space-y-5">

            {/* breadcrumb */}
            <div className="flex items-center gap-2 flex-wrap">
                <Link
                    to="/clients"
                    className="text-xs font-bold text-slate-400 hover:text-sky-700 transition"
                >
                    العملاء
                </Link>
                <span className="text-slate-300">/</span>
                <Link
                    to={`/clients/${clientId}`}
                    className="text-xs font-bold text-slate-400 hover:text-sky-700 transition"
                >
                    {client?.name ?? 'ملف العميل'}
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-black text-slate-700">تعديل الاشتراك</span>
            </div>

            {/* page header */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate(`/clients/${clientId}`)}
                    className="shrink-0 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition w-fit"
                >
                    <ArrowRight size={18} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Settings2 size={16} className="text-sky-700 shrink-0" />
                        <h1 className="text-xl font-black text-slate-900 truncate">
                            تعديل الاشتراك
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            <CreditCard size={12} />
                            {subTypeName}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            بدأ: {formatDate(subscription.start_date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            ينتهي: {formatDate(subscription.end_date)}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">

                {/* ── التواريخ والحالة ── */}
                <SectionCard title="التواريخ والحالة" icon={Calendar}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="تاريخ البداية">
                            <Input
                                type="date"
                                value={form.start_date}
                                onChange={(e) => set('start_date', e.target.value)}
                            />
                        </Field>

                        <Field label="تاريخ النهاية">
                            <Input
                                type="date"
                                value={form.end_date}
                                onChange={(e) => set('end_date', e.target.value)}
                            />
                        </Field>
                    </div>

                    <Field label="حالة الاشتراك">
                        <Select
                            value={form.status}
                            onChange={(e) => set('status', e.target.value)}
                        >
                            <option value="active">نشط</option>
                            <option value="frozen">مجمّد</option>
                            <option value="expired">منتهي</option>
                            <option value="pending">معلّق</option>
                        </Select>
                    </Field>

                    {/* حساب الأيام تلقائيًا */}
                    {form.start_date && form.end_date && (
                        <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-center gap-3">
                            <Calendar size={16} className="text-sky-600 shrink-0" />
                            <p className="text-sm font-bold text-sky-700">
                                مدة الاشتراك:{' '}
                                <span className="font-black">
                                    {Math.max(
                                        0,
                                        Math.round(
                                            (new Date(form.end_date) - new Date(form.start_date)) /
                                                (1000 * 60 * 60 * 24)
                                        )
                                    )}{' '}
                                    يوم
                                </span>
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* ── الحصص ── */}
                <SectionCard title="الحصص" icon={Hash}>
                    <Field label="نوع الحصص">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => set('sessions_unlimited', false)}
                                className={`rounded-2xl border p-4 text-center font-black text-sm transition ${
                                    !form.sessions_unlimited
                                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-200'
                                }`}
                            >
                                <Hash size={18} className="mx-auto mb-2" />
                                عدد محدد
                            </button>

                            <button
                                type="button"
                                onClick={() => set('sessions_unlimited', true)}
                                className={`rounded-2xl border p-4 text-center font-black text-sm transition ${
                                    form.sessions_unlimited
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-200'
                                }`}
                            >
                                <Infinity size={18} className="mx-auto mb-2" />
                                مفتوح (غير محدود)
                            </button>
                        </div>
                    </Field>

                    {!form.sessions_unlimited && (
                        <Field
                            label="عدد الحصص المتبقية"
                            hint="القيمة الحالية يستخدمها النظام لمنع أو السماح بالدخول"
                        >
                            <Input
                                type="number"
                                min={0}
                                value={form.sessions_remaining}
                                onChange={(e) => set('sessions_remaining', e.target.value)}
                                placeholder="مثال: 10"
                            />
                        </Field>
                    )}

                    {form.sessions_unlimited && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-4 flex items-center gap-3">
                            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-emerald-800">
                                    الحصص ستكون مفتوحة
                                </p>
                                <p className="text-xs font-medium text-emerald-600 mt-0.5">
                                    سيتم حفظ null في قاعدة البيانات، والنظام لن يمنع الدخول بسبب الحصص
                                </p>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* ── الماليات ── */}
                <SectionCard title="الماليات" icon={Wallet}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="المبلغ المدفوع (ج.م)">
                            <Input
                                type="number"
                                min={0}
                                value={form.amount_paid}
                                onChange={(e) => set('amount_paid', e.target.value)}
                            />
                        </Field>

                        <Field label="قيمة الخصم (ج.م)">
                            <Input
                                type="number"
                                min={0}
                                value={form.discount_amount}
                                onChange={(e) => set('discount_amount', e.target.value)}
                            />
                        </Field>
                    </div>

                    {/* صافي عرض */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">صافي المبلغ بعد الخصم</span>
                        <span className="text-lg font-black text-slate-800">
                            {Math.max(0, Number(form.amount_paid) - Number(form.discount_amount)).toLocaleString('ar-EG')} ج.م
                        </span>
                    </div>
                </SectionCard>

                {/* ── ملاحظات ── */}
                <SectionCard title="ملاحظات" icon={AlertCircle}>
                    <textarea
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        rows={4}
                        dir="rtl"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                        placeholder="سبب التعديل، ملاحظة خاصة..."
                    />
                </SectionCard>

                {/* ── action bar ── */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 py-4 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
                    >
                        {saving
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Save size={18} />
                        }
                        {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(`/clients/${clientId}`)}
                        className="flex-1 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-sm hover:bg-slate-50 transition"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}
