import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dumbbell } from 'lucide-react';

export default function Login() {
    const [phone, setPhone] = useState(''); // غيرناها لـ phone
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(phone, password); // بنبعت الـ phone
            toast.success(`أهلاً بك يا ${user.name}`);
            navigate(user.role === 'admin' ? '/dashboard' : '/attendance', { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.message || 'بيانات الدخول غير صحيحة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-mist p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl p-8 border border-border">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary-pale p-4 rounded-full mb-3 text-primary">
                        <Dumbbell size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-ink">GymOS</h1>
                    <p className="text-muted text-sm mt-1">سجل دخولك لمتابعة عملك</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">رقم الهاتف</label>
                        <input
                            type="tel"
                            dir="ltr"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-ink mb-1">كلمة المرور</label>
                        <input
                            type="password"
                            dir="ltr"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-[#c04b24] text-white font-bold py-3 rounded-lg transition-all disabled:opacity-70"
                    >
                        {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                    </button>
                </form>
            </div>
        </div>
    );
}
