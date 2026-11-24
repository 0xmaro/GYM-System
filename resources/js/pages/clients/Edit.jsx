import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    Save, ArrowRight, User, Phone, MapPin,
    QrCode, Loader2, CheckCircle, AlertCircle, XCircle
} from 'lucide-react';

function QrInput({ value, onChange, checking, valid, error, hint }) {
    return (
        <div className="space-y-2">
            <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                    <QrCode size={18} />
                </div>

                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="اكتب رقم الكارت..."
                    className={`w-full pr-11 pl-12 p-4 bg-mist rounded-2xl border-2 outline-none font-bold transition-all
                        ${error ? 'border-danger bg-danger/5'
                          : valid ? 'border-success bg-success/5'
                          : value ? 'border-primary/40'
                          : 'border-transparent focus:border-primary/40'}`}
                    dir="ltr"
                />

                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    {checking && <Loader2 size={18} className="animate-spin text-primary" />}
                    {!checking && valid && <CheckCircle size={18} className="text-success" />}
                    {!checking && error && <XCircle size={18} className="text-danger" />}
                </div>
            </div>

            {hint && !error && (
                <p className="text-[11px] text-muted font-bold">{hint}</p>
            )}

            {error && (
                <p className="text-xs text-danger font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            {valid && !error && (
                <p className="text-xs text-success font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> الكارت متاح ✅
                </p>
            )}
        </div>
    );
}

