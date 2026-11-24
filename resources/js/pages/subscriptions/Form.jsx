import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowRight, CreditCard, CheckCircle, Loader2,
    MessageSquare, Zap, Hash, DollarSign, Percent,
    Receipt, BadgeCheck, Calendar
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────
const IS_CENTS  = true;
const fromCents = v => IS_CENTS ? (v / 100) : v;
const toCents   = v => IS_CENTS ? Math.round(parseFloat(v || 0) * 100) : parseFloat(v || 0);

const DURATION_MAP = {
    monthly:    { label: 'شهر',    days: 30  },
    quarterly:  { label: '3 شهور', days: 90  },
    semiannual: { label: '6 شهور', days: 180 },
};

// ─── SubTypeCard ───────────────────────────────────────────────
function SubTypeCard({ type, selected, selectedDuration, onSelect, onDurationChange }) {
    const prices = {
        monthly:    type.price_monthly,
        quarterly:  type.price_3months,
        semiannual: type.price_6months,
    };

    const activeDuration = selected ? selectedDuration : 'monthly';
    const currentPrice   = fromCents(prices[activeDuration] ?? prices.monthly);
    const currentDays    = DURATION_MAP[activeDuration]?.days ?? 30;

    return (
        <div
            className={`w-full text-right p-4 rounded-2xl border-2 transition-all cursor-pointer
                ${selected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-mist hover:border-primary/30 hover:bg-mist/60'}`}
            onClick={() => onSelect(type, selectedDuration)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${selected ? 'border-primary bg-primary' : 'border-border'}`}
                >
                    {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="flex-1 mr-2">
                    <p className="font-black text-ink text-sm">{type.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-muted">
                            <Zap size={9} /> {selected ? currentDays : type.duration_days} يوم
                        </span>
                        {type.sessions_count && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-muted">
                                <Hash size={9} /> {type.sessions_count} حصة
                            </span>
                        )}
                        {!type.sessions_count && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                                <Hash size={9} /> حصص مفتوحة
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* أزرار اختيار المدة */}
            <div
                className="grid grid-cols-3 gap-1.5 mb-3"
                onClick={e => e.stopPropagation()}
            >
                {Object.entries(DURATION_MAP).map(([key, meta]) => {
                    const p = prices[key];
                    if (!p) return null;
                    const isActive = selected && selectedDuration === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                onDurationChange(key);
                                onSelect(type, key);
                            }}
                            className={`py-2 px-1 rounded-xl text-center transition-all border
                                ${isActive
                                    ? 'bg-primary text-white border-primary font-black shadow-sm'
                                    : 'bg-white border-border text-ink font-bold hover:border-primary/50 hover:bg-primary/5'}`}
                        >
                            <p className="text-[9px] mb-0.5">{meta.label}</p>
                            <p className="text-[11px]">
                                {Math.round(fromCents(p)).toLocaleString('ar-EG')} ج
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* المجموع */}
            <div
                className={`text-center py-2 rounded-xl transition-all
                ${selected ? 'bg-primary/10' : 'bg-white/60'}`}
            >
                <span className="text-[10px] text-muted font-bold">المجموع: </span>
                <span className={`font-black text-sm ${selected ? 'text-primary' : 'text-ink'}`}>
                    {Math.round(currentPrice).toLocaleString('ar-EG')} ج.م
                </span>
                {selected && (
                    <span className="text-[9px] text-muted font-bold mr-1">
                        ({currentDays} يوم)
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Confirm Modal ─────────────────────────────────────────────
function ConfirmModal({
    data,
    selectedType,
    selectedDuration,
    net,
    endDatePreview,
    onConfirm,
    onBack,
    submitting,
    isRenew,
}) {
    const durationLabel = DURATION_MAP[selectedDuration]?.label ?? `${data.duration_days} يوم`;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onBack} />
            <div className="relative bg-card rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-primary/10 border-b border-primary/20 px-6 py-5">
                    <h2 className="font-black text-ink text-lg flex items-center gap-2">
                        <BadgeCheck size={22} className="text-primary" />{' '}
                        {isRenew ? 'تأكيد بيانات التجديد' : 'تأكيد بيانات الاشتراك'}
                    </h2>
                    <p className="text-xs text-muted mt-1">راجع البيانات قبل الحفظ</p>
                </div>

                <div className="p-6 space-y-4">
                    {selectedType && (
                        <div className="bg-primary/5 border border-primary/15 p-4 rounded-2xl">
                            <p className="text-xs font-black text-primary mb-1 uppercase">
                                الباقة المختارة
                            </p>
                            <p className="font-black text-ink">{selectedType.name}</p>
                            <p className="text-xs text-muted mt-0.5">
                                {durationLabel} — {data.duration_days} يوم
                            </p>
                            {endDatePreview && (
                                <p className="text-xs text-success font-bold mt-1">
                                    ينتهي في: {endDatePreview}
                                </p>
                            )}
                        </div>
                    )}

                    <div
                        className={`p-4 rounded-2xl border-2 ${
                            data.is_paid
                                ? 'border-success/30 bg-success/5'
                                : 'border-danger/30 bg-danger/5'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-muted">حالة الدفع</span>
                            <span
                                className={`text-xs font-black px-2 py-1 rounded-full
                                ${
                                    data.is_paid
                                        ? 'bg-success text-white'
                                        : 'bg-danger text-white'
                                }`}
                            >
                                {data.is_paid
                                    ? '✅ مدفوع'
                                    : '⚠️ غير مدفوع — سيُضاف للديون'}
                            </span>
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="text-xs text-muted space-y-1">
                                {parseFloat(data.discount_amount) > 0 && (
                                    <>
                                        <p>
                                            قبل الخصم:{' '}
                                            <span className="line-through">
                                                {parseFloat(
                                                    data.amount_paid
                                                ).toLocaleString('ar-EG')}
                                            </span>{' '}
                                            ج.م
                                        </p>
                                        <p>
                                            خصم:{' '}
                                            <span className="text-danger font-bold">
                                                -
                                                {parseFloat(
                                                    data.discount_amount
                                                ).toLocaleString('ar-EG')}
                                            </span>{' '}
                                            ج.م
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="text-2xl font-black text-ink">
                                {net.toLocaleString('ar-EG')}{' '}
                                <span className="text-sm font-bold text-muted">
                                    ج.م
                                </span>
                            </div>
                        </div>

                        {!data.is_paid && net > 0 && (
                            <p className="text-xs text-danger font-bold mt-2 bg-danger/10 p-2 rounded-xl">
                                ⚠️ سيُسجل {net.toLocaleString('ar-EG')} ج.م كدين مستحق في جدول
                                الديون
                            </p>
                        )}
                    </div>

                    <div className="bg-mist p-3 rounded-2xl text-xs font-bold text-muted flex items-center gap-2">
                        <Calendar size={14} />
                        بداية الاشتراك:{' '}
                        <span className="text-ink font-black">{data.start_date}</span>
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={submitting}
                        className="flex-1 p-4 bg-mist rounded-2xl font-black text-sm text-muted border border-border hover:bg-white transition-all"
                    >
                        تعديل
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="flex-[2] p-4 bg-primary text-white rounded-2xl font-black text-sm
                            shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all
                            flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <BadgeCheck size={18} /> تأكيد وحفظ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────────────
export default function SubscriptionForm() {
    const { id, subscriptionId } = useParams();
    const navigate = useNavigate();
    const isRenew = !!subscriptionId;

    const [subTypes, setSubTypes]                 = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [submitting, setSubmitting]             = useState(false);
    const [showConfirm, setShowConfirm]           = useState(false);
    const [selectedType, setSelectedType]         = useState(null);
    const [selectedDuration, setSelectedDuration] = useState('monthly');

    const [formData, setFormData] = useState({
        client_id:            id,
        subscription_type_id: '',
        start_date:           new Date().toISOString().split('T')[0],
        duration_days:        30,
        amount_paid:          '',
        discount_amount:      0,
        payment_method:       'cash',
        is_paid:              true,
    });

    useEffect(() => {
        api.get('/subscription-types')
            .then(res =>
                setSubTypes((res.data.data || []).filter(t => t.is_active))
            )
            .catch(() => toast.error('فشل تحميل باقات الاشتراك'))
            .finally(() => setLoading(false));
    }, []);

    // ─── اختيار الباقة + المدة ────────────────────────────────
    const handleSelectType = (type, duration = selectedDuration) => {
        const priceMap = {
            monthly:    type.price_monthly,
            quarterly:  type.price_3months,
            semiannual: type.price_6months,
        };
        const days  = DURATION_MAP[duration]?.days ?? 30;
        const price = fromCents(priceMap[duration] ?? type.price_monthly);

        setSelectedType(type);
        setSelectedDuration(duration);
        setFormData(f => ({
            ...f,
            subscription_type_id: type.id,
            amount_paid:          price,
            duration_days:        days,
        }));
    };

    // ─── حسابات ──────────────────────────────────────────────
    const gross    = parseFloat(formData.amount_paid    || 0);
    const discount = parseFloat(formData.discount_amount || 0);
    const net      = Math.max(0, gross - discount);

    const endDatePreview = (() => {
        if (!formData.start_date || !formData.duration_days) return null;
        const d = new Date(formData.start_date);
        d.setDate(d.getDate() + parseInt(formData.duration_days));
        return d.toLocaleDateString('ar-EG', {
            year:  'numeric',
            month: 'long',
            day:   'numeric',
        });
    })();

    // ─── Submit ───────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            const payload = {
                client_id:            parseInt(id),
                subscription_type_id: parseInt(formData.subscription_type_id),
                start_date:           formData.start_date,
                duration_days:        formData.duration_days,
                amount_paid:          toCents(gross),
                discount_amount:      toCents(discount),
                payment_method:       formData.payment_method,
                is_paid:              formData.is_paid,
            };

            if (isRenew) {
                await api.post(`/subscriptions/${subscriptionId}/renew`, payload);
            } else {
                await api.post('/subscriptions', payload);
            }

            toast.success(
                isRenew
                    ? (formData.is_paid
                        ? 'تم تجديد الاشتراك بنجاح ✅ وسيتم إرسال رسالة التجديد تلقائياً'
                        : 'تم تجديد الاشتراك وتسجيل المبلغ كدين ✅ وسيتم إرسال رسالة التجديد تلقائياً')
                    : (formData.is_paid
                        ? 'تم تفعيل الاشتراك ✅ وسيتم إرسال رسالة الترحيب تلقائياً'
                        : 'تم تسجيل الاشتراك وإضافة الدين ⚠️ وسيتم إرسال رسالة الترحيب تلقائياً')
            );

            navigate(`/clients/${id}`);
        } catch (error) {
            const errors = error.response?.data?.errors;

            if (errors) {
                Object.values(errors)
                    .flat()
                    .forEach(msg => toast.error(msg));
            } else {
                toast.error(
                    error.response?.data?.message || 'حدث خطأ أثناء الاشتراك'
                );
            }
        } finally {
            setSubmitting(false);
            setShowConfirm(false);
        }
    };

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="font-bold text-muted">جاري تحميل الباقات...</p>
            </div>
        );

    return (
        <div className="max-w-2xl mx-auto pb-24 px-4">
            {/* Header */}
            <div className="bg-card p-5 rounded-3xl border border-border mb-6 flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2.5 bg-mist rounded-xl hover:bg-white border border-border transition-all"
                >
                    <ArrowRight size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black text-ink">
                        {isRenew ? 'تجديد الاشتراك' : 'تفعيل اشتراك جديد'}
                    </h1>
                    <p className="text-xs text-muted">
                        {isRenew
                            ? 'اختر الباقة والمدة وجدّد الاشتراك'
                            : 'اختر الباقة والمدة وسجّل عملية الدفع'}
                    </p>
                </div>
            </div>

            {/* اختيار الباقة */}
            <div className="bg-card p-6 rounded-[2rem] border border-border mb-4">
                <h2 className="font-black text-ink flex items-center gap-2 mb-4">
                    <CreditCard size={18} className="text-success" /> اختيار الباقة والمدة
                </h2>

                {/* تاريخ البداية */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                        تاريخ بداية الاشتراك
                    </label>
                    <div className="relative">
                        <Calendar
                            size={16}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={e =>
                                setFormData(f => ({ ...f, start_date: e.target.value }))
                            }
                            className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none"
                        />
                    </div>
                </div>

                {/* معاينة تاريخ الانتهاء */}
                {selectedType && endDatePreview && (
                    <div className="flex items-center gap-2 bg-success/5 border border-success/20 p-3 rounded-2xl mb-4">
                        <CheckCircle size={14} className="text-success shrink-0" />
                        <p className="text-xs font-bold text-success">
                            ينتهي الاشتراك في:{' '}
                            <span className="font-black">{endDatePreview}</span>
                            <span className="text-success/70 mr-1">
                                ({formData.duration_days} يوم)
                            </span>
                        </p>
                    </div>
                )}

                {/* قائمة الباقات */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pl-1">
                    {subTypes.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <p className="text-sm font-bold">لا توجد باقات متاحة</p>
                        </div>
                    ) : (
                        subTypes.map(type => (
                            <SubTypeCard
                                key={type.id}
                                type={type}
                                selected={selectedType?.id === type.id}
                                selectedDuration={selectedDuration}
                                onDurationChange={setSelectedDuration}
                                onSelect={handleSelectType}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* تفاصيل الدفع */}
            {selectedType && (
                <div className="bg-card p-6 rounded-[2rem] border border-border space-y-4 mb-4">
                    <h2 className="font-black text-ink flex items-center gap-2">
                        <Receipt size={18} className="text-warning" /> تفاصيل الدفع
                    </h2>

                    {/* ملخص الباقة المختارة */}
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/15 p-3 rounded-2xl">
                        <div>
                            <p className="font-black text-ink text-sm">{selectedType.name}</p>
                            <p className="text-[10px] text-muted">
                                {DURATION_MAP[selectedDuration]?.label} —{' '}
                                {formData.duration_days} يوم
                            </p>
                        </div>
                        <p className="font-black text-primary text-lg">
                            {Math.round(gross).toLocaleString('ar-EG')} ج.م
                        </p>
                    </div>

                    {/* المبلغ */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            المبلغ (ج.م)
                        </label>
                        <div className="relative">
                            <DollarSign
                                size={16}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                            />
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={formData.amount_paid}
                                onChange={e =>
                                    setFormData(f => ({
                                        ...f,
                                        amount_paid: e.target.value,
                                    }))
                                }
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-success focus:bg-white transition-all font-black text-success text-lg outline-none"
                            />
                        </div>
                    </div>

                    {/* الخصم */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            خصم (ج.م) — اختياري
                        </label>
                        <div className="relative">
                            <Percent
                                size={16}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                            />
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={formData.discount_amount}
                                onChange={e =>
                                    setFormData(f => ({
                                        ...f,
                                        discount_amount: e.target.value,
                                    }))
                                }
                                placeholder="0"
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-danger focus:bg-white transition-all font-black text-danger outline-none"
                            />
                        </div>
                    </div>

                    {/* طريقة الدفع */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            طريقة الدفع
                        </label>
                        <select
                            value={formData.payment_method}
                            onChange={e =>
                                setFormData(f => ({
                                    ...f,
                                    payment_method: e.target.value,
                                }))
                            }
                            className="w-full p-4 bg-mist rounded-2xl font-bold text-ink outline-none border-2 border-transparent focus:border-primary transition-all cursor-pointer"
                        >
                            <option value="cash">💵 كاش (نقدي)</option>
                            <option value="card">💳 فيزا / ماكينة</option>
                        </select>
                    </div>

                    {/* الإجمالي */}
                    <div className="bg-ink text-white p-5 rounded-2xl flex items-center justify-between">
                        <span className="font-bold text-white/70 text-sm">الإجمالي الصافي</span>
                        <span className="font-black text-2xl">
                            {net.toLocaleString('ar-EG')}{' '}
                            <span className="text-sm font-bold text-white/70">ج.م</span>
                        </span>
                    </div>

                    {/* هل دفع؟ */}
                    <div
                        onClick={() =>
                            setFormData(f => ({ ...f, is_paid: !f.is_paid }))
                        }
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                            ${
                                formData.is_paid
                                    ? 'border-success/30 bg-success/5'
                                    : 'border-danger/30 bg-danger/5'
                            }`}
                    >
                        <div
                            className={`w-12 h-6 rounded-full flex items-center transition-all
                            ${formData.is_paid ? 'bg-success' : 'bg-danger'}`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition-all
                                ${formData.is_paid ? 'translate-x-1' : 'translate-x-6'}`}
                            />
                        </div>
                        <div>
                            <p className="font-black text-sm text-ink">
                                {formData.is_paid
                                    ? '✅ دفع الاشتراك'
                                    : '⚠️ لم يدفع — سيُسجل كدين'}
                            </p>
                            <p className="text-[10px] text-muted mt-0.5">
                                {formData.is_paid
                                    ? 'سيتم تسجيل الدفع في المعاملات'
                                    : `سيُضاف ${net.toLocaleString(
                                          'ar-EG'
                                      )} ج.م لديون العميل`}
                            </p>
                        </div>
                    </div>

                    {/* زر التأكيد */}
                    <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        disabled={!selectedType}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm
                            shadow-md shadow-primary/20 hover:bg-primary/90 transition-all
                            disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        <BadgeCheck size={18} /> مراجعة وتأكيد
                    </button>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirm && (
                <ConfirmModal
                    data={formData}
                    selectedType={selectedType}
                    selectedDuration={selectedDuration}
                    net={net}
                    endDatePreview={endDatePreview}
                    onConfirm={handleSubmit}
                    onBack={() => setShowConfirm(false)}
                    submitting={submitting}
                    isRenew={isRenew}
                />
            )}
        </div>
    );
}
