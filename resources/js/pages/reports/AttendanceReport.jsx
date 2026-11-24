import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, AreaChart, Area
} from 'recharts';
import { Calendar, Users, Clock, TrendingUp, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AttendanceReport() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/stats').then(res => {
            setStats(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-mist">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-8 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );

    // داتا الساعات (Peak Hours)
    const peakHoursData = [
        { hour: '08:00', count: 15 }, { hour: '12:00', count: 45 },
        { hour: '16:00', count: 65 }, { hour: '19:00', count: 110 },
        { hour: '21:00', count: 85 }, { hour: '23:00', count: 30 },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 animate-in slide-in-from-bottom-10 duration-700 font-arabic">
            {/* Nav Header */}
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-border shadow-lg sticky top-6 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 bg-mist hover:bg-ink hover:text-white rounded-2xl transition-all shadow-inner">
                        <ArrowRight size={24}/>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-ink italic tracking-tighter">ذكاء الزيارات والإشغال</h1>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Attendance Artificial Intelligence</p>
                    </div>
                </div>
                <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                    <Download size={20}/> تحميل البيانات
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 🌊 خريطة الموجة الأسبوعية */}
                <div className="lg:col-span-2 bg-card p-10 rounded-[3rem] border border-border shadow-xl">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center"><Calendar size={24}/></div>
                        <h3 className="font-black text-xl text-ink italic uppercase">كثافة الحضور الأسبوعية</h3>
                    </div>
                    <div className="h-[350px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.attendance.weekly_dist}>
                                <defs>
                                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff6d00" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#ff6d00" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12, fontWeight:'900'}} />
                                <Tooltip contentStyle={{borderRadius:'24px', border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.2)'}} />
                                <Area type="monotone" dataKey="count" stroke="#ff6d00" strokeWidth={6} fillOpacity={1} fill="url(#attendanceGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 🚻 بطاقة الجندر النيون */}
                <div className="bg-gradient-to-b from-ink to-black text-white p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/5">
                    <div className="relative z-10">
                        <h3 className="font-black text-xl mb-10 flex items-center gap-3 italic"><Users size={24} className="text-primary"/> تحليل النوع</h3>
                        <div className="space-y-8">
                            <GenderBar label="رجال" percent={68} color="bg-primary" />
                            <GenderBar label="سيدات" percent={32} color="bg-pink-500" />
                        </div>
                    </div>
                    <div className="relative z-10 p-6 bg-white/5 rounded-3xl border border-white/10 mt-10">
                        <p className="text-[10px] text-gray-400 font-bold leading-relaxed italic text-center">
                            تم تحليل أنماط الحضور بناءً على 4,820 سجل زيارة مسجلة عبر تطبيق GymOS.
                        </p>
                    </div>
                </div>

                {/* 🕒 ساعات الذروة (Heat-map Bar) */}
                <div className="lg:col-span-3 bg-card p-10 rounded-[3rem] border border-border shadow-xl">
                    <h3 className="font-black text-xl text-ink mb-10 flex items-center gap-3 italic uppercase border-r-4 border-primary pr-4">
                        <Clock size={24} className="text-primary"/> خريطة ساعات الذروة الحرارية
                    </h3>
                    <div className="h-[300px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHoursData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontWeight:'900'}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'20px'}} />
                                <Bar dataKey="count" radius={[15, 15, 15, 15]} barSize={55}>
                                    {peakHoursData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.count > 100 ? '#ef4444' : entry.count > 60 ? '#ff6d00' : '#fbbf24'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-8 justify-center border-t border-border pt-8">
                        <LegendItem color="bg-yellow-400" label="هادئ" />
                        <LegendItem color="bg-orange-500" label="متوسط" />
                        <LegendItem color="bg-red-500" label="ذروة (زحمة)" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function GenderBar({ label, percent, color }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
                <span className="text-sm font-black italic uppercase tracking-widest">{label}</span>
                <span className="text-2xl font-black italic">{percent}%</span>
            </div>
            <div className="h-4 bg-white/10 rounded-full overflow-hidden p-1">
                <div className={`${color} h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,109,0,0.5)]`} style={{width: `${percent}%`}}></div>
            </div>
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div className="flex items-center gap-2 text-xs font-black text-muted uppercase tracking-tighter">
            <div className={`w-3 h-3 rounded-full ${color} shadow-sm`}></div>
            {label}
        </div>
    );
}
