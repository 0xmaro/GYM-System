import React, { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    Plus, Edit2, Trash2, Loader2, Dumbbell, Save, X,
    ToggleLeft, ToggleRight, Sparkles, BadgeDollarSign
} from 'lucide-react';

const IS_CENTS = true;
const toCents = (v) => IS_CENTS ? Math.round(parseFloat(v || 0) * 100) : parseFloat(v || 0);
const fromCents = (v) => IS_CENTS ? (Number(v || 0) / 100) : Number(v || 0);

const INITIAL_FORM = {
    name: '',
    default_price: '',
    is_active: true,
    notes: '',
};

function SkeletonCard() {
    return (
        <div className="bg-card rounded-[2rem] border border-border p-6 animate-pulse space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-mist rounded-2xl" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-mist rounded-lg w-1/2" />
                    <div className="h-3 bg-mist rounded-lg w-1/3" />
                </div>
            </div>
            <div className="h-10 bg-mist rounded-xl" />
            <div className="h-10 bg-mist rounded-xl" />
        </div>
    );
}

function FormModal({ formData, setFormData, editingId, onSubmit, onClose, submitting }) {
    const set = (field) => (e) =>
        setFormData((f) => ({ ...f, [field]: e.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-surface rounded-3xl shadow-2xl
                w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between px-6 py-4 bg-mist border-b border-border">
                    <h2 className="text-base font-black text-ink flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        {editingId ? 'تعديل نوع الحصة' : 'إضافة نوع حصة'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-xl transition-colors text-muted hover:text-danger"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            اسم نوع الحصة *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={set('name')}
                            placeholder="مثلاً: حصة يومية / PT / CrossFit"
                            required
                            className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                focus:border-primary focus:bg-white transition-all font-bold text-ink
                                outline-none placeholder:text-muted placeholder:font-normal"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            السعر الافتراضي (ج.م) *
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.default_price}
                            onChange={set('default_price')}
                            required
                            className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                focus:border-success focus:bg-white transition-all font-black text-success
                                outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                            ملاحظات
                        </label>
                        <textarea
                            rows={4}
                            value={formData.notes}
                            onChange={set('notes')}
                            placeholder="ملاحظات اختيارية"
                            className="w-full p-4 bg-mist rounded-2xl border-2 border-transparent
                                focus:border-primary focus:bg-white transition-all font-medium text-ink
                                outline-none placeholder:text-muted resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-mist rounded-2xl border border-border/50">
                        <div>
                            <p className="text-sm font-black text-ink">حالة النوع</p>
                            <p className="text-[10px] text-muted font-medium mt-0.5">
                                الأنواع الموقفة لا تظهر في اختيار الحصة
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs border transition-all
                                ${formData.is_active
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-mist text-muted border-border'}`}
                        >
                            {formData.is_active
                                ? <><ToggleRight size={18} /> نشط</>
                                : <><ToggleLeft size={18} /> موقف</>}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white
                            py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20
                            hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {editingId ? 'حفظ التعديلات' : 'إضافة النوع'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function SessionTypeCard({ item, onEdit, onDelete, onToggle }) {
    const [loadingDelete, setLoadingDelete] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm('سيتم حذف نوع الحصة، هل أنت متأكد؟')) return;
        setLoadingDelete(true);
        await onDelete(item.id);
        setLoadingDelete(false);
    };

    const handleToggle = async () => {
        setLoadingToggle(true);
        await onToggle(item.id, !item.is_active);
        setLoadingToggle(false);
    };

    return (
        <div className={`group bg-card rounded-[2rem] border p-6 shadow-sm hover:shadow-xl hover:-translate-y-1
            transition-all duration-300 ${item.is_active ? 'border-border' : 'border-border/50 opacity-70'}`}>

            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="p-4 bg-mist rounded-2xl text-primary border border-border/50 shrink-0
                        group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <Dumbbell size={24} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-lg text-ink truncate">{item.name}</h3>
                        <p className="text-xs text-muted font-bold mt-1">
                            {item.is_active ? 'نشط' : 'موقف'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={loadingToggle}
                    className={`p-3 rounded-2xl transition-all border disabled:opacity-50
                        ${item.is_active
                            ? 'bg-success/10 text-success border-success/20 hover:bg-success hover:text-white'
                            : 'bg-mist text-muted border-border hover:bg-success/10 hover:text-success'}`}
                >
                    {loadingToggle
                        ? <Loader2 size={18} className="animate-spin" />
                        : item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                        <BadgeDollarSign size={12} /> السعر الافتراضي
                    </span>
                    <span className="font-black text-xl text-success">
                        {fromCents(item.default_price).toLocaleString('ar-EG')}
                        <span className="text-[11px] text-muted mr-1">ج.م</span>
                    </span>
                </div>
            </div>

            <div className="min-h-[48px] mb-4">
                <p className="text-sm text-muted leading-6 line-clamp-2">
                    {item.notes || 'لا توجد ملاحظات'}
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 bg-ink text-white
                        py-3 rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95"
                >
                    <Edit2 size={16} /> تعديل
                </button>

                <button
                    onClick={handleDelete}
                    disabled={loadingDelete}
                    className="p-3 bg-danger/10 text-danger rounded-2xl border border-danger/20
                        hover:bg-danger hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                    {loadingDelete ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
}

export default function SessionTypes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/session-types');
            setItems(res.data.data || []);
        } catch {
            toast.error('فشل في تحميل أنواع الحصص');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            name: item.name ?? '',
            default_price: fromCents(item.default_price),
            is_active: !!item.is_active,
            notes: item.notes ?? '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('اكتب اسم نوع الحصة');
            return;
        }

        if (formData.default_price === '' || parseFloat(formData.default_price) < 0) {
            toast.error('اكتب سعر صحيح');
            return;
        }

        const payload = {
            name: formData.name.trim(),
            default_price: toCents(formData.default_price),
            is_active: formData.is_active,
            notes: formData.notes?.trim() || null,
        };

        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/session-types/${editingId}`, payload);
                toast.success('تم تحديث نوع الحصة ✅');
            } else {
                await api.post('/session-types', payload);
                toast.success('تمت إضافة نوع الحصة 🎉');
            }

            setIsModalOpen(false);
            resetForm();
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'حدث خطأ أثناء الحفظ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/session-types/${id}`);
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success('تم حذف نوع الحصة');
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'لا يمكن حذف هذا النوع');
        }
    };

    const handleToggle = async (id, newState) => {
        try {
            await api.put(`/session-types/${id}`, { is_active: newState });
            setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: newState } : i));
            toast.success(newState ? 'تم تفعيل النوع ✅' : 'تم إيقاف النوع');
        } catch {
            toast.error('فشل تغيير الحالة');
        }
    };

    const activeCount = items.filter(i => i.is_active).length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                bg-card p-6 rounded-3xl border border-border shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-ink flex items-center gap-2">
                        <Dumbbell size={20} className="text-primary" />
                        أنواع الحصص
                    </h1>
                    <div className="flex gap-3 mt-1.5">
                        <span className="text-xs font-bold text-muted">
                            الكل: <span className="font-black text-ink">{items.length}</span>
                        </span>
                        <span className="text-xs font-bold text-muted">
                            نشط: <span className="font-black text-success">{activeCount}</span>
                        </span>
                    </div>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl
                        font-black text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
                >
                    <Plus size={18} /> إضافة نوع حصة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                ) : items.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 opacity-40">
                        <Dumbbell size={48} />
                        <p className="font-black text-lg text-ink">لا توجد أنواع حصص بعد</p>
                        <p className="text-sm text-muted">أضف أول نوع حصة للبدء</p>
                    </div>
                ) : (
                    items.map(item => (
                        <SessionTypeCard
                            key={item.id}
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                        />
                    ))
                )}
            </div>

            {isModalOpen && (
                <FormModal
                    formData={formData}
                    setFormData={setFormData}
                    editingId={editingId}
                    onSubmit={handleSubmit}
                    onClose={() => { setIsModalOpen(false); resetForm(); }}
                    submitting={submitting}
                />
            )}
        </div>
    );
}
