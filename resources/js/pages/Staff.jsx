import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
    Users, Plus, Edit, Trash2, Shield, UserCircle,
    Lock, Unlock
} from 'lucide-react';

const PAGES = [
    { key: 'dashboard',     label: 'لوحة التحكم',       roles: ['admin'] },
    { key: 'attendance',    label: 'تسجيل الحضور',      roles: ['admin', 'reception', 'captain'] },
    { key: 'classes',       label: 'حصص اليوم',         roles: ['admin', 'reception', 'captain'] },
    { key: 'clients',       label: 'إدارة الأعضاء',     roles: ['admin', 'reception'] },
    { key: 'subscriptions', label: 'باقات الاشتراك',    roles: ['admin'] },
    { key: 'notifications', label: 'التنبيهات الذكية',  roles: ['admin'] },
    { key: 'debts',         label: 'الديون',            roles: ['admin'] },
    { key: 'finance',       label: 'المالية والشيفتات', roles: ['admin'] },
    { key: 'qr_cards',      label: 'مخزون الكروت',      roles: ['admin', 'reception'] },
    { key: 'reports',       label: 'التقارير الشاملة',  roles: ['admin'] },
    { key: 'staff',         label: 'إدارة الموظفين',    roles: ['admin'] },
    { key: 'audit_logs',    label: 'سجل الرقابة',       roles: ['admin'] },
    { key: 'whatsapp',      label: 'لوحة الواتساب',     roles: ['admin'] },
    { key: 'settings',      label: 'الإعدادات',         roles: ['admin'] },
];

const defaultPermissions = (role) =>
    PAGES.filter(p => p.roles.includes(role)).map(p => p.key);

export default function Staff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'reception',
        gender_access: 'both',
        permissions: defaultPermissions('reception'),
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            const staffData = res.data.data || res.data;
            setStaff(Array.isArray(staffData) ? staffData : []);
        } catch {
            toast.error('تعذر جلب بيانات الموظفين');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                phone: user.phone || '',
                email: user.email || '',
                password: '',
                role: user.role,
                gender_access: user.gender_access || 'both',
                permissions: user.permissions || defaultPermissions(user.role),
            });
        } else {
            setFormData({
                id: null,
                name: '',
                phone: '',
                email: '',
                password: '',
                role: 'reception',
                gender_access: 'both',
                permissions: defaultPermissions('reception'),
            });
        }
        setIsModalOpen(true);
    };

    const handleRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            role,
            permissions: defaultPermissions(role),
        }));
    };

    const togglePermission = (perm) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm],
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('جاري حفظ البيانات...');
        try {
            if (formData.id) {
                await api.put(`/users/${formData.id}`, formData);
                toast.success('تم تحديث بيانات الموظف', { id: toastId });
            } else {
                await api.post('/users', formData);
                toast.success('تم إضافة الموظف', { id: toastId });
            }
            setIsModalOpen(false);
            fetchStaff();
        } catch (error) {
            const errorMsg = error.response?.data?.errors
                ? Object.values(error.response.data.errors).flat()[0]
                : (error.response?.data?.message || 'حدث خطأ أثناء الحفظ');
            toast.error(errorMsg, { id: toastId });
        }
    };

    const availablePages = PAGES.filter(p => p.roles.includes(formData.role));

    if (loading) {
        return <div className="p-10 text-center font-bold text-primary">جاري تحميل بيانات الموظفين...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div>
                    <h1 className="text-2xl font-black text-ink">إدارة الموظفين</h1>
                    <p className="text-muted text-sm mt-1">إضافة الصلاحيات + فرع الوصول</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center bg-primary text-white px-6 py-3 rounded-xl font-bold"
                >
                    <Plus size={18} className="ml-2" />
                    إضافة موظف
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-mist text-muted text-sm border-b border-border">
                        <tr>
                            <th className="p-4 font-bold">الموظف</th>
                            <th className="p-4 font-bold">الدور</th>
                            <th className="p-4 font-bold">الوصول</th>
                            <th className="p-4 font-bold">الصفحات</th>
                            <th className="p-4 font-bold text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {staff.map(user => (
                            <tr key={user.id}>
                                <td className="p-4 font-bold">{user.name}</td>
                                <td className="p-4">{user.role}</td>
                                <td className="p-4">{user.gender_access || 'both'}</td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {(user.permissions || []).map(p => (
                                            <span key={p} className="px-2 py-1 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
                                                {PAGES.find(x => x.key === p)?.label || p}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={() => handleOpenModal(user)} className="p-2 bg-mist text-primary rounded-lg">
                                        <Edit size={16} />
                                    </button>
                                    <button className="p-2 bg-red-50 text-red-600 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-card w-full max-w-xl rounded-2xl p-6 border border-border max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black mb-4">
                            {formData.id ? 'تعديل الموظف' : 'إضافة موظف'}
                        </h3>

                        <form onSubmit={handleSave} className="space-y-4">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="الاسم"
                                className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                required
                            />

                            <input
                                type="text"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="رقم الهاتف"
                                className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                required
                            />

                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="البريد الإلكتروني"
                                className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                required
                            />

                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="كلمة المرور"
                                className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                required={!formData.id}
                            />

                            <div>
                                <label className="block text-sm font-bold mb-2">الدور</label>
                                <select
                                    value={formData.role}
                                    onChange={e => handleRoleChange(e.target.value)}
                                    className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                >
                                    <option value="reception">موظف استقبال</option>
                                    <option value="captain">كابتن / مدرب</option>
                                    <option value="admin">أدمن</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">فرع الوصول</label>
                                <select
                                    value={formData.gender_access}
                                    onChange={e => setFormData({ ...formData, gender_access: e.target.value })}
                                    className="w-full px-4 py-3 bg-mist border border-border rounded-xl"
                                >
                                    <option value="male">رجال فقط</option>
                                    <option value="female">سيدات فقط</option>
                                    <option value="both">الاثنين</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold">الصفحات المسموح بها</label>
                                    <div className="flex gap-3 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, permissions: availablePages.map(p => p.key) })}
                                            className="text-primary font-bold flex items-center gap-1"
                                        >
                                            <Unlock size={12} /> تحديد الكل
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, permissions: [] })}
                                            className="text-red-500 font-bold flex items-center gap-1"
                                        >
                                            <Lock size={12} /> إلغاء الكل
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-3 bg-mist rounded-xl border border-border">
                                    {availablePages.map(page => (
                                        <label key={page.key} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(page.key)}
                                                onChange={() => togglePermission(page.key)}
                                            />
                                            <span className="text-sm font-bold">{page.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-mist py-3 rounded-xl font-bold">
                                    إلغاء
                                </button>
                                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold">
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
