import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    Plus, Edit2, Trash2, XCircle, Dumbbell,
    Clock, Hash, Save, X, Zap, Star, Trophy,
    Sparkles, Loader2, ToggleLeft, ToggleRight,
    Snowflake, AlertCircle
} from 'lucide-react';

// ─── الـ Price Helpers في مكان واحد ──────────────────────────
// غيّر IS_CENTS لو backend بيخزن بـ cents أو لأ
const IS_CENTS = true;

const toCents  = (v) => IS_CENTS ? Math.round(parseFloat(v || 0) * 100) : parseFloat(v || 0);
const fromCents = (v) => IS_CENTS ? (v / 100) : v;

// ─── Form Initial State ───────────────────────────────────────
const INITIAL_FORM = {
    name:           '',
    price_monthly:  '',
    price_3months:  '',
    price_6months:  '',
    duration_days:  30,
    sessions_count: '',
    session_price: '',
    max_freeze_days: 14,
    is_active:      true,
};

// ─── Skeleton Card ────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-card rounded-[2.5rem] border border-border p-8 animate-pulse space-y-6">
        <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-mist rounded-3xl" />
            <div className="space-y-2 flex-1">
                <div className="h-5 bg-mist rounded-xl w-3/4" />
                <div className="h-3 bg-mist rounded-xl w-1/3" />
            </div>
        </div>
        <div className="space-y-3">
            <div className="h-12 bg-mist rounded-2xl" />
            <div className="h-10 bg-mist rounded-2xl" />
            <div className="h-10 bg-mist rounded-2xl" />
        </div>
        <div className="h-14 bg-mist rounded-2xl" />
    </div>
);

// ─── Price Row ────────────────────────────────────────────────
function PriceRow({ label, price, active }) {
    // ✅ لو price = 0 أو null مش هيتعرض (للـ 3/6 شهور الاختيارية)
    if (!price && !active) return null;

    const display = fromCents(price);

    return (
        <div className={`flex justify-between items-center p-4 rounded-2xl
            ${active
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-mist/40 border border-border/30'}`}>
            <span className="text-[10px] font-black text-muted uppercase tracking-wider">
                {label}
            </span>
            <div className="flex items-baseline gap-1">
                <span className={`font-black tabular-nums
                    ${active ? 'text-primary text-xl' : 'text-ink text-base'}`}>
                    {display.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] font-bold text-muted">ج.م</span>
            </div>
        </div>
    );
}

