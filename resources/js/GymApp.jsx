import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';

import Login             from './pages/Login';
import Layout            from './components/Layout';
import Attendance        from './pages/Attendance';
import ClientsIndex      from './pages/clients/Index';
import ClientForm        from './pages/clients/Form';
import ClientProfile     from './pages/clients/Profile';
import ClientEdit        from './pages/clients/Edit';
import SubscriptionContract from './pages/clients/SubscriptionContract';
import SubscriptionForm  from './pages/subscriptions/Form';
import FinanceIndex      from './pages/finance/Index';
import Dashboard         from './pages/Dashboard';
import SettingsIndex     from './pages/settings/Index';
import PrintQR           from './pages/clients/Print';
import Staff             from './pages/Staff';
import Reports           from './pages/Reports';
import WhatsApp          from './pages/WhatsApp';
import Notifications     from './pages/Notifications';
import QrCards           from './pages/QrCards';
import AttendanceReport  from './pages/reports/AttendanceReport';
import TodayClasses      from './pages/classes/TodayClasses';
import SubscriptionTypes from './pages/settings/SubscriptionTypes';
import AuditLogs         from './pages/AuditLogs';
import Debts             from './pages/Debts';
import SessionTypes from './pages/sessions/SessionTypes';
import ClientSessions from './pages/sessions/ClientSessions';
import ManualSubscriptionNotifications from './pages/ManualSubscriptionNotifications';
import SubscriptionEdit from './pages/clients/SubscriptionEdit';
/**
 * ProtectedRoute — يتحقق من:
 *  1. تسجيل الدخول
 *  2. الدور (allowedRoles) — اختياري
 *  3. الصلاحية على الصفحة (permKey) — اختياري
 */
const ProtectedRoute = ({ children, allowedRoles, permKey }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen text-primary font-bold">
                جاري التحميل...
            </div>
        );
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/dashboard' : '/attendance'} replace />;
    }

    if (permKey && user.role !== 'admin') {
        const perms = user.permissions || [];
        if (!perms.includes(permKey)) {
            return <Navigate to="/attendance" replace />;
        }
    }

    return <Layout>{children}</Layout>;
};

export default function GymApp() {
    const { isAuthenticated, fetchUser, user } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated && !user) fetchUser();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <BrowserRouter>
            <Toaster position="top-center" rtl={true} />
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Dashboard — admin only */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="dashboard">
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Attendance */}
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception', 'captain']} permKey="attendance">
                            <Attendance />
                        </ProtectedRoute>
                    }
                />

                {/* Today Classes */}
                <Route
                    path="/classes/today"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception', 'captain']} permKey="classes">
                            <TodayClasses />
                        </ProtectedRoute>
                    }
                />
<Route
    path="/settings/session-types"
    element={
        <ProtectedRoute allowedRoles={['admin']} permKey="subscriptions">
            <SessionTypes />
        </ProtectedRoute>
    }
/>

<Route
    path="/client-sessions"
    element={
        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
            <ClientSessions />
        </ProtectedRoute>
    }
/>
                {/* Clients */}
                <Route
                    path="/clients"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <ClientsIndex />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/create"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <ClientForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <ClientProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/:id/edit"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <ClientEdit />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/:id/subscribe"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <SubscriptionForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/:id/subscriptions/:subscriptionId/contract"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <SubscriptionContract />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/print"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
                            <PrintQR />
                        </ProtectedRoute>
                    }
                />

                {/* Subscription Types */}
                <Route
                    path="/settings/subscription-types"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="subscriptions">
                            <SubscriptionTypes />
                        </ProtectedRoute>
                    }
                />

                {/* Notifications */}
                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="notifications">
                            <Notifications />
                        </ProtectedRoute>
                    }
                />
<Route
    path="/manual-subscription-notifications"
    element={
        <ProtectedRoute allowedRoles={['admin']} permKey="notifications">
            <ManualSubscriptionNotifications />
        </ProtectedRoute>
    }
/>
<Route
    path="/clients/:clientId/subscriptions/:subscriptionId/edit"
    element={
        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="clients">
            <SubscriptionEdit />
        </ProtectedRoute>
    }
/>                {/* Debts */}
                <Route
                    path="/debts"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="debts">
                            <Debts />
                        </ProtectedRoute>
                    }
                />

                {/* Finance */}
                <Route
                    path="/finance"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="finance">
                            <FinanceIndex />
                        </ProtectedRoute>
                    }
                />

                {/* QR Cards */}
                <Route
                    path="/qr-cards"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'reception']} permKey="qr_cards">
                            <QrCards />
                        </ProtectedRoute>
                    }
                />

                {/* Reports */}
                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="reports">
                            <Reports />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reports/attendance"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="reports">
                            <AttendanceReport />
                        </ProtectedRoute>
                    }
                />

                {/* Staff */}
                <Route
                    path="/staff"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="staff">
                            <Staff />
                        </ProtectedRoute>
                    }
                />

                {/* Audit Logs */}
                <Route
                    path="/audit-logs"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="audit_logs">
                            <AuditLogs />
                        </ProtectedRoute>
                    }
                />

                {/* WhatsApp */}
                <Route
                    path="/whatsapp"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="whatsapp">
                            <WhatsApp />
                        </ProtectedRoute>
                    }
                />

                {/* Settings */}
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute allowedRoles={['admin']} permKey="settings">
                            <SettingsIndex />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route
                    path="*"
                    element={
                        <ProtectedRoute>
                            <Navigate to="/dashboard" replace />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
