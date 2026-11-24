import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    TrendingUp, Users, DollarSign, Calendar, Download,
    ChevronLeft, ArrowUpRight, Snowflake, AlertCircle, Briefcase, Activity
} from 'lucide-react';

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchReports(); }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/reports/stats');
            setStats(res.data);
        } catch (error) { console.error("فشل جلب التقارير"); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xl font-black text-primary animate-pulse italic">جاري معالجة البيانات الضخمة...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-20 px-4 animate-in fade-in duration-700">
            {/* Header مع تدرج لوني */}
            <div className="relative overflow-hidden bg-ink p-10 rounded-[3rem] shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                            <Activity className="text-primary animate-bounce" size={32} /> مركز ذكاء الأعمال
                        </h1>
                        <p className="text-gray-400 font-bold mt-2">تحليل أداء GymOS اللحظي - {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <button className="group bg-primary text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/30">
                        <Download size={24} className="group-hover:translate-y-1 transition-transform" /> تصدير التقرير التنفيذي
                    </button>
                </div>
                {/* خلفية فنية */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[120px] rounded-full"></div>
            </div>

            {/* 📊 كروت الإحصائيات (Glass Effect) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="إجمالي الدخل" value={stats?.financials.total_income / 100} icon={<DollarSign />} color="emerald" unit="ج.م" />
                <StatCard title="نمو الشهر" value={stats?.financials.month_income / 100} icon={<TrendingUp />} color="blue" unit="ج.م" />
                <StatCard title="النشاط اليومي" value={stats?.attendance.today_count} icon={<Users />} color="orange" unit="لاعب" />
                <StatCard title="الولاء النشط" value={stats?.subscriptions.active} icon={<Calendar />} color="purple" unit="عضو" />
            </div>

            {/* 🔗 شبكة الوصول السريع (Neon Style) */}
            <div className="bg-card/50 backdrop-blur-md p-2 rounded-[2.5rem] border border-border flex flex-wrap justify-center gap-4">
                <QuickLink to="/reports/attendance" title="ذكاء الحضور" icon={<Users size={20}/>} color="blue" />
                <QuickLink to="/finance" title="الخزينة" icon={<DollarSign size={20}/>} color="emerald" />
                <QuickLink to="/clients?status=frozen" title="المجمدين" icon={<Snowflake size={20}/>} color="sky" />
                <QuickLink to="/notifications" title="الانتهاء" icon={<AlertCircle size={20}/>} color="rose" />
                <QuickLink to="/staff" title="الفريق" icon={<Briefcase size={20}/>} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* الرسم البياني المالي (Professional Chart) */}
                <div className="lg:col-span-2 bg-card p-10 rounded-[3rem] border border-border shadow-xl relative group">
                    <h3 className="text-xl font-black text-ink mb-10 flex items-center gap-3 border-r-4 border-emerald-500 pr-4">
                        المركز المالي الحالي
                    </h3>
                    <div className="h-[400px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'الإيرادات', val: stats?.financials.total_income / 100 },
                                { name: 'المصروفات', val: stats?.financials.total_expenses / 100 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontWeight:'900', fontSize:14}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'24px', border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.2)'}} />
                                <Bar dataKey="val" radius={[20, 20, 20, 20]} barSize={80}>
                                    <Cell fill="url(#greenGradient)" />
                                    <Cell fill="url(#redGradient)" />
                                </Bar>
                                <defs>
                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" />
                                        <stop offset="100%" stopColor="#e11d48" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* كارت دعائي لتقرير الحضور (The "Wow" Card) */}
                <Link to="/reports/attendance" className="bg-gradient-to-br from-ink to-black rounded-[3rem] p-10 text-white flex flex-col justify-between hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 group relative overflow-hidden border border-white/10">
                    <ArrowUpRight className="absolute top-10 left-10 text-primary group-hover:scale-125 transition-transform" size={48}/>
                    <div className="relative z-10">
                        <div className="bg-primary/20 w-fit p-4 rounded-3xl mb-6">
                            <TrendingUp className="text-primary" size={32} />
                        </div>
                        <h3 className="text-4xl font-black italic leading-tight">حلل زحمة <br/> صالتك بدقة</h3>
                        <p className="text-gray-400 font-bold mt-4 leading-relaxed">اكتشف ساعات الذروة ونظم الحصص التدريبية بناءً على ذكاء البيانات.</p>
                    </div>
                    <div className="mt-8 flex items-center gap-4 text-primary font-black uppercase tracking-widest text-sm group-hover:translate-x-4 transition-transform duration-500 font-arabic">
                        استكشف الآن <ChevronLeft size={24}/>
                    </div>
                    {/* خلفية متحركة */}
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all"></div>
                </Link>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, unit }) {
    const colors = {
        emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
        blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/20",
        orange: "from-orange-500/10 to-orange-500/5 text-orange-600 border-orange-500/20",
        purple: "from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-500/20",
    };
    return (
        <div className={`bg-gradient-to-b ${colors[color]} p-8 rounded-[2.5rem] border shadow-sm group hover:scale-[1.03] transition-all duration-300`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-white shadow-md group-hover:rotate-12 transition-transform`}>{icon}</div>
                <div className="w-2 h-2 rounded-full bg-current animate-ping"></div>
            </div>
            <p className="text-muted text-xs font-black uppercase tracking-widest mb-1">{title}</p>
            <h4 className="text-3xl font-black text-ink tracking-tighter">
                {value?.toLocaleString()} <span className="text-xs font-bold opacity-30 tracking-normal">{unit}</span>
            </h4>
        </div>
    );
}

function QuickLink({ to, title, icon, color }) {
    const colors = {
        blue: "text-blue-500 hover:bg-blue-500 hover:text-white border-blue-500/20",
        emerald: "text-emerald-500 hover:bg-emerald-500 hover:text-white border-emerald-500/20",
        sky: "text-sky-500 hover:bg-sky-500 hover:text-white border-sky-500/20",
        rose: "text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/20",
        indigo: "text-indigo-500 hover:bg-indigo-500 hover:text-white border-indigo-500/20",
    };
    return (
        <Link to={to} className={`flex items-center gap-3 px-6 py-4 bg-white border rounded-2xl transition-all font-black text-xs uppercase tracking-tighter shadow-sm ${colors[color]}`}>
            {icon} {title}
        </Link>
    );
}