// ─── Type Card ────────────────────────────────────────────────
function TypeCard({ type, onEdit, onDelete, onToggle }) {
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('سيتم حذف الباقة نهائياً، هل أنت متأكد؟')) return;
        setDeleting(true);
        await onDelete(type.id);
        setDeleting(false);
    };

    const handleToggle = async () => {
        setToggling(true);
        await onToggle(type.id, !type.is_active);
        setToggling(false);
    };

    return (
        <div className={`group bg-card rounded-[2.5rem] border p-8 shadow-sm
            hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden
            ${type.is_active ? 'border-border' : 'border-border/50 opacity-70'}`}>

            {/* Status badge */}
            <div className={`absolute top-5 left-5 flex items-center gap-1.5 px-3 py-1.5
                rounded-full text-[10px] font-black uppercase border
                ${type.is_active
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-danger/10 text-danger border-danger/20'}`}>
                {type.is_active
                    ? <><Zap size={10} fill="currentColor" /> نشط</>
                    : <><XCircle size={10} /> موقف</>}
            </div>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 mt-4">
                <div className="p-4 bg-mist rounded-2xl text-primary border border-border/50
                    group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <Dumbbell size={28} />
                </div>
                <div className="overflow-hidden">
                    <h3 className="font-black text-xl text-ink leading-tight truncate">
                        {type.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-muted">
                            <Clock size={11} /> {type.duration_days} يوم
                        </span>
                        {type.max_freeze_days > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-muted">
                                <Snowflake size={11} /> تجميد {type.max_freeze_days}ي
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Prices */}
            <div className="space-y-2.5 mb-6">
                <PriceRow label="سعر الشهر"    price={type.price_monthly} active />
                <PriceRow label="عرض 3 شهور"   price={type.price_3months} />
                <PriceRow label="عرض 6 شهور"   price={type.price_6months} />

                <div className="flex justify-between items-center pt-3 border-t border-dashed border-border">
                    <span className="text-[10px] font-black text-muted uppercase flex items-center gap-1">
                        <Hash size={12} /> الحصص
                    </span>
                    <span className="font-black text-ink bg-mist px-3 py-1 rounded-lg text-sm">
                        {type.sessions_count ? `${type.sessions_count} حصة` : '∞ مفتوح'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {/* Toggle active */}
                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={`p-3.5 rounded-2xl transition-all border disabled:opacity-50
                        ${type.is_active
                            ? 'bg-success/10 text-success border-success/20 hover:bg-success hover:text-white'
                            : 'bg-mist text-muted border-border hover:bg-success/10 hover:text-success'}`}
                    title={type.is_active ? 'إيقاف الباقة' : 'تفعيل الباقة'}>
                    {toggling
                        ? <Loader2 size={18} className="animate-spin" />
                        : type.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>

                {/* Edit */}
                <button
                    onClick={() => onEdit(type)}
                    className="flex-1 flex items-center justify-center gap-2 bg-ink text-white
                        py-3.5 rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95">
                    <Edit2 size={16} /> تعديل
                </button>

                {/* Delete */}
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-3.5 bg-danger/10 text-danger rounded-2xl border border-danger/20
                        hover:bg-danger hover:text-white transition-all active:scale-95 disabled:opacity-50">
                    {deleting
                        ? <Loader2 size={18} className="animate-spin" />
                        : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
}

// ─── Form Modal ───────────────────────────────────────────────
function FormModal({ editingId, formData, setFormData, onSubmit, onClose, submitting }) {
    const autoPrice3 = formData.price_monthly
        ? (parseFloat(formData.price_monthly) * 3 * 0.9).toFixed(0)
        : '';
    const autoPrice6 = formData.price_monthly
        ? (parseFloat(formData.price_monthly) * 6 * 0.8).toFixed(0)
        : '';

    const set = (field) => (e) =>
        setFormData((f) => ({ ...f, [field]: e.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-surface rounded-3xl shadow-2xl
                w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4
                    bg-mist border-b border-border shrink-0">
                    <h2 className="text-base font-black text-ink flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        {editingId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
                    </h2>
                    <button onClick={onClose}
                        className="p-2 hover:bg-white rounded-xl transition-colors text-muted hover:text-danger">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit}
                    className="p-5 space-y-4 overflow-y-auto flex-1">

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase
                            tracking-wider mb-1.5">
                            اسم الباقة *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={set('name')}
                            placeholder="مثلاً: باقة الذهبية"
                            required
                            className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                focus:border-primary focus:bg-white transition-all font-bold text-ink
                                outline-none placeholder:text-muted placeholder:font-normal"
                        />
                    </div>

                    {/* Price + Duration */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase
                                tracking-wider mb-1.5">
                                السعر الشهري (ج.م) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price_monthly}
                                onChange={set('price_monthly')}
                                required
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-success focus:bg-white transition-all font-black
                                    text-success outline-none"
                            />
                        </div>
                        <div>
    <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
        سعر الحصة (ج.م)
    </label>
    <input
        type="number"
        min="0"
        step="0.01"
        value={formData.session_price}
        onChange={set('session_price')}
        placeholder="اختياري"
        className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
            focus:border-primary focus:bg-white transition-all font-bold
            text-ink outline-none"
    />
</div>
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase
                                tracking-wider mb-1.5">
                                المدة (أيام) *
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.duration_days}
                                onChange={set('duration_days')}
                                required
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold
                                    text-ink outline-none"
                            />
                        </div>
                    </div>

                    {/* Bundle prices */}
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                        <p className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5">
                            <Star size={12} />
                            عروض التوفير — فارغ = تلقائي
                            {formData.price_monthly && (
                                <span className="font-normal normal-case text-muted mr-1">
                                    (3 شهور: {autoPrice3} ج.م — 6 شهور: {autoPrice6} ج.م)
                                </span>
                            )}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number" min="0" step="0.01"
                                value={formData.price_3months}
                                onChange={set('price_3months')}
                                placeholder={autoPrice3 || 'سعر 3 شهور'}
                                className="w-full p-3 bg-white rounded-xl font-bold text-sm
                                    border border-border outline-none focus:border-primary transition-all
                                    placeholder:text-muted placeholder:font-normal"
                            />
                            <input
                                type="number" min="0" step="0.01"
                                value={formData.price_6months}
                                onChange={set('price_6months')}
                                placeholder={autoPrice6 || 'سعر 6 شهور'}
                                className="w-full p-3 bg-white rounded-xl font-bold text-sm
                                    border border-border outline-none focus:border-primary transition-all
                                    placeholder:text-muted placeholder:font-normal"
                            />
                        </div>
                    </div>

                    {/* Sessions + Freeze */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase
                                tracking-wider mb-1.5">
                                عدد الحصص
                            </label>
                            <input
                                type="number" min="0"
                                value={formData.sessions_count}
                                onChange={set('sessions_count')}
                                placeholder="فارغ = غير محدود ∞"
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold
                                    text-ink outline-none placeholder:font-normal placeholder:text-muted"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase
                                tracking-wider mb-1.5 flex items-center gap-1">
                                <Snowflake size={10} /> أقصى تجميد (يوم)
                            </label>
                            <input
                                type="number" min="0" max="60"
                                value={formData.max_freeze_days}
                                onChange={set('max_freeze_days')}
                                className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                    focus:border-primary focus:bg-white transition-all font-bold
                                    text-ink outline-none"
                            />
                        </div>
                    </div>

                    {/* is_active Toggle ✅ كان ناقص في الكود الأصلي */}
                    <div className="flex items-center justify-between p-4 bg-mist rounded-2xl
                        border border-border/50">
                        <div>
                            <p className="text-sm font-black text-ink">حالة الباقة</p>
                            <p className="text-[10px] text-muted font-medium mt-0.5">
                                الباقات الموقفة لا تظهر للمستخدمين
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs
                                border transition-all
                                ${formData.is_active
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-mist text-muted border-border'}`}>
                            {formData.is_active
                                ? <><ToggleRight size={18} /> نشط</>
                                : <><ToggleLeft size={18} /> موقف</>}
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white
                            py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20
                            hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60">
                        {submitting
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Save size={18} />}
                        {editingId ? 'حفظ التعديلات' : 'إضافة الباقة'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────
export default function SubscriptionTypes() {
    const [types,       setTypes]       = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [submitting,  setSubmitting]  = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId,   setEditingId]   = useState(null);
    const [formData,    setFormData]    = useState(INITIAL_FORM);

    const fetchTypes = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/subscription-types');
            setTypes(res.data.data);
        } catch {
            toast.error('فشل في تحميل الباقات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTypes(); }, [fetchTypes]);

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
    };

    const openCreate = () => { resetForm(); setIsModalOpen(true); };

    const handleEdit = (type) => {
        setEditingId(type.id);
        setFormData({
            name:            type.name,
            price_monthly:   fromCents(type.price_monthly),
            price_3months:   fromCents(type.price_3months) || '',
            price_6months:   fromCents(type.price_6months) || '',
            session_price: fromCents(type.session_price) || '',
            duration_days:   type.duration_days,
            sessions_count:  type.sessions_count ?? '',
            max_freeze_days: type.max_freeze_days ?? 14,
            is_active:       type.is_active,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ Client-side validation
        if (!formData.name.trim()) {
            toast.error('اكتب اسم الباقة');
            return;
        }
        if (!formData.price_monthly || parseFloat(formData.price_monthly) <= 0) {
            toast.error('السعر الشهري مطلوب ويجب أن يكون أكبر من صفر');
            return;
        }
        if (parseInt(formData.duration_days) < 1) {
            toast.error('المدة يجب أن تكون يوم واحد على الأقل');
            return;
        }

        const monthly = parseFloat(formData.price_monthly);
        const payload = {
            name:            formData.name.trim(),
            duration_days:   parseInt(formData.duration_days),
            sessions_count:  formData.sessions_count ? parseInt(formData.sessions_count) : null,
            max_freeze_days: parseInt(formData.max_freeze_days) || 0,
            is_active:       formData.is_active,
            session_price: formData.session_price ? toCents(formData.session_price) : null,
            price_monthly:   toCents(monthly),
            // ✅ fallback تلقائي مع خصم 10% و20%
            price_3months:   formData.price_3months
                ? toCents(formData.price_3months)
                : toCents(monthly * 3 * 0.9),
            price_6months:   formData.price_6months
                ? toCents(formData.price_6months)
                : toCents(monthly * 6 * 0.8),
        };

        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/subscription-types/${editingId}`, payload);
                toast.success('تم تحديث الباقة ✅');
            } else {
                await api.post('/subscription-types', payload);
                toast.success('تمت إضافة الباقة بنجاح 🎉');
            }
            setIsModalOpen(false);
            resetForm();
            fetchTypes();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'حدث خطأ أثناء الحفظ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/subscription-types/${id}`);
            toast.success('تم حذف الباقة');
            setTypes(prev => prev.filter(t => t.id !== id)); // ✅ optimistic update
        } catch {
            toast.error('لا يمكن الحذف — الباقة مستخدمة حالياً');
        }
    };

    // ✅ toggle is_active بدون reload كامل
    const handleToggle = async (id, newState) => {
        try {
            await api.patch(`/subscription-types/${id}`, { is_active: newState });
            setTypes(prev => prev.map(t =>
                t.id === id ? { ...t, is_active: newState } : t
            ));
            toast.success(newState ? 'تم تفعيل الباقة ✅' : 'تم إيقاف الباقة');
        } catch {
            toast.error('فشل تغيير حالة الباقة');
        }
    };

    const activeCount   = types.filter(t => t.is_active).length;
    const inactiveCount = types.filter(t => !t.is_active).length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center
                gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-ink flex items-center gap-2">
                        <Trophy size={20} className="text-primary" /> أنواع الاشتراكات
                    </h1>
                    <div className="flex gap-3 mt-1.5">
                        <span className="text-xs font-bold text-muted">
                            الكل: <span className="font-black text-ink">{types.length}</span>
                        </span>
                        <span className="text-xs font-bold text-muted">
                            نشط: <span className="font-black text-success">{activeCount}</span>
                        </span>
                        {inactiveCount > 0 && (
                            <span className="text-xs font-bold text-muted">
                                موقف: <span className="font-black text-danger">{inactiveCount}</span>
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-3
                        rounded-2xl font-black text-sm hover:bg-primary/90 transition-all
                        shadow-md shadow-primary/20 active:scale-95">
                    <Plus size={18} /> إضافة باقة
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                ) : types.length === 0 ? (
                    /* ✅ Empty State */
                    <div className="col-span-full flex flex-col items-center justify-center
                        py-24 gap-4 opacity-40">
                        <Dumbbell size={48} />
                        <p className="font-black text-lg text-ink">لا توجد باقات بعد</p>
                        <p className="text-sm text-muted">أضف أول باقة للبدء</p>
                    </div>
                ) : (
                    types.map(type => (
                        <TypeCard
                            key={type.id}
                            type={type}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                        />
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <FormModal
                    editingId={editingId}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => { setIsModalOpen(false); resetForm(); }}
                    submitting={submitting}
                />
            )}
        </div>
    );
}
