import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowRight, QrCode, User, Phone, Calendar, MapPin,
    CreditCard, CheckCircle, AlertCircle, Loader2,
    MessageSquare, ChevronDown, Hash, Zap, Snowflake,
    DollarSign, Receipt, BadgeCheck, XCircle, Percent
} from 'lucide-react';

const IS_CENTS  = true;
const fromCents = v => IS_CENTS ? (v / 100) : v;
const toCents   = v => IS_CENTS ? Math.round(parseFloat(v || 0) * 100) : parseFloat(v || 0);

const DURATION_MAP = {
    monthly:    { label: 'شهر',    days: 30  },
    quarterly:  { label: '3 شهور', days: 90  },
    semiannual: { label: '6 شهور', days: 180 },
};

const INIT = {
    name:                 '',
    phone:                '',
    gender:               'male',
    age:                  '',
    address:              '',
    qr_id:                '',
    subscription_type_id: '',
    start_date:           new Date().toISOString().split('T')[0],
    amount_paid:          '',
    discount_amount:      0,
    duration_days:        30,
    is_paid:              true,
    send_welcome:         true,
};

// ─── Step Dot ─────────────────────────────────────────────────
function StepDot({ step, current, label }) {
    const done   = current > step;
    const active = current === step;
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all
                ${done   ? 'bg-success border-success text-white'
                : active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                         : 'bg-mist border-border text-muted'}`}>
                {done ? <CheckCircle size={16} /> : step}
            </div>
            <span className={`text-[10px] font-bold whitespace-nowrap ${active ? 'text-primary' : 'text-muted'}`}>
                {label}
            </span>
        </div>
    );
}

// ─── QR Input ─────────────────────────────────────────────────
function QrInput({ value, onChange, checking, valid, error }) {
    return (
        <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                <QrCode size={20} />
            </div>
            <input
                type="text"
                placeholder="امسح كارت QR أو اكتب الرقم يدوياً..."
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full pr-12 pl-12 py-5 bg-mist rounded-2xl text-center text-xl font-black
                    outline-none border-2 transition-all
                    ${error   ? 'border-danger bg-danger/5'
                    : valid   ? 'border-success bg-success/5'
                    : value   ? 'border-primary/40'
                              : 'border-transparent focus:border-primary/40'}`}
                autoFocus
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {checking && <Loader2 size={18} className="animate-spin text-primary" />}
                {!checking && valid && <CheckCircle size={18} className="text-success" />}
                {!checking && error && <XCircle size={18} className="text-danger" />}
            </div>
            {error && (
                <p className="text-xs text-danger font-bold mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
            {valid && (
                <p className="text-xs text-success font-bold mt-2 flex items-center gap-1">
                    <CheckCircle size={12} /> الكارت متاح ✅
                </p>
            )}
        </div>
    );
}

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
        <div className={`w-full text-right p-4 rounded-2xl border-2 transition-all cursor-pointer
            ${selected
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                : 'border-border bg-mist hover:border-primary/30 hover:bg-mist/60'}`}
            onClick={() => onSelect(type, selectedDuration)}>

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${selected ? 'border-primary bg-primary' : 'border-border'}`}>
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
                    </div>
                </div>
            </div>

            {/* أزرار اختيار المدة */}
            <div
                className="grid grid-cols-3 gap-1.5 mb-3"
                onClick={e => e.stopPropagation()}>
                {Object.entries(DURATION_MAP).map(([key, meta]) => {
                    const p = fromCents(prices[key]);
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
                                    : 'bg-white border-border text-ink font-bold hover:border-primary/50 hover:bg-primary/5'}`}>
                            <p className="text-[9px] mb-0.5">{meta.label}</p>
                            <p className="text-[11px]">{Math.round(p).toLocaleString('ar-EG')} ج</p>
                        </button>
                    );
                })}
            </div>

            {/* المجموع */}
            <div className={`text-center py-2 rounded-xl transition-all
                ${selected ? 'bg-primary/10' : 'bg-white/60'}`}>
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

