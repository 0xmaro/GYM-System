import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
    MessageCircle, Smartphone, CheckCircle, RefreshCw,
    Send, AlertCircle, Settings, Megaphone, FileText,
    Play, Square, Clock, Users, CheckSquare, XSquare,
    Hourglass, Eye, Rocket, LogOut, RotateCcw,
    Inbox, Trash2, BarChart2, Loader2, Activity,
    WifiOff, History, ChevronLeft, ChevronRight,
    Bot, QrCode, ShieldAlert, TimerReset
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATUS_BADGE = {
    sent:       { label: 'تم الإرسال', cls: 'bg-success-pale text-success border-success/20' },
    pending:    { label: 'في الانتظار', cls: 'bg-warning-pale text-warning border-warning/20' },
    failed:     { label: 'فشل', cls: 'bg-danger-pale text-danger border-danger/20' },
    processing: { label: 'قيد المعالجة', cls: 'bg-primary/10 text-primary border-primary/20' },
    queued:     { label: 'في الطابور', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const TEMPLATE_LABELS = {
    welcome: 'ترحيب عند التسجيل',
    expiry_reminder: 'تذكير انتهاء وشيك',
    subscription_expired_reminder: 'انتهى الاشتراك',
    debt_reminder: 'تذكير دين',
    receipt: 'إيصال دفع',
    freeze_notification: 'إشعار تجميد',
    sessions_empty: 'انتهاء الحصص',
    birthday: 'تهنئة عيد ميلاد',
    renewal: 'تجديد الاشتراك',      // ← ضيف دي
    custom: 'رسالة مخصصة',
    incoming: 'رسالة واردة',
};

const TABS = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: MessageCircle },
    { id: 'incoming',  label: 'الواردة', icon: Inbox },
    { id: 'templates', label: 'القوالب', icon: FileText },
    { id: 'campaigns', label: 'الحملات', icon: Megaphone },
    { id: 'logs',      label: 'السجل الكامل', icon: Settings },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getBadge(status) {
    return STATUS_BADGE[status] ?? STATUS_BADGE.pending;
}

function fmtDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('ar-EG');
    } catch {
        return value;
    }
}

function normalizeArrayResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.messages)) return payload.messages;
    return [];
}

function Spinner() {
    return (
        <div className="flex items-center justify-center p-12 gap-3">
            <RefreshCw size={22} className="animate-spin text-success" />
            <p className="font-bold text-ink">جاري التحميل...</p>
        </div>
    );
}