export default function ClientEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        gender: 'male',
        age: '',
        address: '',
        notes: '',
        qr_id: '',
    });

    const [originalQrId, setOriginalQrId] = useState('');
    const [qrChecking, setQrChecking] = useState(false);
    const [qrValid, setQrValid] = useState(true);
    const [qrError, setQrError] = useState('');
    const [qrHint, setQrHint] = useState('');

    const qrTimerRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        api.get(`/clients/${id}`)
            .then(res => {
                if (!mounted) return;
                const d = res.data.data;

                setFormData({
                    name: d.name ?? '',
                    phone: d.phone ?? '',
                    gender: d.gender ?? 'male',
                    age: d.age ?? '',
                    address: d.address ?? '',
                    notes: d.notes ?? '',
                    qr_id: d.qr_id ?? '',
                });

                setOriginalQrId(d.qr_id ?? '');
                setQrValid(true);
                setQrError('');
                setQrHint(d.qr_id ? `الكارت الحالي: ${d.qr_id}` : 'لا يوجد كارت مرتبط حاليًا');
            })
            .catch(() => {
                toast.error('فشل تحميل بيانات العضو');
                navigate('/clients');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
            clearTimeout(qrTimerRef.current);
        };
    }, [id, navigate]);

    const checkQr = useCallback((val) => {
        clearTimeout(qrTimerRef.current);

        const normalized = (val || '').trim();
        const original = (originalQrId || '').trim();

        setQrError('');
        setQrValid(false);

        if (!normalized) {
            setQrChecking(false);
            setQrError('');
            setQrValid(true);
            setQrHint('يمكنك تركه فارغًا فقط إذا كنت تسمح بفك الكارت من العميل');
            return;
        }

        if (normalized === original) {
            setQrChecking(false);
            setQrValid(true);
            setQrError('');
            setQrHint('هذا هو الكارت الحالي للعميل');
            return;
        }

        setQrChecking(true);
        setQrHint('');

        qrTimerRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/qr-cards/check', {
                    params: {
                        qr_id: normalized,
                        ignore_client_id: id,
                    },
                });

                if (res.data.available) {
                    setQrValid(true);
                    setQrError('');
                    setQrHint(res.data.same_client ? 'هذا هو الكارت الحالي للعميل' : 'الكارت متاح للربط');
                } else {
                    setQrValid(false);
                    setQrError(res.data.message || 'الكارت غير متاح');
                }
            } catch (err) {
                setQrValid(false);

                if (err.response?.status === 409) {
                    setQrError('الكارت مرتبط بعضو آخر: ' + (err.response.data?.client ?? ''));
                } else if (err.response?.status === 404) {
                    setQrError(err.response.data?.message || 'الكارت غير موجود في النظام');
                } else if (err.response?.status === 422) {
                    setQrError(err.response.data?.message || 'الكارت غير متاح');
                } else {
                    setQrError('تعذر التحقق من الكارت الآن');
                }
            } finally {
                setQrChecking(false);
            }
        }, 500);
    }, [id, originalQrId]);

    const handleQrChange = (val) => {
        setFormData(f => ({ ...f, qr_id: val }));
        checkQr(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedQr = (formData.qr_id || '').trim();
        const qrChanged = trimmedQr !== (originalQrId || '').trim();

        if (qrChanged && !qrValid) {
            toast.error('لا يمكن حفظ التعديلات لأن الكارت الجديد غير صالح');
            return;
        }

        setSaving(true);

        try {
            await api.put(`/clients/${id}`, {
                ...formData,
                age: formData.age === '' ? null : formData.age,
                qr_id: trimmedQr,
            });

            toast.success('تم تحديث بيانات العضو بنجاح ✅');
            navigate(`/clients/${id}`);
        } catch (error) {
            const errors = error.response?.data?.errors;
            if (errors) {
                Object.values(errors).flat().forEach(msg => toast.error(msg));
            } else {
                toast.error(error.response?.data?.message || 'خطأ في التحديث');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto pb-20">
                <div className="bg-card p-10 rounded-3xl border border-border flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-primary" size={22} />
                    <span className="font-black text-muted">جاري تحميل بيانات العضو...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20 px-4">
            <div className="bg-card p-6 rounded-3xl border border-border mb-8 flex items-center gap-4 shadow-sm">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 bg-mist rounded-xl hover:bg-white border border-border transition-all"
                >
                    <ArrowRight size={24} />
                </button>

                <div>
                    <h1 className="text-2xl font-black text-ink">تعديل بيانات العضو</h1>
                    <p className="text-xs text-muted mt-1">يمكنك تعديل البيانات وربط كارت جديد عند الحاجة</p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">كارت QR</label>
                        <QrInput
                            value={formData.qr_id}
                            onChange={handleQrChange}
                            checking={qrChecking}
                            valid={qrValid}
                            error={qrError}
                            hint={qrHint}
                        />
                    </div>

                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">الاسم الكامل</label>
                        <div className="relative">
                            <User size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pr-10 p-4 bg-mist rounded-2xl outline-none border-2 border-transparent focus:border-primary font-bold"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">رقم الموبايل</label>
                        <div className="relative">
                            <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full pr-10 p-4 bg-mist rounded-2xl outline-none border-2 border-transparent focus:border-primary font-bold"
                                required
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">الجنس</label>
                        <select
                            value={formData.gender}
                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full p-4 bg-mist rounded-2xl font-bold outline-none border-2 border-transparent focus:border-primary"
                        >
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">السن</label>
                        <input
                            type="number"
                            min="5"
                            max="100"
                            value={formData.age}
                            onChange={e => setFormData({ ...formData, age: e.target.value })}
                            className="w-full p-4 bg-mist rounded-2xl outline-none border-2 border-transparent focus:border-primary font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">العنوان</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full pr-10 p-4 bg-mist rounded-2xl outline-none border-2 border-transparent focus:border-primary font-bold"
                            />
                        </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-muted mr-2 uppercase">ملاحظات</label>
                        <textarea
                            rows={4}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-4 bg-mist rounded-2xl outline-none border-2 border-transparent focus:border-primary font-bold resize-none"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving || qrChecking}
                    className="w-full bg-primary text-white p-5 rounded-2xl font-black text-lg shadow-lg hover:bg-primary-dark transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            جاري الحفظ...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            حفظ التعديلات
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