// ─── Row Helper ────────────────────────────────────────────────
function Row({ icon, label, value }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-muted shrink-0">{icon}</span>
            <span className="text-xs font-bold text-muted w-16">{label}</span>
            <span className="text-xs font-black text-ink">{value || '—'}</span>
        </div>
    );
}

// ─── Confirm Modal ─────────────────────────────────────────────
function ConfirmModal({ data, selectedType, selectedDuration, onConfirm, onBack, submitting }) {
    const gross    = parseFloat(data.amount_paid    || 0);
    const discount = parseFloat(data.discount_amount || 0);
    const net      = Math.max(0, gross - discount);

    const startD = new Date(data.start_date);
    const endD   = new Date(startD);
    endD.setDate(endD.getDate() + (data.duration_days || 30));
    const endDateStr = endD.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const durationLabel = DURATION_MAP[selectedDuration]?.label ?? `${data.duration_days} يوم`;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onBack} />
            <div className="relative bg-card rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">

                <div className="bg-primary/10 border-b border-primary/20 px-6 py-5">
                    <h2 className="font-black text-ink text-lg flex items-center gap-2">
                        <BadgeCheck size={22} className="text-primary" /> تأكيد بيانات العضو
                    </h2>
                    <p className="text-xs text-muted mt-1">راجع البيانات قبل الحفظ</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-mist p-4 rounded-2xl space-y-2">
                        <Row icon={<User size={14}/>}     label="الاسم"    value={data.name} />
                        <Row icon={<Phone size={14}/>}    label="الموبايل" value={data.phone} />
                        <Row icon={<QrCode size={14}/>}   label="رقم QR"   value={data.qr_id} />
                        <Row icon={<Calendar size={14}/>} label="بداية"    value={data.start_date} />
                        <Row icon={<Calendar size={14}/>} label="نهاية"    value={endDateStr} />
                    </div>

                    {selectedType && (
                        <div className="bg-primary/5 border border-primary/15 p-4 rounded-2xl">
                            <p className="text-xs font-black text-primary mb-2 uppercase">الباقة</p>
                            <p className="font-black text-ink">{selectedType.name}</p>
                            <p className="text-xs text-muted mt-0.5">
                                {durationLabel} — {data.duration_days} يوم
                            </p>
                        </div>
                    )}

                    <div className={`p-4 rounded-2xl border-2 ${data.is_paid ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-muted">حالة الدفع</span>
                            <span className={`text-xs font-black px-2 py-1 rounded-full
                                ${data.is_paid ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                                {data.is_paid ? '✅ مدفوع' : '⚠️ غير مدفوع — سيُضاف للديون'}
                            </span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="text-xs text-muted space-y-1">
                                {discount > 0 && <p>قبل الخصم: <span className="line-through">{gross.toLocaleString('ar-EG')}</span> ج.م</p>}
                                {discount > 0 && <p>خصم: <span className="text-danger font-bold">-{discount.toLocaleString('ar-EG')}</span> ج.م</p>}
                            </div>
                            <div className="text-2xl font-black text-ink">
                                {net.toLocaleString('ar-EG')} <span className="text-sm font-bold text-muted">ج.م</span>
                            </div>
                        </div>
                        {!data.is_paid && net > 0 && (
                            <p className="text-xs text-danger font-bold mt-2 bg-danger/10 p-2 rounded-xl">
                                ⚠️ سيُسجل {net.toLocaleString('ar-EG')} ج.م كدين مستحق في جدول الديون
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-mist rounded-2xl">
                        <MessageSquare size={16} className="text-success shrink-0" />
                        <span className="text-xs font-bold text-ink flex-1">إرسال رسالة ترحيب واتساب</span>
                        <span className={`text-xs font-black ${data.send_welcome ? 'text-success' : 'text-muted'}`}>
                            {data.send_welcome ? 'نعم ✅' : 'لا'}
                        </span>
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button type="button" onClick={onBack} disabled={submitting}
                        className="flex-1 p-4 bg-mist rounded-2xl font-black text-sm text-muted border border-border hover:bg-white transition-all">
                        تعديل
                    </button>
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="flex-[2] p-4 bg-primary text-white rounded-2xl font-black text-sm
                            shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all
                            flex items-center justify-center gap-2 disabled:opacity-60">
                        {submitting
                            ? <><Loader2 size={18} className="animate-spin" /> جاري الحفظ...</>
                            : <><BadgeCheck size={18} /> تأكيد وحفظ</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────────────
export default function ClientForm() {
    const navigate = useNavigate();

    const [step,             setStep]            = useState(1);
    const [formData,         setFormData]        = useState(INIT);
    const [subTypes,         setSubTypes]        = useState([]);
    const [selectedType,     setSelectedType]    = useState(null);
    const [selectedDuration, setSelectedDuration]= useState('monthly');
    const [qrChecking,       setQrChecking]      = useState(false);
    const [qrValid,          setQrValid]         = useState(false);
    const [qrError,          setQrError]         = useState('');
    const [showConfirm,      setShowConfirm]     = useState(false);
    const [submitting,       setSubmitting]      = useState(false);

    const qrTimerRef = useRef(null);

    useEffect(() => {
        api.get('/subscription-types')
            .then(res => setSubTypes(res.data.data.filter(t => t.is_active)))
            .catch(() => toast.error('فشل تحميل الباقات'));
    }, []);

    // ─── QR Check ────────────────────────────────────────────
const checkQr = useCallback((val) => {
    clearTimeout(qrTimerRef.current);
    setQrValid(false);
    setQrError('');
    if (!val) return;

    setQrChecking(true);
    qrTimerRef.current = setTimeout(async () => {
        try {
            // ✅ الـ endpoint الصح
            const res = await api.get('/qr-cards/check', { params: { qr_id: val } });

            if (res.data.available) {
                setQrValid(true);
                setQrError('');
            } else {
                // حالة نادرة — السيرفر رد 200 لكن قال not available
                setQrError(res.data.message || 'الكارت غير متاح');
                setQrValid(false);
            }
        } catch (err) {
            setQrValid(false);
            if (err.response?.status === 409) {
                setQrError('الكارت مرتبط بعضو آخر: ' + (err.response.data?.client ?? ''));
            } else if (err.response?.status === 404) {
                setQrError('الكارت غير موجود في النظام — أضفه أولاً');
            } else if (err.response?.status === 422) {
                setQrError(err.response.data?.message ?? 'الكارت غير صالح');
            } else {
                setQrError('خطأ في التحقق — حاول مرة أخرى');
            }
        } finally {
            setQrChecking(false);
        }
    }, 600);
}, []);

    const handleQrChange = (val) => {
        setFormData(f => ({ ...f, qr_id: val }));
        checkQr(val);
    };

    // ─── اختيار الباقة + المدة ────────────────────────────────
    const handleSelectType = (type, duration = selectedDuration) => {
        const priceKey = {
            monthly:    type.price_monthly,
            quarterly:  type.price_3months,
            semiannual: type.price_6months,
        };
        const days  = DURATION_MAP[duration]?.days ?? 30;
        const price = fromCents(priceKey[duration] ?? type.price_monthly);

        setSelectedType(type);
        setSelectedDuration(duration);
        setFormData(f => ({
            ...f,
            subscription_type_id: type.id,
            amount_paid:          price,
            duration_days:        days,
        }));
    };

    // ─── Submit ───────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const gross    = parseFloat(formData.amount_paid    || 0);
            const discount = parseFloat(formData.discount_amount || 0);
            const net      = Math.max(0, gross - discount);

            const payload = {
                name:                 formData.name.trim(),
                phone:                formData.phone.trim(),
                gender:               formData.gender,
                age:                  formData.age ? parseInt(formData.age) : null,
                address:              formData.address || null,
                qr_id:                formData.qr_id,
                subscription_type_id: parseInt(formData.subscription_type_id),
                start_date:           formData.start_date,
                duration_days:        formData.duration_days,   // ← المدة المختارة
                amount_paid:          toCents(net),
                discount_amount:      toCents(discount),
                is_paid:              formData.is_paid,
                send_welcome:         formData.send_welcome,
            };

            const res = await api.post('/clients', payload);

            toast.success(
                formData.is_paid
                    ? 'تم تسجيل العضو ✅'
                    : 'تم تسجيل العضو وتسجيل المديونية ⚠️'
            );

            if (formData.send_welcome && res.data.data?.id) {
                await api.post('/notifications/send-reminder/' + res.data.data.id, {
                    type: 'welcome',
                }).catch(() => {});
            }

            navigate(`/clients/${res.data.data.id}`);
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                Object.values(errors).flat().forEach(msg => toast.error(msg));
            } else {
                toast.error(err.response?.data?.message || 'خطأ في الحفظ');
            }
        } finally {
            setSubmitting(false);
            setShowConfirm(false);
        }
    };

    // ─── Helpers ──────────────────────────────────────────────
    const canGoStep2 = formData.name && formData.phone && formData.qr_id && !qrError;
    const canGoStep3 = canGoStep2 && selectedType;

    const setE = field => e => setFormData(f => ({ ...f, [field]: e.target.value }));

    const gross    = parseFloat(formData.amount_paid    || 0);
    const discount = parseFloat(formData.discount_amount || 0);
    const net      = Math.max(0, gross - discount);

    // حساب تاريخ النهاية للعرض
    const endDatePreview = (() => {
        if (!formData.start_date || !formData.duration_days) return null;
        const d = new Date(formData.start_date);
        d.setDate(d.getDate() + formData.duration_days);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    })();

    return (
        <div className="max-w-2xl mx-auto pb-24 px-4">

            {/* Header */}
            <div className="bg-card p-5 rounded-3xl border border-border mb-6 flex items-center gap-4">
                <button type="button" onClick={() => navigate(-1)}
                    className="p-2.5 bg-mist rounded-xl hover:bg-white border border-border transition-all">
                    <ArrowRight size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black text-ink">إضافة عضو جديد</h1>
                    <p className="text-xs text-muted">أكمل الخطوات بالترتيب</p>
                </div>
            </div>

            {/* Steps */}
            <div className="flex items-center justify-center gap-6 mb-8">
                <StepDot step={1} current={step} label="البيانات" />
                <div className={`flex-1 h-0.5 max-w-[60px] rounded transition-all ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
                <StepDot step={2} current={step} label="الباقة" />
                <div className={`flex-1 h-0.5 max-w-[60px] rounded transition-all ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
                <StepDot step={3} current={step} label="الدفع" />
            </div>

            {/* ─── Step 1 ─── */}
            {step === 1 && (
                <div className="bg-card p-6 rounded-[2rem] border border-border space-y-4">
                    <h2 className="font-black text-ink flex items-center gap-2 mb-2">
                        <User size={18} className="text-primary" /> بيانات العضو
                    </h2>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">كارت QR *</label>
                        <QrInput value={formData.qr_id} onChange={handleQrChange}
                            checking={qrChecking} valid={qrValid} error={qrError} />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">الاسم الكامل *</label>
                        <div className="relative">
                            <User size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input type="text" value={formData.name} onChange={setE('name')}
                                placeholder="مثلاً: أحمد محمد علي" required
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none placeholder:text-muted" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">رقم الموبايل *</label>
                        <div className="relative">
                            <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input type="tel" value={formData.phone} onChange={setE('phone')}
                                placeholder="01xxxxxxxxx" required dir="ltr"
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none placeholder:text-muted" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">الجنس</label>
                            <select value={formData.gender} onChange={setE('gender')}
                                className="w-full p-4 bg-mist rounded-2xl font-bold text-ink outline-none border-2 border-transparent focus:border-primary transition-all cursor-pointer">
                                <option value="male">♂ ذكر</option>
                                <option value="female">♀ أنثى</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">السن (اختياري)</label>
                            <input type="number" min="5" max="100" value={formData.age} onChange={setE('age')}
                                placeholder="مثلاً: 25"
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">العنوان (اختياري)</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute right-4 top-4 text-muted" />
                            <input type="text" value={formData.address} onChange={setE('address')}
                                placeholder="المنطقة أو الشارع"
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none placeholder:text-muted" />
                        </div>
                    </div>

                    <button type="button" onClick={() => setStep(2)} disabled={!canGoStep2}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm
                            shadow-md shadow-primary/20 hover:bg-primary/90 transition-all
                            disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        التالي — اختيار الباقة
                        <ChevronDown size={18} className="rotate-[-90deg]" />
                    </button>
                </div>
            )}

            {/* ─── Step 2 ─── */}
            {step === 2 && (
                <div className="bg-card p-6 rounded-[2rem] border border-border">
                    <h2 className="font-black text-ink flex items-center gap-2 mb-4">
                        <CreditCard size={18} className="text-success" /> اختيار الباقة
                    </h2>

                    <div className="mb-4">
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            تاريخ بداية الاشتراك
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input type="date" value={formData.start_date} onChange={setE('start_date')}
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold text-ink outline-none" />
                        </div>
                    </div>

                    {/* معاينة تاريخ الانتهاء */}
                    {selectedType && endDatePreview && (
                        <div className="flex items-center gap-2 bg-success/5 border border-success/20 p-3 rounded-2xl mb-4">
                            <CheckCircle size={14} className="text-success shrink-0" />
                            <p className="text-xs font-bold text-success">
                                ينتهي الاشتراك في: <span className="font-black">{endDatePreview}</span>
                                <span className="text-success/70 mr-1">({formData.duration_days} يوم)</span>
                            </p>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[460px] overflow-y-auto pl-1 mb-4">
                        {subTypes.length === 0 ? (
                            <div className="text-center py-12 text-muted">
                                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                <p className="text-sm font-bold">جاري تحميل الباقات...</p>
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

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(1)}
                            className="flex-1 py-4 bg-mist rounded-2xl font-black text-sm text-muted border border-border hover:bg-white transition-all">
                            رجوع
                        </button>
                        <button type="button" onClick={() => setStep(3)} disabled={!canGoStep3}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm
                                shadow-md shadow-primary/20 hover:bg-primary/90 transition-all
                                disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            التالي — تفاصيل الدفع
                            <ChevronDown size={18} className="rotate-[-90deg]" />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Step 3 ─── */}
            {step === 3 && (
                <div className="bg-card p-6 rounded-[2rem] border border-border space-y-4">
                    <h2 className="font-black text-ink flex items-center gap-2 mb-2">
                        <Receipt size={18} className="text-warning" /> تفاصيل الدفع
                    </h2>

                    {selectedType && (
                        <div className="flex items-center justify-between bg-primary/5 border border-primary/15 p-3 rounded-2xl">
                            <div>
                                <p className="font-black text-ink text-sm">{selectedType.name}</p>
                                <p className="text-[10px] text-muted">
                                    {DURATION_MAP[selectedDuration]?.label} — {formData.duration_days} يوم
                                </p>
                                {endDatePreview && (
                                    <p className="text-[10px] text-success font-bold mt-0.5">
                                        ينتهي: {endDatePreview}
                                    </p>
                                )}
                            </div>
                            <p className="font-black text-primary text-lg">
                                {Math.round(gross).toLocaleString('ar-EG')} ج.م
                            </p>
                        </div>
                    )}

                    {/* المبلغ */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            المبلغ المدفوع (ج.م)
                        </label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input type="number" min="0" step="1"
                                value={formData.amount_paid} onChange={setE('amount_paid')}
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-success focus:bg-white transition-all font-black text-success text-lg outline-none" />
                        </div>
                    </div>

                    {/* الخصم */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            خصم (ج.م) — اختياري
                        </label>
                        <div className="relative">
                            <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input type="number" min="0" step="1"
                                value={formData.discount_amount} onChange={setE('discount_amount')}
                                placeholder="0"
                                className="w-full pr-10 p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-danger focus:bg-white transition-all font-black text-danger outline-none" />
                        </div>
                    </div>

                    {/* الإجمالي */}
                    <div className="bg-ink text-white p-5 rounded-2xl flex items-center justify-between">
                        <span className="font-bold text-white/70 text-sm">الإجمالي</span>
                        <span className="font-black text-2xl">
                            {net.toLocaleString('ar-EG')} <span className="text-sm font-bold text-white/70">ج.م</span>
                        </span>
                    </div>

                    {/* هل دفع؟ */}
                    <div onClick={() => setFormData(f => ({ ...f, is_paid: !f.is_paid }))}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                            ${formData.is_paid ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-all
                            ${formData.is_paid ? 'bg-success' : 'bg-danger'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-all
                                ${formData.is_paid ? 'translate-x-1' : 'translate-x-6'}`} />
                        </div>
                        <div>
                            <p className="font-black text-sm text-ink">
                                {formData.is_paid ? '✅ دفع الاشتراك' : '⚠️ لم يدفع — سيُسجل كدين'}
                            </p>
                            <p className="text-[10px] text-muted mt-0.5">
                                {formData.is_paid
                                    ? 'سيتم تسجيل الدفع في المعاملات'
                                    : `سيُضاف ${net.toLocaleString('ar-EG')} ج.م لديون العميل`}
                            </p>
                        </div>
                    </div>

                    {/* رسالة ترحيب */}
                    <div onClick={() => setFormData(f => ({ ...f, send_welcome: !f.send_welcome }))}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                            ${formData.send_welcome ? 'border-success/30 bg-success/5' : 'border-border bg-mist'}`}>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-all
                            ${formData.send_welcome ? 'bg-success' : 'bg-mist border border-border'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-all border border-border/30
                                ${formData.send_welcome ? 'translate-x-1' : 'translate-x-6'}`} />
                        </div>
                        <div>
                            <p className="font-black text-sm text-ink flex items-center gap-1.5">
                                <MessageSquare size={14} className="text-success" />
                                إرسال رسالة ترحيب واتساب
                            </p>
                            <p className="text-[10px] text-muted mt-0.5">
                                {formData.send_welcome
                                    ? 'سترسل رسالة ترحيب لرقم ' + (formData.phone || '...')
                                    : 'لن يُرسل أي رسالة الآن'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setStep(2)}
                            className="flex-1 py-4 bg-mist rounded-2xl font-black text-sm text-muted border border-border hover:bg-white transition-all">
                            رجوع
                        </button>
                        <button type="button" onClick={() => setShowConfirm(true)} disabled={!selectedType}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm
                                shadow-md shadow-primary/20 hover:bg-primary/90 transition-all
                                disabled:opacity-40 flex items-center justify-center gap-2">
                            <BadgeCheck size={18} /> مراجعة وتأكيد
                        </button>
                    </div>
                </div>
            )}

            {showConfirm && (
                <ConfirmModal
                    data={formData}
                    selectedType={selectedType}
                    selectedDuration={selectedDuration}
                    onConfirm={handleSubmit}
                    onBack={() => setShowConfirm(false)}
                    submitting={submitting}
                />
            )}
        </div>
    );
}
