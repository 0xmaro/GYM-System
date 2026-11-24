import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // استيراد اللينك للتنقل
import {
    Save,
    Settings as SettingsIcon,
    MessageCircle,
    Bell,
    Dumbbell,
    Plus,
    Trash2,
    Clock,
    Edit2,
    ChevronLeft, // أيقونة السهم
    ExternalLink // أيقونة الرابط الخارجي
} from 'lucide-react';

export default function SettingsIndex() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subTypes, setSubTypes] = useState([]);

    const [settings, setSettings] = useState({
        gym_name: 'My Gym',
        whatsapp_send_start: '09:00',
        whatsapp_send_end: '21:00',
        expiry_reminder_days: '[3,7]',
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [setRes, typeRes] = await Promise.all([
                api.get('/settings'),
                api.get('/subscription-types')
            ]);
            setSettings(prev => ({ ...prev, ...setRes.data }));
            setSubTypes(typeRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleDeleteType = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
        try {
            await api.delete(`/subscription-types/${id}`);
            toast.success('تم حذف الباقة');
            setSubTypes(subTypes.filter(t => t.id !== id));
        } catch (e) {
            toast.error('لا يمكن حذف باقة مرتبطة بمشتركين حاليين');
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('جاري حفظ الإعدادات...');
        try {
            await api.put('/settings', settings);
            toast.success('تم حفظ الإعدادات بنجاح!', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء الحفظ', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-primary animate-pulse italic">جاري تحميل الإعدادات...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl shadow-sm border border-border">
                <div className="flex items-center">
                    <div className="bg-primary-pale p-3 rounded-2xl text-primary ml-4 shadow-inner">
                        <SettingsIcon size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-ink tracking-tight">إعدادات النظام</h1>
                        <p className="text-muted text-sm font-medium">تحكم في هوية الجيم وأتمتة الرسائل</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Column 1: Settings Form */}
                <div className="xl:col-span-2 space-y-6">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border">
                            <h2 className="text-lg font-black text-ink mb-6 flex items-center gap-2">
                                <SettingsIcon size={20} className="text-primary" /> هوية الصالة الرياضية
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-muted uppercase mb-2 mr-2">اسم الجيم (يظهر في الرسائل)</label>
                                    <input
                                        type="text"
                                        value={settings.gym_name}
                                        onChange={(e) => handleChange('gym_name', e.target.value)}
                                        className="w-full px-5 py-4 bg-mist border-transparent rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-ink"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border">
                            <h2 className="text-lg font-black text-ink mb-6 flex items-center gap-2">
                                <MessageCircle size={20} className="text-success" /> مواعيد إرسال الواتساب التلقائي
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-muted uppercase mb-2 mr-2">وقت البدء</label>
                                    <input
                                        type="time"
                                        value={settings.whatsapp_send_start}
                                        onChange={(e) => handleChange('whatsapp_send_start', e.target.value)}
                                        className="w-full px-5 py-4 bg-mist border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none font-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-muted uppercase mb-2 mr-2">وقت التوقف</label>
                                    <input
                                        type="time"
                                        value={settings.whatsapp_send_end}
                                        onChange={(e) => handleChange('whatsapp_send_end', e.target.value)}
                                        className="w-full px-5 py-4 bg-mist border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none font-black"
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="w-full flex items-center justify-center bg-ink text-white p-5 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-ink/20 group">
                            <Save size={22} className="ml-2 group-hover:scale-110 transition-transform" />
                            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات العامة'}
                        </button>
                    </form>
                </div>

                {/* Column 2: Quick SubTypes List */}
                <div className="xl:col-span-1">
                    <div className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden sticky top-6">
                        <div className="p-6 border-b border-border bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-black text-ink flex items-center gap-2">
                                <Dumbbell size={22} className="text-primary" /> الباقات
                            </h2>
                            {/* الزر الجديد يذهب لصفحة الإدارة المتقدمة */}
                            <Link
                                to="/settings/subscription-types"
                                className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/20 group"
                                title="إدارة الباقات المتقدمة"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            </Link>
                        </div>

                        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {subTypes.length === 0 ? (
                                <div className="text-center py-10 opacity-30 italic font-bold">لا يوجد باقات</div>
                            ) : (
                                subTypes.map(type => (
                                    <div key={type.id} className="group bg-mist p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-ink text-sm">{type.name}</h3>
                                            <button
                                                onClick={() => handleDeleteType(type.id)}
                                                className="text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-primary font-black">{type.price_monthly / 100} ج.م</span>
                                            <span className="text-muted font-bold flex items-center gap-1">
                                                <Clock size={12} /> {type.duration_days} يوم
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* زر إضافي فخم في أسفل القائمة */}
                        <div className="p-4 bg-mist/50 border-t border-border">
                            <Link
                                to="/settings/subscription-types"
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-border text-ink rounded-xl text-xs font-black hover:bg-primary hover:text-white hover:border-primary transition-all group"
                            >
                                إدارة الأسعار والحصص تفصيلياً
                                <ExternalLink size={14} className="group-hover:translate-x-[-2px] transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