function EmptyState({ icon: Icon, title, hint, action = null }) {
    return (
        <div className="p-12 text-center text-muted">
            <div className="w-16 h-16 rounded-2xl bg-mist mx-auto mb-4 flex items-center justify-center border border-border">
                <Icon size={28} className="opacity-60" />
            </div>
            <p className="font-black text-ink">{title}</p>
            {hint && <p className="text-sm mt-1">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function WhatsApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const lastConnected = useRef(null);
    const pollRef = useRef(null);

    const fetchStatus = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await api.get('/whatsapp/status');
            const data = res.data;

            if (data?.connected !== lastConnected.current) {
                lastConnected.current = data?.connected;
                setStatus(data);
            } else {
                setStatus(prev => (prev ? { ...prev, ...data } : data));
            }
        } catch {
            // صامت
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus(true);
        pollRef.current = setInterval(() => fetchStatus(), 15000);
        return () => clearInterval(pollRef.current);
    }, [fetchStatus]);

    const isConnected = status?.connected === true;

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-10 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-4">
                    <div className="bg-success-pale p-3 rounded-xl text-success">
                        <MessageCircle size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-ink">نظام الواتساب</h1>
                        <p className="text-muted text-xs mt-0.5">إدارة الرسائل التلقائية والحملات وسجل الإرسال</p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border w-fit ${
                    isConnected
                        ? 'bg-success-pale text-success border-success/20'
                        : 'bg-danger-pale text-danger border-danger/20'
                }`}>
                    {isConnected
                        ? <><CheckCircle size={14} /> متصل — {status?.number ?? '---'}</>
                        : <><Smartphone size={14} /> غير متصل</>
                    }
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 bg-mist p-1 rounded-xl border border-border w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-card text-ink shadow-sm border border-border'
                                : 'text-muted hover:text-ink'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20 gap-3">
                    <RefreshCw size={28} className="animate-spin text-success" />
                    <p className="font-bold text-ink">جاري التحميل...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'dashboard' && (
                        <DashboardTab status={status} isConnected={isConnected} onRefresh={() => fetchStatus(true)} />
                    )}
                    {activeTab === 'incoming' && <IncomingTab isConnected={isConnected} />}
                    {activeTab === 'templates' && <TemplatesTab />}
                    {activeTab === 'campaigns' && <CampaignsTab isConnected={isConnected} />}
                    {activeTab === 'logs' && <LogsTab isConnected={isConnected} />}
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
function DashboardTab({ status, isConnected, onRefresh }) {
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [botStats, setBotStats] = useState(null);
    const [actionLoading, setActionLoading] = useState('');
    const [pendingBotMessages, setPendingBotMessages] = useState([]);
    const [failedBotMessages, setFailedBotMessages] = useState([]);
    const [loadingQueues, setLoadingQueues] = useState(false);
    const [sendingPending, setSendingPending] = useState(false);

    const fetchQr = async () => {
        setQrLoading(true);
        try {
            const res = await api.get('/whatsapp/qr');
            setQrData(res.data);
        } catch {
            toast.error('فشل جلب QR');
        } finally {
            setQrLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/whatsapp/stats');
            setBotStats(res.data?.data ?? res.data?.stats ?? res.data ?? null);
        } catch {
            // صامت
        }
    };

    const fetchQueues = async () => {
        setLoadingQueues(true);
        try {
            const [pendingRes, failedRes] = await Promise.all([
                api.get('/whatsapp/pending-messages'),
                api.get('/whatsapp/failed-messages'),
            ]);

            setPendingBotMessages(normalizeArrayResponse(pendingRes.data));
            setFailedBotMessages(normalizeArrayResponse(failedRes.data));
        } catch {
            // صامت
        } finally {
            setLoadingQueues(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchQueues();
        if (!isConnected) fetchQr();

        const t1 = setInterval(fetchStats, 30000);
        const t2 = setInterval(fetchQueues, 30000);

        return () => {
            clearInterval(t1);
            clearInterval(t2);
        };
    }, [isConnected]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        await fetchStats();
        await fetchQueues();
        if (!isConnected) await fetchQr();
        setRefreshing(false);
    };

    const handleSendTest = async (e) => {
        e.preventDefault();
        setSending(true);
        const toastId = toast.loading('جاري الإرسال...');
        try {
            const payload = { phone: testPhone };
            if (testMessage.trim()) payload.message = testMessage;

            const res = await api.post('/whatsapp/send-test', payload);
            toast.success(`تمت إضافة الرسالة بنجاح للرقم: ${res.data.phone}`, { id: toastId });
            setTestPhone('');
            setTestMessage('');
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'فشل الإرسال', { id: toastId });
        } finally {
            setSending(false);
        }
    };

    const handleBotAction = async (action) => {
        setActionLoading(action);
        const labels = {
            start: 'تشغيل',
            stop: 'إيقاف',
            reconnect: 'إعادة اتصال',
            logout: 'تسجيل خروج',
        };

        const toastId = toast.loading(`جاري ${labels[action]}...`);
        try {
            const res = await api.post(`/whatsapp/${action}`);
            toast.success(res.data?.message ?? `تم ${labels[action]} بنجاح`, { id: toastId });
            await onRefresh();
            await fetchStats();
            await fetchQueues();
            if (action === 'start' || action === 'reconnect') {
                setTimeout(() => onRefresh(), 3000);
            }
        } catch (err) {
            toast.error(err.response?.data?.message ?? `فشل ${labels[action]}`, { id: toastId });
        } finally {
            setActionLoading('');
        }
    };

    const handleSendPending = async () => {
        setSendingPending(true);
        const toastId = toast.loading('جاري إرسال الرسائل المعلّقة...');
        try {
            const res = await api.post('/whatsapp/send-pending');
            toast.success(res.data?.message ?? 'تمت محاولة إرسال الرسائل المعلقة', { id: toastId });
            await fetchQueues();
            await fetchStats();
            await onRefresh();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'فشل إرسال الرسائل المعلقة', { id: toastId });
        } finally {
            setSendingPending(false);
        }
    };

    const msgs = botStats?.messages ?? botStats ?? {};
    const conn = botStats?.connection ?? {};

    const dashboardCards = [
        { label: 'أُرسلت', value: msgs.sent ?? 0, cls: 'text-success', icon: CheckSquare },
        { label: 'فشلت', value: msgs.failed ?? 0, cls: 'text-danger', icon: XSquare },
        { label: 'في الانتظار', value: msgs.pending ?? pendingBotMessages.length ?? 0, cls: 'text-warning', icon: Hourglass },
        { label: 'نسبة النجاح', value: msgs.successRate ?? '—', cls: 'text-primary', icon: BarChart2 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* حالة الاتصال */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <h2 className="text-sm font-bold text-ink">حالة البوت</h2>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-muted hover:text-ink transition-colors"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {isConnected ? (
                    <>
                        <div className="bg-success-pale p-4 rounded-full text-success w-fit mx-auto">
                            <CheckCircle size={40} />
                        </div>
                        <h3 className="text-lg font-black text-success text-center">متصل ✅</h3>
                        <p className="text-muted text-xs text-center" dir="ltr">{status?.number ?? '—'}</p>

                        {conn.uptime && (
                            <p className="text-xs text-center text-muted">
                                وقت التشغيل: <span className="font-bold text-ink">{conn.uptime}</span>
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                onClick={() => handleBotAction('reconnect')}
                                disabled={!!actionLoading}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-mist border border-border rounded-xl text-xs font-bold text-ink hover:bg-gray-100 disabled:opacity-50 transition-all"
                            >
                                <RotateCcw size={12} className={actionLoading === 'reconnect' ? 'animate-spin' : ''} />
                                إعادة اتصال
                            </button>

                            <button
                                onClick={() => handleBotAction('stop')}
                                disabled={!!actionLoading}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-warning-pale border border-warning/20 rounded-xl text-xs font-bold text-warning hover:opacity-80 disabled:opacity-50 transition-all"
                            >
                                <Square size={12} />
                                إيقاف
                            </button>

                            <button
                                onClick={() => handleBotAction('logout')}
                                disabled={!!actionLoading}
                                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-danger-pale border border-danger/20 rounded-xl text-xs font-bold text-danger hover:opacity-80 disabled:opacity-50 transition-all"
                            >
                                <LogOut size={12} />
                                تسجيل خروج من الجلسة
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-danger-pale p-4 rounded-full text-danger w-fit mx-auto">
                            <Smartphone size={40} />
                        </div>
                        <h3 className="text-base font-black text-danger text-center">غير متصل</h3>
                        <p className="text-muted text-xs text-center">افتح واتساب ← الأجهزة المرتبطة ← امسح الكود</p>

                        {qrData?.qr ? (
                            <div className="bg-white p-2 border-2 border-dashed border-border rounded-xl">
                                <img src={qrData.qr} alt="QR" className="w-40 h-40 mx-auto" />
                            </div>
                        ) : (
                            <div
                                onClick={fetchQr}
                                className="w-40 h-40 mx-auto bg-mist rounded-xl border border-border flex flex-col items-center justify-center text-muted text-xs font-bold cursor-pointer hover:bg-gray-100 transition-colors gap-2"
                            >
                                {qrLoading
                                    ? <RefreshCw size={20} className="animate-spin" />
                                    : <><QrCode size={20} /><span>اضغط لجلب الكود</span></>
                                }
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={fetchQr}
                                disabled={qrLoading}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-mist border border-border rounded-xl text-xs font-bold text-ink hover:bg-gray-100 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
                                تحديث QR
                            </button>

                            <button
                                onClick={() => handleBotAction('start')}
                                disabled={!!actionLoading}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-success-pale border border-success/20 rounded-xl text-xs font-bold text-success hover:opacity-80 disabled:opacity-50"
                            >
                                <Play size={12} className={actionLoading === 'start' ? 'animate-spin' : ''} />
                                تشغيل
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* الجانب الأيمن */}
            <div className="lg:col-span-2 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dashboardCards.map(s => (
                        <div key={s.label} className="bg-card p-4 rounded-2xl border border-border shadow-sm text-center">
                            <s.icon size={18} className={`mx-auto mb-1.5 ${s.cls}`} />
                            <p className={`text-xl font-black ${s.cls}`}>{s.value}</p>
                            <p className="text-xs text-muted mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* تنبيهات حالة النظام */}
                <div className="space-y-3">
                    {!isConnected && (
                        <div className="flex items-start gap-2 text-warning text-xs font-bold bg-warning-pale p-3 rounded-xl border border-warning/20">
                            <WifiOff size={14} className="mt-0.5 shrink-0" />
                            <div>
                                <p>البوت غير متصل الآن.</p>
                                <p className="font-normal mt-1">
                                    أي رسالة جديدة قد تظل في الانتظار أو تُنقل لقائمة الانتظار الخاصة بالاتصال حتى يرجع البوت.
                                </p>
                            </div>
                        </div>
                    )}

                    {isConnected && pendingBotMessages.length > 0 && (
                        <div className="flex items-start gap-2 text-primary text-xs font-bold bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <Bot size={14} className="mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p>يوجد {pendingBotMessages.length} رسالة معلّقة داخل البوت.</p>
                                <p className="font-normal mt-1">
                                    هذا يعني أن الرسالة ليست مجرد pending في قاعدة البيانات، بل محفوظة عند البوت بانتظار إعادة الإرسال أو استعادة الاتصال.
                                </p>
                            </div>
                            <button
                                onClick={handleSendPending}
                                disabled={sendingPending}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-black text-ink hover:bg-mist disabled:opacity-50"
                            >
                                {sendingPending ? 'جاري...' : 'إرسال المعلّق'}
                            </button>
                        </div>
                    )}
                </div>

                {/* إرسال تجريبي */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
                        <Send size={14} className="text-primary" />
                        إرسال رسالة تجريبية
                    </h2>

                    {!isConnected && (
                        <div className="flex items-center gap-2 text-warning text-xs font-bold bg-warning-pale p-3 rounded-xl mb-3">
                            <AlertCircle size={13} />
                            الخدمة غير متصلة — الرسالة قد تُسجل pending أو تذهب لانتظار الاتصال
                        </div>
                    )}

                    <form onSubmit={handleSendTest} className="space-y-3">
                        <div className="flex gap-3 flex-col md:flex-row">
                            <input
                                type="text"
                                required
                                placeholder="201XXXXXXXXX"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-mist border border-border rounded-xl outline-none focus:border-primary text-sm font-bold"
                                dir="ltr"
                            />
                            <button
                                type="submit"
                                disabled={sending}
                                className="flex items-center justify-center gap-2 bg-ink text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-gray-800 transition-all"
                            >
                                {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                إرسال
                            </button>
                        </div>

                        <textarea
                            rows={3}
                            placeholder="رسالة اختبار اختيارية..."
                            value={testMessage}
                            onChange={e => setTestMessage(e.target.value)}
                            className="w-full px-4 py-3 bg-mist border border-border rounded-xl outline-none focus:border-primary text-sm resize-none"
                            dir="rtl"
                        />
                    </form>
                </div>

                {/* صفين: pending/failed من البوت */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <BotQueueCard
                        title="رسائل معلّقة داخل البوت"
                        icon={Hourglass}
                        color="warning"
                        items={pendingBotMessages}
                        loading={loadingQueues}
                        emptyText="لا توجد رسائل معلّقة داخل البوت"
                        action={isConnected ? {
                            label: sendingPending ? 'جاري الإرسال...' : 'إرسال كل المعلّق',
                            onClick: handleSendPending,
                            disabled: sendingPending,
                        } : null}
                    />

                    <BotQueueCard
                        title="رسائل فاشلة داخل البوت"
                        icon={ShieldAlert}
                        color="danger"
                        items={failedBotMessages}
                        loading={loadingQueues}
                        emptyText="لا توجد رسائل فاشلة داخل البوت"
                    />
                </div>

                <RecentLogs isConnected={isConnected} pendingBotCount={pendingBotMessages.length} />
            </div>
        </div>
    );
}

function BotQueueCard({ title, icon: Icon, color = 'warning', items, loading, emptyText, action = null }) {
    const colorMap = {
        warning: {
            icon: 'text-warning',
            badge: 'bg-warning-pale text-warning border-warning/20',
        },
        danger: {
            icon: 'text-danger',
            badge: 'bg-danger-pale text-danger border-danger/20',
        },
    };

    const theme = colorMap[color] ?? colorMap.warning;

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={theme.icon} />
                    <h2 className="text-sm font-bold text-ink">{title}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${theme.badge}`}>
                        {items.length}
                    </span>
                </div>

                {action && (
                    <button
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="text-xs font-black px-3 py-1.5 rounded-lg bg-mist border border-border text-ink hover:bg-gray-100 disabled:opacity-50"
                    >
                        {action.label}
                    </button>
                )}
            </div>

            {loading ? (
                <Spinner />
            ) : items.length === 0 ? (
                <EmptyState icon={Icon} title={emptyText} />
            ) : (
                <div className="divide-y divide-border max-h-[360px] overflow-auto">
                    {items.map((item, idx) => (
                        <div key={item.id ?? item.message_id ?? idx} className="p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-black text-ink" dir="ltr">
                                    {item.phone ?? item.to ?? item.phone_number ?? '—'}
                                </span>
                                <span className="text-muted mr-auto">
                                    {fmtDate(item.created_at ?? item.timestamp ?? item.date)}
                                </span>
                            </div>
                            <p className="text-sm text-ink/80 whitespace-pre-wrap break-words">
                                {item.message ?? item.body ?? item.message_content ?? '—'}
                            </p>
                            {(item.error || item.error_message) && (
                                <div className="text-xs text-danger bg-danger-pale border border-danger/20 rounded-lg px-3 py-2">
                                    {item.error ?? item.error_message}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Incoming
// ─────────────────────────────────────────────
function IncomingTab({ isConnected }) {
    const [messages, setMessages] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/incoming-messages');
            setMessages(res.data?.data?.messages ?? []);
            setUnread(res.data?.data?.unreadCount ?? 0);
        } catch {
            toast.error('فشل جلب الرسائل الواردة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 20000);
        return () => clearInterval(t);
    }, []);

    const markRead = async (id) => {
        try {
            await api.post(`/whatsapp/incoming-messages/${id}/read`);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
            setUnread(prev => Math.max(0, prev - 1));
        } catch {
            toast.error('فشل تحديث الحالة');
        }
    };

    const clearAll = async () => {
        if (!confirm('مسح كل الرسائل الواردة؟')) return;
        try {
            await api.delete('/whatsapp/incoming-messages');
            setMessages([]);
            setUnread(0);
            toast.success('تم المسح ✅');
        } catch {
            toast.error('فشل المسح');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-black text-ink flex items-center gap-2">
                    <Inbox size={16} />
                    الرسائل الواردة
                    {unread > 0 && (
                        <span className="bg-danger text-white text-xs font-black px-2 py-0.5 rounded-full">{unread}</span>
                    )}
                </h2>

                <div className="flex items-center gap-2">
                    <button onClick={load} className="text-muted hover:text-ink p-2 rounded-lg hover:bg-mist transition-colors">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={clearAll} className="flex items-center gap-1.5 text-xs font-bold text-danger hover:bg-danger-pale px-3 py-1.5 rounded-lg transition-colors">
                        <Trash2 size={13} />
                        مسح الكل
                    </button>
                </div>
            </div>

            {!isConnected && (
                <div className="flex items-center gap-2 text-warning text-xs font-bold bg-warning-pale p-3 rounded-xl border border-warning/20">
                    <AlertCircle size={13} />
                    البوت غير متصل — الرسائل الواردة قد لا تتحدّث لحظيًا
                </div>
            )}

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {loading ? <Spinner /> : messages.length === 0 ? (
                    <EmptyState icon={Inbox} title="لا توجد رسائل واردة" />
                ) : (
                    <div className="divide-y divide-border">
                        {messages.map(msg => (
                            <div key={msg.id} className={`p-4 flex items-start gap-4 transition-colors ${msg.read ? '' : 'bg-primary/5'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm text-ink" dir="ltr">{msg.from ?? msg.phone}</span>
                                        {!msg.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                                        <span className="text-xs text-muted mr-auto">
                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleString('ar-EG') : '—'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-ink/80 whitespace-pre-wrap break-words">{msg.body ?? msg.message}</p>
                                </div>

                                {!msg.read && (
                                    <button
                                        onClick={() => markRead(msg.id)}
                                        className="text-xs font-bold text-primary hover:underline shrink-0"
                                    >
                                        تعليم مقروء
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Recent Logs
// ─────────────────────────────────────────────
function RecentLogs({ isConnected, pendingBotCount }) {
    const [logs, setLogs] = useState([]);

    const load = async () => {
        try {
            const res = await api.get('/whatsapp/logs?per_page=5');
            setLogs(res.data.data ?? []);
        } catch {
            //
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                    <History size={14} />
                    آخر الرسائل
                </h2>
                <button onClick={load} className="text-muted hover:text-ink">
                    <RefreshCw size={14} />
                </button>
            </div>

            {!isConnected && logs.some(log => log.status === 'pending') && (
                <div className="mx-4 mt-4 rounded-xl border border-warning/20 bg-warning-pale px-3 py-2 text-xs text-warning">
                    توجد رسائل pending بينما البوت غير متصل، وده غالبًا طبيعي لأنها لم تُدفع بعد أو بانتظار عودة الاتصال.
                </div>
            )}

            {isConnected && pendingBotCount === 0 && logs.some(log => log.status === 'pending') && (
                <div className="mx-4 mt-4 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-primary">
                    توجد رسائل pending في السجل، لكن لا توجد رسائل معلقة داخل البوت؛ غالبًا المشكلة في callback أو تحديث الحالة بعد الإرسال.
                </div>
            )}

            {logs.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">لا توجد رسائل بعد</div>
            ) : (
                <div className="overflow-auto">
                    <table className="w-full text-right text-xs min-w-[640px]">
                        <thead className="bg-mist text-muted">
                            <tr>
                                <th className="p-3 font-bold">الرقم</th>
                                <th className="p-3 font-bold">النوع</th>
                                <th className="p-3 font-bold">الحالة</th>
                                <th className="p-3 font-bold">الوقت</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs.map(log => {
                                const badge = getBadge(log.status);
                                return (
                                    <tr key={log.id} className="hover:bg-mist transition-colors">
                                        <td className="p-3 font-bold text-ink" dir="ltr">{log.phone_number ?? '—'}</td>
                                        <td className="p-3 text-muted">{TEMPLATE_LABELS[log.template_type] ?? log.template_type}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="p-3 text-muted" dir="ltr">{fmtDate(log.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────
function TemplatesTab() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/templates');
            setTemplates(res.data);
        } catch {
            toast.error('تعذر تحميل القوالب');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleEnabled = async (template) => {
        try {
            await api.put(`/whatsapp/templates/${template.id}`, { enabled: !template.enabled });
            setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, enabled: !t.enabled } : t));
            toast.success(template.enabled ? 'تم إيقاف القالب' : 'تم تفعيل القالب');
        } catch {
            toast.error('فشل التحديث');
        }
    };

    const saveTemplate = async (template, updates) => {
        const toastId = toast.loading('جاري الحفظ...');
        try {
            const res = await api.put(`/whatsapp/templates/${template.id}`, updates);
            setTemplates(prev => prev.map(t => t.id === template.id ? res.data.template : t));
            setEditing(null);
            toast.success('تم حفظ القالب ✅', { id: toastId });
        } catch {
            toast.error('فشل الحفظ', { id: toastId });
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="space-y-3">
            <div className="bg-warning-pale border border-warning/20 rounded-xl p-3 text-warning text-xs font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                تحكم في أنواع الرسائل التلقائية
            </div>

            {templates.map(template => (
                <TemplateCard
                    key={template.id}
                    template={template}
                    editing={editing === template.id}
                    onEdit={() => setEditing(template.id)}
                    onCancelEdit={() => setEditing(null)}
                    onToggle={() => toggleEnabled(template)}
                    onSave={(updates) => saveTemplate(template, updates)}
                />
            ))}
        </div>
    );
}

function TemplateCard({ template, editing, onEdit, onCancelEdit, onToggle, onSave }) {
    const [body, setBody] = useState(template.body);
    const [daysBefore, setDaysBefore] = useState(template.send_days_before ?? '');

    return (
        <div className={`bg-card rounded-2xl border shadow-sm overflow-hidden transition-all ${template.enabled ? 'border-border' : 'border-border opacity-60'}`}>
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${template.enabled ? 'bg-success' : 'bg-muted'}`} />
                    <span className="font-bold text-ink text-sm">{template.label}</span>
                    <span className="text-xs text-muted bg-mist px-2 py-0.5 rounded-full border border-border">{template.type}</span>
                </div>

                <div className="flex items-center gap-2">
                    {!editing && (
                        <button onClick={onEdit} className="text-xs font-bold text-primary hover:underline">
                            تعديل
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className={`relative w-10 h-5 rounded-full transition-colors ${template.enabled ? 'bg-success' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${template.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </div>

            {editing ? (
                <div className="p-4 space-y-3">
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 bg-mist border border-border rounded-xl text-sm font-mono outline-none focus:border-primary resize-none"
                        dir="rtl"
                    />

                    {template.send_days_before !== null && (
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-muted">إرسال قبل الانتهاء بـ</label>
                            <input
                                type="number"
                                min={1}
                                max={90}
                                value={daysBefore}
                                onChange={e => setDaysBefore(e.target.value)}
                                className="w-20 px-3 py-1.5 bg-mist border border-border rounded-lg text-sm font-bold outline-none"
                            />
                            <span className="text-xs text-muted">يوم</span>
                        </div>
                    )}

                    <div className="text-xs text-muted bg-mist p-2 rounded-lg">
                        المتغيرات:
                        <span dir="ltr" className="font-mono"> {'{name}'} {'{gym_name}'} {'{end_date}'} {'{days_remaining}'} {'{amount_display}'}</span>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button onClick={onCancelEdit} className="px-4 py-1.5 text-sm font-bold text-muted border border-border rounded-lg">
                            إلغاء
                        </button>
                        <button
                            onClick={() => onSave({ body, send_days_before: daysBefore || null })}
                            className="px-4 py-1.5 text-sm font-bold bg-ink text-white rounded-lg hover:bg-gray-800"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-4 py-3">
                    <p className="text-xs text-muted whitespace-pre-line line-clamp-2">{template.body}</p>
                    {template.send_days_before && (
                        <p className="text-xs text-primary font-bold mt-1">
                            ⏰ يُرسل قبل الانتهاء بـ {template.send_days_before} أيام
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────
function CampaignsTab({ isConnected }) {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/campaigns');
            setCampaigns(res.data.data ?? res.data ?? []);
        } catch {
            toast.error('تعذر تحميل الحملات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const launch = async (campaign) => {
        if (!isConnected) return toast.error('الواتساب غير متصل');
        if (!confirm(`إطلاق حملة "${campaign.name}" لـ ${campaign.recipients_count} عضو؟`)) return;

        const toastId = toast.loading('جاري الإطلاق...');
        try {
            const res = await api.post(`/whatsapp/campaigns/${campaign.id}/launch`);
            toast.success(`تم إضافة ${res.data.queued} رسالة للطابور ✅`, { id: toastId });
            load();
        } catch {
            toast.error('فشل الإطلاق', { id: toastId });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-black text-ink flex items-center gap-2">
                    <Megaphone size={16} />
                    الحملات
                </h2>

                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800"
                >
                    <Rocket size={14} />
                    {showForm ? 'إغلاق' : 'حملة جديدة'}
                </button>
            </div>

            {showForm && <CampaignForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

            {loading ? <Spinner /> : campaigns.length === 0 ? (
                <EmptyState icon={Megaphone} title="لا توجد حملات بعد" />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {campaigns.map(camp => (
                        <div key={camp.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-ink">{camp.name}</h3>
                                    <p className="text-xs text-muted mt-1">{fmtDate(camp.created_at)}</p>
                                </div>
                                <span className="px-2 py-1 rounded-full text-[10px] font-black bg-mist border border-border text-ink">
                                    {camp.status}
                                </span>
                            </div>

                            <p className="text-sm text-muted whitespace-pre-wrap line-clamp-3">{camp.message}</p>

                            <div className="text-xs text-muted space-y-1">
                                <p>عدد المستقبلين: <span className="font-black text-ink">{camp.recipients_count ?? 0}</span></p>
                                {camp.scheduled_at && <p>موعد الجدولة: <span className="font-black text-ink">{fmtDate(camp.scheduled_at)}</span></p>}
                            </div>

                            <div className="pt-2">
                                {['draft', 'scheduled'].includes(camp.status) && (
                                    <button
                                        onClick={() => launch(camp)}
                                        className="w-full flex items-center justify-center gap-2 bg-success-pale text-success border border-success/20 px-4 py-2.5 rounded-xl text-sm font-black hover:opacity-80"
                                    >
                                        <Play size={14} />
                                        إطلاق الحملة
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CampaignForm({ onClose, onSaved }) {
    const [form, setForm] = useState({
        name: '',
        message: '',
        scheduled_at: '',
        target_filters: { status: '', gender: '' }
    });

    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);

    const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
    const setFilter = (key, val) => setForm(p => ({ ...p, target_filters: { ...p.target_filters, [key]: val } }));

    const handlePreview = async () => {
        setPreviewing(true);
        try {
            const res = await api.post('/whatsapp/campaigns/preview', {
                message: form.message,
                target_filters: form.target_filters,
            });
            setPreview(res.data);
        } catch {
            toast.error('فشل المعاينة');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.message) return toast.error('اكتب اسم الحملة والرسالة');
        setSaving(true);
        try {
            await api.post('/whatsapp/campaigns', form);
            toast.success('تم حفظ الحملة ✅');
            onSaved();
        } catch {
            toast.error('فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-black text-ink">إنشاء حملة جديدة</h3>
                <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
            </div>

            <div>
                <label className="text-xs font-bold text-muted block mb-1.5">① اسم الحملة</label>
                <input
                    type="text"
                    placeholder="مثال: عروض رمضان 2026"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
            </div>

            <div>
                <label className="text-xs font-bold text-muted block mb-1.5">② الفئة المستهدفة</label>
                <div className="grid grid-cols-2 gap-3">
                    <select
                        value={form.target_filters.status}
                        onChange={e => setFilter('status', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    >
                        <option value="">كل الأعضاء</option>
                        <option value="active">نشط فقط</option>
                        <option value="expired">منتهي الاشتراك</option>
                        <option value="frozen">مجمّد</option>
                    </select>

                    <select
                        value={form.target_filters.gender}
                        onChange={e => setFilter('gender', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    >
                        <option value="">كل الجنسين</option>
                        <option value="male">ذكور فقط</option>
                        <option value="female">إناث فقط</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-muted block mb-1.5">③ نص الرسالة</label>
                <textarea
                    placeholder={"أهلاً {name}،\nعندنا عرض خاص لك..."}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none focus:border-primary resize-none"
                    dir="rtl"
                />
            </div>

            <div>
                <label className="text-xs font-bold text-muted block mb-1.5">④ جدولة (اختياري)</label>
                <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => set('scheduled_at', e.target.value)}
                    className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                />
            </div>

            {preview && (
                <div className="bg-mist rounded-xl p-4 border border-border text-sm space-y-2">
                    <p className="font-bold text-ink flex items-center gap-2"><Eye size={14} /> معاينة</p>
                    <p className="text-success font-black">عدد المستقبلين: {preview.recipients_count}</p>
                    <div className="bg-white p-3 rounded-lg border border-border text-xs whitespace-pre-line">{preview.message_preview}</div>
                </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
                <button
                    onClick={handlePreview}
                    disabled={!form.message || previewing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-mist border border-border rounded-xl text-sm font-bold disabled:opacity-50"
                >
                    <Eye size={13} />
                    {previewing ? 'جاري...' : 'معاينة'}
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex justify-center items-center gap-2 bg-ink text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                    {saving && <RefreshCw size={13} className="animate-spin" />}
                    حفظ الحملة
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────
function LogsTab({ isConnected }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [retryingId, setRetryingId] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        template_type: '',
        date_from: '',
        date_to: ''
    });
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/logs', {
                params: { ...filters, page, per_page: 25 }
            });

            const data = res.data;
            setLogs(data.data ?? []);
            setMeta({
                current_page: data.current_page ?? 1,
                last_page: data.last_page ?? 1,
                total: data.total ?? 0
            });
        } catch {
            toast.error('تعذر تحميل السجل');
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (key, val) => {
        setFilters(p => ({ ...p, [key]: val }));
        setPage(1);
    };

    const retryLog = async (log) => {
        if (!confirm(`إعادة إرسال الرسالة إلى ${log.phone_number}؟`)) return;

        setRetryingId(log.id);
        const toastId = toast.loading('جاري إعادة الإرسال...');
        try {
            await api.post(`/whatsapp/logs/${log.id}/retry`);
            toast.success('تمت إعادة جدولة الرسالة ✅', { id: toastId });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'فشل إعادة الإرسال', { id: toastId });
        } finally {
            setRetryingId(null);
        }
    };

    const pendingCount = useMemo(() => logs.filter(l => l.status === 'pending').length, [logs]);
    const failedCount = useMemo(() => logs.filter(l => l.status === 'failed').length, [logs]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat icon={Hourglass} label="Pending بالصفحة" value={pendingCount} color="warning" />
                <MiniStat icon={XSquare} label="Failed بالصفحة" value={failedCount} color="danger" />
                <MiniStat icon={History} label="إجمالي النتائج" value={meta.total} color="primary" />
                <MiniStat icon={Activity} label="الصفحة الحالية" value={`${meta.current_page}/${meta.last_page}`} color="ink" />
            </div>

            {!isConnected && pendingCount > 0 && (
                <div className="flex items-start gap-2 text-warning text-xs font-bold bg-warning-pale p-3 rounded-xl border border-warning/20">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div>
                        <p>يوجد رسائل pending والبوت غير متصل.</p>
                        <p className="font-normal mt-1">غالبًا هذه الرسائل لم يتم تسليمها بعد أو تنتظر رجوع الاتصال.</p>
                    </div>
                </div>
            )}

            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-black text-ink flex items-center gap-2">
                        <Settings size={16} />
                        السجل الكامل
                    </h2>

                    <button onClick={load} className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-mist border border-border hover:bg-gray-100">
                        <RefreshCw size={13} />
                        تحديث
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={filters.status}
                        onChange={e => setFilter('status', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    >
                        <option value="">كل الحالات</option>
                        <option value="sent">تم الإرسال</option>
                        <option value="pending">في الانتظار</option>
                        <option value="failed">فشل</option>
                        <option value="processing">قيد المعالجة</option>
                        <option value="queued">في الطابور</option>
                    </select>

                    <select
                        value={filters.template_type}
                        onChange={e => setFilter('template_type', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    >
                        <option value="">كل الأنواع</option>
                        {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={e => setFilter('date_from', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    />

                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={e => setFilter('date_to', e.target.value)}
                        className="px-3 py-2.5 bg-mist border border-border rounded-xl text-sm outline-none"
                    />

                    <button
                        onClick={() => {
                            setFilters({ status: '', template_type: '', date_from: '', date_to: '' });
                            setPage(1);
                        }}
                        className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-muted hover:text-ink"
                    >
                        تصفير الفلاتر
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {loading ? <Spinner /> : logs.length === 0 ? (
                    <EmptyState icon={History} title="لا توجد رسائل" />
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full min-w-[1100px] text-sm text-right">
                            <thead className="bg-mist text-muted">
                                <tr>
                                    <th className="p-3 font-bold">الرقم</th>
                                    <th className="p-3 font-bold">العضو</th>
                                    <th className="p-3 font-bold">النوع</th>
                                    <th className="p-3 font-bold">الحالة</th>
                                    <th className="p-3 font-bold">الرسالة</th>
                                    <th className="p-3 font-bold">الخطأ</th>
                                    <th className="p-3 font-bold">تاريخ الإنشاء</th>
                                    <th className="p-3 font-bold">تاريخ الإرسال</th>
                                    <th className="p-3 font-bold">الإجراء</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border">
                                {logs.map(log => {
                                    const badge = getBadge(log.status);
                                    const canRetry = ['failed'].includes(log.status);

                                    return (
                                        <tr key={log.id} className="hover:bg-mist/70 transition-colors align-top">
                                            <td className="p-3 font-bold text-ink" dir="ltr">{log.phone_number ?? '—'}</td>
                                            <td className="p-3 text-muted">{log.client?.name ?? '—'}</td>
                                            <td className="p-3 text-muted">{TEMPLATE_LABELS[log.template_type] ?? log.template_type}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="p-3 text-ink/80 max-w-[280px]">
                                                <div className="line-clamp-3 whitespace-pre-wrap break-words">
                                                    {log.message_content ?? '—'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-danger max-w-[220px]">
                                                <div className="line-clamp-3 whitespace-pre-wrap break-words">
                                                    {log.error_message ?? '—'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-muted" dir="ltr">{fmtDate(log.created_at)}</td>
                                            <td className="p-3 text-muted" dir="ltr">{fmtDate(log.sent_at)}</td>
                                            <td className="p-3">
                                                {canRetry ? (
                                                    <button
                                                        onClick={() => retryLog(log)}
                                                        disabled={retryingId === log.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-black hover:opacity-80 disabled:opacity-50"
                                                    >
                                                        {retryingId === log.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <TimerReset size={12} />
                                                        )}
                                                        إعادة إرسال
                                                    </button>
                                                ) : log.status === 'pending' ? (
                                                    <span className="text-xs text-warning font-bold">بانتظار التحديث</span>
                                                ) : (
                                                    <span className="text-xs text-muted">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold disabled:opacity-40"
                    >
                        <ChevronRight size={14} />
                        السابق
                    </button>

                    <div className="text-sm font-black text-ink">
                        صفحة {meta.current_page} من {meta.last_page}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                        disabled={page >= meta.last_page}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold disabled:opacity-40"
                    >
                        التالي
                        <ChevronLeft size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, color = 'primary' }) {
    const styles = {
        primary: 'text-primary',
        warning: 'text-warning',
        danger: 'text-danger',
        ink: 'text-ink',
    };

    return (
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-center">
            <Icon size={18} className={`mx-auto mb-1.5 ${styles[color] ?? styles.primary}`} />
            <p className={`text-xl font-black ${styles[color] ?? styles.primary}`}>{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
        </div>
    );
}
