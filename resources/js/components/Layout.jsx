import React from 'react';
import { useAuthStore } from '../store/authStore';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, MessageCircle, CreditCard,
    CalendarCheck, Settings, LogOut, Dumbbell, Shield, Receipt,
    Bell, BarChart3, QrCode, DollarSign, ClipboardList, FileText
} from 'lucide-react';

export default function Layout({ children }) {
    const { user, logout } = useAuthStore();

const links = [
    { name: 'لوحة التحكم',      path: '/dashboard',                    icon: LayoutDashboard, color: '#f59e0b', roles: ['admin'] },
    { name: 'تسجيل الحضور',     path: '/attendance',                   icon: CalendarCheck,   color: '#10b981', roles: ['admin', 'reception', 'captain'] },
    { name: 'حصص اليوم',        path: '/classes/today',                icon: ClipboardList,   color: '#06b6d4', roles: ['admin', 'reception', 'captain'] },
    { name: 'تنبيهات الاشتراكات اليدوية', path: '/manual-subscription-notifications', icon: Bell, color: '#22c55e', roles: ['admin'] },
    { name: 'إدارة الأعضاء',    path: '/clients',                      icon: Users,           color: '#8b5cf6', roles: ['admin', 'reception'] },
    { name: 'باقات الاشتراك',   path: '/settings/subscription-types',  icon: Dumbbell,        color: '#f97316', roles: ['admin'] },

    { name: 'أنواع الحصص',      path: '/settings/session-types',       icon: Dumbbell,        color: '#14b8a6', roles: ['admin'] },
    { name: 'حصص العملاء',      path: '/client-sessions',              icon: Receipt,         color: '#0ea5e9', roles: ['admin', 'reception'] },

    { name: 'التنبيهات الذكية', path: '/notifications',                icon: Bell,            color: '#ef4444', roles: ['admin'] },
    { name: 'الديون',           path: '/debts',                        icon: DollarSign,      color: '#e11d48', roles: ['admin'] },
    { name: 'المالية والشيفتات', path: '/finance',                     icon: CreditCard,      color: '#22c55e', roles: ['admin'] },
    { name: 'مخزون الكروت',     path: '/qr-cards',                     icon: QrCode,          color: '#0ea5e9', roles: ['admin', 'reception'] },
    { name: 'التقارير الشاملة', path: '/reports',                      icon: BarChart3,       color: '#a855f7', roles: ['admin'] },
    { name: 'إدارة الموظفين',   path: '/staff',                        icon: Shield,          color: '#64748b', roles: ['admin'] },
    { name: 'سجل الرقابة',      path: '/audit-logs',                   icon: FileText,        color: '#94a3b8', roles: ['admin'] },
    { name: 'لوحة الواتساب',    path: '/whatsapp',                     icon: MessageCircle,   color: '#25d366', roles: ['admin'] },
    { name: 'الإعدادات',        path: '/settings',                     icon: Settings,        color: '#cbd5e1', roles: ['admin'] },
];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role));

    return (
        <div className="flex h-screen bg-mist overflow-hidden font-arabic">

            {/* ─── Sidebar ─── */}
            <aside className="w-64 bg-ink text-white flex flex-col transition-all duration-300">

                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b border-white/10">
                    <Dumbbell className="text-primary ml-2" size={28} />
                    <span className="text-2xl font-black tracking-wider uppercase">GymOS</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-6 px-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {filteredLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) =>
                                    `flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                        isActive
                                        ? 'bg-white/10 text-white font-bold'
                                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* Icon box ملون */}
                                        <span
                                            className="ml-3 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                                            style={{
                                                backgroundColor: isActive
                                                    ? link.color + '33'
                                                    : link.color + '18',
                                                color: link.color,
                                            }}
                                        >
                                            <Icon size={16} />
                                        </span>
                                        <span className="text-sm">{link.name}</span>

                                        {/* Active indicator */}
                                        {isActive && (
                                            <span
                                                className="mr-auto w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: link.color }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-black truncate w-24">{user?.name}</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-tighter">{user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="تسجيل الخروج"
                            className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm z-10">
                    <h2 className="text-lg font-black text-ink flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        نظام إدارة الصالة الرياضية
                    </h2>
                    <div className="hidden sm:block text-left">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">تاريخ اليوم</p>
                        <p className="text-sm font-black text-ink">
                            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
                    {children}
                </div>
            </main>
        </div>
    );
}
