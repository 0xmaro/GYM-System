import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import {
    Users, CalendarCheck, Wallet, AlertTriangle,
    Activity, Clock, TrendingUp, RefreshCw,
    LogIn, ChevronRight, Loader2,
    DollarSign, Zap, Target, BarChart2,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import toast from 'react-hot-toast';


// ─── Helpers ──────────────────────────────────────────────────
const fmt = (v) =>
    Number(v ?? 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

const fmtMoney = (v) => `${fmt(v)} ج.م`;


// ─── Sub-components ───────────────────────────────────────────
const MiniStat = ({ label, value, color = 'text-ink', prefix = '' }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] text-muted font-bold uppercase tracking-wider leading-none">
            {label}
        </span>
        <span className={`text-base font-black leading-none ${color} truncate`}>
            {prefix}{value ?? 0}
        </span>
    </div>
);

const KpiCard = ({
    icon: Icon,
    iconBg,
    iconColor,
    badge,
    badgeColor,
    label,
    value,
    children,
    alert,
    trend,
    trendVal,
}) => (
    <div
        className={`min-w-0 bg-card p-5 rounded-2xl border shadow-sm transition-all group relative overflow-hidden
        ${alert ? 'border-danger/40' : 'border-border hover:shadow-md'}`}
    >
        {alert && <div className="absolute inset-0 bg-danger/3 pointer-events-none rounded-2xl" />}

        <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
            <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${iconBg} ${iconColor}`}>
                <Icon size={20} />
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
                {badge && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeColor}`}>
                        {badge}
                    </span>
                )}

                {trend !== undefined && (
                    <span className={`text-[9px] font-black flex items-center gap-0.5 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trendVal ?? trend)}%
                    </span>
                )}
            </div>
        </div>

        <p className="text-muted text-[11px] font-bold mb-1 relative z-10">{label}</p>
        <div className="text-2xl font-black text-ink relative z-10 min-w-0 break-words">{value}</div>

        {children && (
            <div className="mt-3 pt-3 border-t border-dashed border-border relative z-10">
                {children}
            </div>
        )}
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-sm min-w-[150px]">
            <p className="font-black text-ink mb-2 text-xs">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex justify-between gap-4 text-xs">
                    <span className="font-bold" style={{ color: p.color }}>
                        {p.name === 'amount' ? '💰 إيرادات' : '📤 مصروفات'}
                    </span>
                    <span className="font-black text-ink">{fmtMoney(p.value)}</span>
                </div>
            ))}
        </div>
    );
};


// ─── Shared Chart Wrapper ─────────────────────────────────────
const ChartBox = ({ children, height = 'h-[220px]' }) => (
    <div className={`min-w-0 w-full ${height}`} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
            {children}
        </ResponsiveContainer>
    </div>
);


// ─── Attendance Mini Chart ────────────────────────────────────
const AttendanceSparkBar = ({ data }) => {
    if (!data?.length) {
        return (
            <div className="min-w-0 w-full h-16 rounded-xl bg-mist/60 border border-dashed border-border flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted">لا توجد بيانات</span>
            </div>
        );
    }

    return (
        <ChartBox height="h-16">
            <BarChart
                data={data}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                barSize={8}
            >
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                    {data.map((_, i) => (
                        <Cell
                            key={i}
                            fill={i === data.length - 1 ? '#10b981' : '#e2e8f0'}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartBox>
    );
};


// ─── Main Component ───────────────────────────────────────────
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setRefreshing(true);

        try {
            const res = await api.get('/dashboard');
            setData(res.data.data);
        } catch {
            toast.error('فشل في تحديث بيانات لوحة التحكم');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-primary">
                    <Loader2 size={40} className="animate-spin" />
                    <span className="text-base font-black tracking-tight text-muted">
                        جاري مزامنة بيانات GymOS...
                    </span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <AlertTriangle size={56} className="text-danger opacity-20" />
                <p className="text-base font-bold text-muted">عفواً، لا يمكن الوصول للبيانات حالياً</p>
                <button
                    onClick={fetchDashboardData}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    const chartData = data.revenue_chart_data ?? [];
    const todayNet = data.today_net ?? data.today_revenue ?? 0;
    const netColor = todayNet >= 0 ? 'text-success' : 'text-danger';

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-10 px-4 min-w-0">
            {/* ── Header ── */}
            <div
                className="relative flex flex-col md:flex-row md:items-center justify-between gap-4
                bg-card px-6 py-4 rounded-2xl shadow-sm border border-border overflow-hidden min-w-0"
            >
                <div className="relative z-10 min-w-0">
                    <h1 className="text-lg font-black text-ink flex items-center gap-2">
                        <Zap size={18} className="text-warning" />
                        صباح النشاط، {data.user_name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 text-muted text-xs mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        صلاحية: <span className="text-primary font-bold">{data.gender_access_label}</span>
                        <span className="text-border">·</span>
                        <span>
                            {new Date().toLocaleDateString('ar-EG', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 z-10">
                    <button
                        onClick={fetchDashboardData}
                        disabled={refreshing}
                        className="p-2.5 bg-mist hover:bg-primary/10 hover:text-primary text-muted
                            rounded-xl transition-all disabled:opacity-50 border border-border"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>

                    <div className="bg-ink text-white px-4 py-2 rounded-xl border border-white/10 text-right">
                        <p className="text-[8px] opacity-40 uppercase font-black tracking-widest leading-none mb-0.5">
                            الوقت
                        </p>
                        <p className="text-sm font-black tabular-nums leading-none">
                            {now.toLocaleTimeString('ar-EG')}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── KPI Row 1: المالية ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
                <KpiCard
                    icon={Wallet}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    badge="اليوم"
                    badgeColor="text-success bg-success/10"
                    label="صافي إيراد اليوم"
                    value={<span className={netColor}>{fmtMoney(todayNet)}</span>}
                >
                    <div className="flex justify-between gap-3 min-w-0">
                        <MiniStat label="إيرادات" value={fmtMoney(data.today_revenue ?? 0)} color="text-success" />
                        <MiniStat label="مصروفات" value={fmtMoney(data.today_expenses ?? 0)} color="text-danger" />
                    </div>
                </KpiCard>

                <KpiCard
                    icon={BarChart2}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    badge={new Date().toLocaleDateString('ar-EG', { month: 'long' })}
                    badgeColor="text-primary bg-primary/10"
                    label="إيراد الشهر"
                    value={fmtMoney(data.month_revenue ?? 0)}
                >
                    <AttendanceSparkBar data={chartData} />
                </KpiCard>

                <KpiCard
                    icon={DollarSign}
                    iconBg={data.pending_debts_total > 0 ? 'bg-warning/10' : 'bg-success/10'}
                    iconColor={data.pending_debts_total > 0 ? 'text-warning' : 'text-success'}
                    label="ديون معلقة"
                    value={
                        <span className={data.pending_debts_total > 0 ? 'text-warning' : 'text-success'}>
                            {fmtMoney(data.pending_debts_total ?? 0)}
                        </span>
                    }
                    alert={data.pending_debts_total > 0}
                    badge={data.pending_debts_total > 0 ? 'تحتاج متابعة' : 'لا ديون'}
                    badgeColor={data.pending_debts_total > 0 ? 'text-warning bg-warning/10' : 'text-success bg-success/10'}
                >
                    <Link
                        to="/debts"
                        className="text-[10px] font-black text-primary hover:underline flex items-center gap-1"
                    >
                        إدارة الديون <ChevronRight size={10} />
                    </Link>
                </KpiCard>

                <KpiCard
                    icon={AlertTriangle}
                    iconBg={data.expiring_soon_count > 0 ? 'bg-danger/10' : 'bg-success/10'}
                    iconColor={data.expiring_soon_count > 0 ? 'text-danger' : 'text-success'}
                    label="تنتهي خلال 7 أيام"
                    value={
                        <span className={data.expiring_soon_count > 0 ? 'text-danger' : 'text-ink'}>
                            {fmt(data.expiring_soon_count)} عضو
                        </span>
                    }
                    alert={data.expiring_soon_count > 0}
                >
                    <Link
                        to="/notifications"
                        className="text-[10px] font-black text-danger hover:underline flex items-center gap-1"
                    >
                        إرسال تذكيرات <ChevronRight size={10} />
                    </Link>
                </KpiCard>
            </div>

            {/* ── KPI Row 2: الأعضاء والحضور ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
                <KpiCard
                    icon={CalendarCheck}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    badge="Today"
                    badgeColor="text-primary bg-primary/10"
                    label="حضور اليوم"
                    value={
                        <>
                            {fmt(data.today_attendance)}{' '}
                            <span className="text-sm font-normal text-muted">لاعب</span>
                        </>
                    }
                >
                    <div className="flex justify-between gap-3 min-w-0">
                        <MiniStat label="جديد" value={fmt(data.today_new_subscriptions)} color="text-success" />
                        <MiniStat label="تجديد" value={fmt(data.today_renewals)} color="text-primary" />
                    </div>
                </KpiCard>

                <KpiCard
                    icon={Users}
                    iconBg="bg-success/10"
                    iconColor="text-success"
                    label="أعضاء نشطون"
                    value={<span className="text-success">{fmt(data.active_clients_count)}</span>}
                >
                    <MiniStat label="من إجمالي" value={`${fmt(data.total_clients_count)} عضو`} color="text-muted" />
                </KpiCard>

                <KpiCard
                    icon={Target}
                    iconBg="bg-warning/10"
                    iconColor="text-warning"
                    label="مجمدون"
                    value={<span className="text-warning">{fmt(data.frozen_clients_count)}</span>}
                >
                    <MiniStat label="منتهية اشتراكاتهم" value={fmt(data.expired_clients_count)} color="text-danger" />
                </KpiCard>

                <KpiCard
                    icon={Users}
                    iconBg="bg-ink/10"
                    iconColor="text-ink"
                    label="إجمالي قاعدة البيانات"
                    value={fmt(data.total_clients_count)}
                >
                    <div className="flex gap-2 min-w-0">
                        <div className="flex-1 bg-success/20 rounded-lg px-2 py-1 text-center min-w-0">
                            <p className="text-[9px] text-success font-black">نشط</p>
                            <p className="text-xs font-black text-success">{fmt(data.active_clients_count)}</p>
                        </div>
                        <div className="flex-1 bg-warning/20 rounded-lg px-2 py-1 text-center min-w-0">
                            <p className="text-[9px] text-warning font-black">مجمد</p>
                            <p className="text-xs font-black text-warning">{fmt(data.frozen_clients_count)}</p>
                        </div>
                        <div className="flex-1 bg-danger/20 rounded-lg px-2 py-1 text-center min-w-0">
                            <p className="text-[9px] text-danger font-black">منتهي</p>
                            <p className="text-xs font-black text-danger">{fmt(data.expired_clients_count)}</p>
                        </div>
                    </div>
                </KpiCard>
            </div>

            {/* ── Chart + Attendance + Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-w-0">
                {/* Left 2/3 */}
                <div className="lg:col-span-2 space-y-5 min-w-0">
                    {/* Revenue Chart */}
                    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 min-w-0">
                            <h2 className="text-sm font-black text-ink flex items-center gap-2 min-w-0">
                                <TrendingUp className="text-success shrink-0" size={16} />
                                نبض الإيرادات الأسبوعي
                            </h2>

                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-0.5 bg-success rounded inline-block" /> إيرادات
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-0.5 bg-danger rounded inline-block" /> مصروفات
                                </span>
                            </div>
                        </div>

                        <ChartBox height="h-[240px] sm:h-[280px]">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>

                                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis hide />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fill="url(#gIncome)"
                                    dot={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fill="url(#gExpense)"
                                    dot={false}
                                    strokeDasharray="4 2"
                                />
                            </AreaChart>
                        </ChartBox>
                    </div>

                    {/* Attendance Table */}
                    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden min-w-0">
                        <div className="px-5 py-3.5 border-b border-border flex justify-between items-center gap-3 min-w-0">
                            <h2 className="text-sm font-black text-ink flex items-center gap-2 min-w-0">
                                <LogIn className="text-primary shrink-0" size={16} />
                                سجل دخول اللاعبين اليوم
                            </h2>

                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full shrink-0">
                                {data.today_attendance_list?.length ?? 0} سجل
                            </span>
                        </div>

                        <div className="overflow-x-auto min-w-0">
                            <table className="w-full text-right text-sm">
                                <thead className="text-[10px] text-muted bg-mist font-black uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">اللاعب</th>
                                        <th className="px-4 py-3">وقت الدخول</th>
                                        <th className="px-4 py-3">نوع الباقة</th>
                                        <th className="px-4 py-3">الحصص المتبقية</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border">
                                    {data.today_attendance_list?.length > 0 ? (
                                        data.today_attendance_list.map((item, i) => (
                                            <tr
                                                key={item.id ?? i}
                                                className="hover:bg-mist/40 transition-colors group"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {item.photo_url ? (
                                                            <img
                                                                src={item.photo_url}
                                                                alt={item.name}
                                                                className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-7 h-7 rounded-full bg-primary/10 text-primary
                                                                flex items-center justify-center text-xs font-black shrink-0"
                                                            >
                                                                {item.name?.charAt(0)}
                                                            </div>
                                                        )}

                                                        <span className="font-bold text-ink text-xs group-hover:text-primary transition-colors truncate">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-muted text-xs tabular-nums">
                                                    {item.time}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-black">
                                                        {item.sub_type}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {item.remaining === null ? (
                                                        <span className="text-muted text-xs">∞</span>
                                                    ) : (
                                                        <span
                                                            className={`font-black text-sm tabular-nums
                                                            ${item.remaining <= 2
                                                                ? 'text-danger'
                                                                : item.remaining <= 5
                                                                    ? 'text-warning'
                                                                    : 'text-ink'}`}
                                                        >
                                                            {fmt(item.remaining)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <LogIn size={28} />
                                                    <p className="font-bold text-sm">لم يتم تسجيل أي حضور حتى الآن</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Activity Log */}
                <div
                    className="bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden min-w-0"
                    style={{ maxHeight: '680px' }}
                >
                    <div className="px-5 py-4 border-b border-border bg-ink text-white shrink-0">
                        <h2 className="text-sm font-black flex items-center gap-2">
                            <Activity size={16} className="text-primary" />
                            نبض النظام
                        </h2>
                        <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-widest font-bold">
                            Live Audit Log
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-w-0">
                        {data.recent_activities?.length > 0 ? (
                            data.recent_activities.map((log, i) => (
                                <div
                                    key={log.id ?? i}
                                    className="p-3 bg-mist/40 rounded-xl border border-border/50
                                        hover:border-primary/20 hover:bg-mist transition-all min-w-0"
                                >
                                    <div className="flex justify-between items-start gap-3 mb-1.5">
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                                            {log.action_label}
                                        </span>

                                        <span className="text-[9px] text-muted font-bold flex items-center gap-0.5 shrink-0">
                                            <Clock size={8} /> {log.time_ago}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-ink font-semibold leading-snug mb-2 break-words">
                                        {log.description}
                                    </p>

                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40 min-w-0">
                                        <div className="w-4 h-4 bg-ink text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0">
                                            {log.user_initial}
                                        </div>
                                        <span className="text-[10px] font-bold text-muted truncate">
                                            {log.user}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2">
                                <Clock size={28} />
                                <p className="font-bold text-xs">لا توجد عمليات مؤخراً</p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 border-t border-border bg-mist/50 shrink-0">
                        <Link
                            to="/audit-logs"
                            className="group text-[11px] font-black text-ink hover:text-primary transition-colors
                                flex items-center justify-center gap-1 uppercase tracking-widest"
                        >
                            سجل الرقابة الكامل
                            <ChevronRight
                                size={11}
                                className="group-hover:translate-x-0.5 transition-transform"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
