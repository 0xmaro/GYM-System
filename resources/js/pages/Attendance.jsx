import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ScanLine,
  UserCheck,
  XCircle,
  AlertTriangle,
  Clock3,
  User,
  Search,
  ExternalLink,
  RefreshCw,
  Snowflake,
  CalendarDays,
  Hash,
  Activity,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
  BadgeAlert,
  BellRing,
  Wallet,
  Package,
  MinusCircle,
} from 'lucide-react';

const formatValue = (val) => {
  if (val === null || val === undefined || val === '∞') return '∞';
  const num = parseInt(val, 10);
  if (Number.isNaN(num)) return val;
  if (num > 1000) return '+1000';
  if (num < 0) return '0';
  return num;
};

const formatMoney = (val) => {
  const num = Number(val ?? 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('ar-EG');
};

const formatTime = (date) => {
  try {
    return new Date(date).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <Panel className="min-h-[420px] flex items-center justify-center p-10">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[24px] bg-sky-50 text-sky-600">
          <ScanLine size={44} />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-800">في انتظار المسح</h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          مرّر كارت العضو أو امسح الـ QR لعرض حالة الاشتراك وتسجيل الحضور بشكل فوري.
        </p>
      </div>
    </Panel>
  );
}

function ResultActionButtons({
  clientId,
  primaryText = 'فتح ملف العميل',
  onNavigate,
  onAddSession,
  onSendReminder,
  showAddSession = false,
  showReminder = false,
  reminderLoading = false,
}) {
  if (!clientId) return null;

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => onNavigate(`/clients/${clientId}`)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <ExternalLink size={18} />
          {primaryText}
        </button>

        <button
          onClick={() => onNavigate(`/clients/${clientId}/subscribe`)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <CreditCard size={18} />
          تجديد / إنشاء اشتراك
        </button>

        {showAddSession && (
          <button
            onClick={onAddSession}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
          >
            <CalendarDays size={18} />
            بيع حصة + تسجيل حضور
          </button>
        )}
      </div>

      {showReminder && (
        <button
          onClick={onSendReminder}
          disabled={reminderLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
        >
          <BellRing size={18} />
          {reminderLoading ? 'جارٍ إرسال التذكير...' : 'إرسال تذكير للعميل'}
        </button>
      )}
    </div>
  );
}

function ErrorCard({ scan, onNavigate, onOpenSessionModal, onSendReminder, reminderLoading }) {
  const config = useMemo(() => {
    switch (scan.status) {
      case 'expired':
        return {
          icon: <BadgeAlert size={34} />,
          tone: 'red',
          title: 'الاشتراك منتهي',
          note: 'تم رفض تسجيل الدخول، ويمكنك التجديد أو بيع حصة مدفوعة الآن.',
          boxClass: 'bg-rose-50 border-rose-200 text-rose-700',
        };
      case 'no_sessions':
        return {
          icon: <AlertTriangle size={34} />,
          tone: 'amber',
          title: 'انتهت الحصص',
          note: 'العضو استنفد جميع الحصص المتاحة في الاشتراك الحالي.',
          boxClass: 'bg-amber-50 border-amber-200 text-amber-700',
        };
      case 'frozen':
        return {
          icon: <Snowflake size={34} />,
          tone: 'blue',
          title: 'الاشتراك مجمّد',
          note: 'لا يمكن تسجيل الدخول حتى يتم إنهاء أو فك التجميد، أو بيع حصة مستقلة.',
          boxClass: 'bg-sky-50 border-sky-200 text-sky-700',
        };
      case 'duplicate':
        return {
          icon: <Clock3 size={34} />,
          tone: 'purple',
          title: 'تم تسجيل الحضور مسبقًا',
          note: 'هذه محاولة متكررة ضمن فترة الـ cooldown المحددة في النظام.',
          boxClass: 'bg-violet-50 border-violet-200 text-violet-700',
        };
      case 'unknown_card':
        return {
          icon: <ShieldAlert size={34} />,
          tone: 'red',
          title: 'كارت غير معروف',
          note: 'الـ QR غير مرتبط بعضو صالح أو الكارت غير مُوزّع.',
          boxClass: 'bg-rose-50 border-rose-200 text-rose-700',
        };
      case 'no_subscription':
        return {
          icon: <XCircle size={34} />,
          tone: 'red',
          title: 'لا يوجد اشتراك',
          note: 'العضو لا يملك اشتراكًا حاليًا، ويمكن بيع حصة مدفوعة مباشرة.',
          boxClass: 'bg-rose-50 border-rose-200 text-rose-700',
        };
      default:
        return {
          icon: <XCircle size={34} />,
          tone: 'red',
          title: 'تعذر تسجيل الحضور',
          note: 'راجع بيانات العضو أو الاشتراك ثم أعد المحاولة.',
          boxClass: 'bg-rose-50 border-rose-200 text-rose-700',
        };
    }
  }, [scan.status]);

  const canAddSession = ['expired', 'frozen', 'no_subscription', 'no_sessions'].includes(scan.status);
  const canSendReminder = ['expired', 'no_sessions', 'frozen'].includes(scan.status) && !!scan.subscriptionId;

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white border border-slate-200 text-slate-700 shadow-sm">
            {config.icon}
          </div>

          <div className="min-w-0">
            <div className="mb-2">
              <StatusPill tone={config.tone}>{config.title}</StatusPill>
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">
              {scan.clientName || 'العميل غير محدد'}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className={`rounded-[22px] border p-5 ${config.boxClass}`}>
          <p className="text-base font-bold">{scan.message || config.note}</p>
          <p className="mt-2 text-sm opacity-80">{config.note}</p>

          {scan.endDate && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold">
              <CalendarDays size={16} />
              تاريخ الانتهاء: {scan.endDate}
            </div>
          )}
        </div>

        <ResultActionButtons
          clientId={scan.clientId}
          onNavigate={onNavigate}
          primaryText="فتح ملف العميل"
          showAddSession={canAddSession}
          onAddSession={() => onOpenSessionModal(scan)}
          showReminder={canSendReminder}
          onSendReminder={() => onSendReminder(scan)}
          reminderLoading={reminderLoading}
        />
      </div>
    </Panel>
  );
}

function MetricCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className={`rounded-[22px] border p-5 ${tones[tone]}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 border border-white">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function SuccessCard({ scan, onNavigate }) {
  const { client, subscription, has_debt, session_sale } = scan.data || {};
  const days = subscription?.days_remaining ?? 0;
  const sessions = subscription?.sessions_remaining;
  const isEndingSoon = Number(days) <= 3 && subscription?.status !== 'session_package';
  const isSessionSale = subscription?.status === 'session_package';
  const clientInitial = client?.name?.charAt(0) || '؟';

  return (
    <Panel className="overflow-hidden">
      <div className={`border-b px-6 py-5 ${isSessionSale ? 'border-sky-100 bg-sky-50' : 'border-emerald-100 bg-emerald-50'}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-white border shadow-sm ${isSessionSale ? 'border-sky-200 text-sky-600' : 'border-emerald-200 text-emerald-600'}`}>
            <UserCheck size={34} />
          </div>

          <div>
            <div className="mb-2">
              <StatusPill tone={isSessionSale ? 'blue' : isEndingSoon ? 'amber' : 'green'}>
                {isSessionSale
                  ? 'تم بيع الحصة/الباقة وتسجيل الحضور'
                  : isEndingSoon
                  ? 'تم التسجيل — الاشتراك يقترب من الانتهاء'
                  : 'تم تسجيل الحضور بنجاح'}
              </StatusPill>
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">{client?.name}</h3>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-500">
            {client?.photo_url ? (
              <img src={client.photo_url} alt={client.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold">{clientInitial}</span>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="truncate text-xl font-extrabold text-slate-800">{client?.name}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill tone="slate">
                <Hash size={14} />
                #{client?.qr_id || '—'}
              </StatusPill>

              <StatusPill tone={isSessionSale ? 'blue' : 'green'}>
                <Activity size={14} />
                {isSessionSale
                  ? 'حضور عبر حصة مدفوعة'
                  : `زيارات الاشتراك: ${client?.total_visits_in_sub ?? 0}`}
              </StatusPill>
            </div>
            <p className="mt-3 text-sm text-slate-500">آخر زيارة: {client?.last_visit ?? 'أول زيارة'}</p>
          </div>
        </div>

        {has_debt && (
          <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <AlertTriangle size={18} />
              <span className="text-sm font-extrabold">يوجد مبلغ مستحق على العميل</span>
            </div>
            <p className="text-2xl font-extrabold text-amber-800">
              {formatMoney(has_debt.amount)} ج.م
            </p>
            {has_debt.reason && (
              <p className="mt-2 text-sm text-amber-700">{has_debt.reason}</p>
            )}
          </div>
        )}

        {session_sale ? (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              icon={<Package size={20} />}
              label="نوع الحصة"
              value={session_sale.session_type || '—'}
              tone="blue"
            />
            <MetricCard
              icon={<Hash size={20} />}
              label="عدد الحصص"
              value={formatValue(session_sale.sessions_count)}
              tone="blue"
            />
            <MetricCard
              icon={<Wallet size={20} />}
              label="الإجمالي"
              value={`${formatMoney(session_sale.total_amount)} ج.م`}
              tone="green"
            />
            <MetricCard
              icon={<MinusCircle size={20} />}
              label="المتبقي"
              value={`${formatMoney(session_sale.remaining_amount)} ج.م`}
              tone={Number(session_sale.remaining_amount) > 0 ? 'amber' : 'green'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              icon={<Hash size={20} />}
              label="الحصص المتبقية"
              value={formatValue(sessions)}
              tone="blue"
            />

            <MetricCard
              icon={<CalendarDays size={20} />}
              label="الأيام المتبقية"
              value={formatValue(days)}
              tone={isEndingSoon ? 'amber' : 'green'}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/clients/${client?.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <User size={18} />
            فتح ملف العميل
          </Link>

          <button
            onClick={() => onNavigate('/clients')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Search size={18} />
            بحث عن عميل آخر
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ScanInputCard({ qrCode, setQrCode, loading, handleScan, inputRef, fetchTodayList }) {
  return (
    <Panel className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusPill tone="green">
              <CheckCircle2 size={14} />
              جهاز المسح جاهز
            </StatusPill>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">تسجيل الحضور</h2>
          <p className="mt-2 text-sm text-slate-500">
            امسح الكارت لعرض حالة العضو وتسجيل الحضور أو رفضه حسب الاشتراك.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTodayList}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          تحديث القائمة
        </button>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="امسح QR أو اكتب رقم الكارت"
            className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-7 text-center text-2xl font-extrabold tracking-wide text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
            autoComplete="off"
            dir="ltr"
          />

          {loading && (
            <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
              <RefreshCw size={24} className="animate-spin text-sky-500" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="submit"
            disabled={loading || !qrCode.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanLine size={18} />
            {loading ? 'جارٍ الفحص...' : 'تسجيل الآن'}
          </button>

          <button
            type="button"
            onClick={() => setQrCode('')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <XCircle size={18} />
            مسح الحقل
          </button>
        </div>
      </form>
    </Panel>
  );
}

function TodayAttendanceList({ todayList, listLoading, fetchTodayList }) {
  return (
    <Panel className="flex min-h-[720px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-5">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">حضور اليوم</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">آخر عمليات الحضور المسجلة اليوم</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-700">
            {todayList.length}
          </span>
          <button
            onClick={fetchTodayList}
            disabled={listLoading}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={listLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {listLoading && todayList.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={26} className="animate-spin" />
            <p className="text-sm font-bold">جارٍ تحميل البيانات...</p>
          </div>
        ) : todayList.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <Activity size={28} />
            <p className="text-sm font-bold">لا توجد سجلات حضور اليوم بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayList.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <span className="text-sm font-extrabold">
                      {record.client?.name?.charAt(0) ?? '؟'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-800">
                      {record.client?.name ?? '—'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {record.type === 'qr'
                          ? 'QR'
                          : record.type === 'session'
                          ? 'حصة'
                          : 'يدوي'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {record.client?.qr_id ? `#${record.client.qr_id}` : 'بدون QR'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl bg-sky-50 px-3 py-2 text-xs font-extrabold text-sky-700">
                  {formatTime(record.check_in_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function SessionSaleModal({
  open,
  onClose,
  sessionClient,
  sessionTypes,
  selectedSessionType,
  setSelectedSessionType,
  sessionCount,
  setSessionCount,
  unitPrice,
  setUnitPrice,
  discountAmount,
  setDiscountAmount,
  paidAmount,
  setPaidAmount,
  sessionNotes,
  setSessionNotes,
  sessionLoading,
  onConfirm,
}) {
  if (!open) return null;

  const gross = Math.max(0, Number(sessionCount || 0) * Number(unitPrice || 0));
  const discount = Math.max(0, Number(discountAmount || 0));
  const total = Math.max(0, gross - discount);
  const paid = Math.max(0, Number(paidAmount || 0));
  const remaining = Math.max(0, total - paid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-extrabold text-slate-800">بيع حصة / باقة وتسجيل حضور</h3>
        <p className="mt-2 text-sm text-slate-500">
          {sessionClient?.clientName} — أدخل البيانات المالية ثم أكّد العملية.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-700">نوع الحصة</label>
            <select
              value={selectedSessionType}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedSessionType(value);

                const picked = sessionTypes.find((item) => String(item.id) === String(value));
                if (picked?.default_price !== undefined && picked?.default_price !== null) {
                  setUnitPrice(String(picked.default_price));
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
            >
              <option value="">اختر نوع الحصة</option>
              {sessionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">عدد الحصص</label>
            <input
              type="number"
              min="1"
              value={sessionCount}
              onChange={(e) => setSessionCount(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">سعر الحصة</label>
            <input
              type="number"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">الخصم</label>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">المدفوع</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-700">ملاحظات</label>
            <textarea
              rows="3"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:bg-white"
              placeholder="ملاحظات اختيارية"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">الإجمالي قبل الخصم</p>
            <p className="mt-2 text-lg font-extrabold text-slate-800">{formatMoney(gross)} ج.م</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-600">الإجمالي النهائي</p>
            <p className="mt-2 text-lg font-extrabold text-emerald-800">{formatMoney(total)} ج.م</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-600">المتبقي</p>
            <p className="mt-2 text-lg font-extrabold text-amber-800">{formatMoney(remaining)} ج.م</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            إلغاء
          </button>

          <button
            onClick={onConfirm}
            disabled={sessionLoading || !selectedSessionType || Number(sessionCount) < 1}
            className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {sessionLoading ? 'جارٍ التنفيذ...' : 'حفظ وتسجيل حضور'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Attendance() {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const inputRef = useRef(null);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [sessionClient, setSessionClient] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);

  const [sessionCount, setSessionCount] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [sessionNotes, setSessionNotes] = useState('');

  const fetchTodayList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await api.get('/attendance/today');
      setTodayList(res.data.data ?? []);
    } catch {
      toast.error('تعذر تحميل حضور اليوم');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayList();
  }, [fetchTodayList]);

  useEffect(() => {
    const iv = setInterval(() => {
      const active = document.activeElement;
      const isOtherInput =
        active && active.tagName === 'INPUT' && active !== inputRef.current;

      if (!isOtherInput) {
        inputRef.current?.focus();
      }
    }, 1200);

    return () => clearInterval(iv);
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();

    const code = qrCode.trim();
    if (!code || loading) return;

    setLoading(true);

    try {
      const res = await api.post('/attendance/qr-scan', { qr_id: code });

      setLastScan({
        type: 'success',
        data: res.data.data,
        status: res.data.status,
        message: res.data.message,
      });

      toast.success(res.data.message || 'تم تسجيل الحضور');
      fetchTodayList();
    } catch (err) {
      const d = err.response?.data ?? {};

      setLastScan({
        type: 'error',
        message: d.message || 'تعذر تنفيذ العملية',
        clientId: d.client_id,
        clientName: d.client_name,
        subscriptionId: d.subscription_id,
        endDate: d.end_date,
        status: d.status,
      });

      toast.error(d.message || 'فشل تسجيل الحضور');
    } finally {
      setQrCode('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const resetSessionForm = () => {
    setSelectedSessionType('');
    setSessionCount('1');
    setUnitPrice('0');
    setDiscountAmount('0');
    setPaidAmount('0');
    setSessionNotes('');
  };

  const openSessionModal = async (scan) => {
    if (!scan?.clientId) return;

    setSessionClient(scan);
    resetSessionForm();
    setSessionModalOpen(true);

    try {
      const res = await api.get('/session-types');
      setSessionTypes(res.data.data ?? res.data ?? []);
    } catch {
      toast.error('تعذر تحميل أنواع الحصص');
    }
  };

  const closeSessionModal = () => {
    setSessionModalOpen(false);
    setSessionClient(null);
    resetSessionForm();
  };

  const confirmSessionAttendance = async () => {
    if (!sessionClient?.clientId || !selectedSessionType) {
      toast.error('اختر نوع الحصة أولًا');
      return;
    }

    const count = Number(sessionCount);
    const price = Number(unitPrice);
    const discount = Number(discountAmount);
    const paid = Number(paidAmount);

    if (Number.isNaN(count) || count < 1) {
      toast.error('عدد الحصص يجب أن يكون 1 على الأقل');
      return;
    }

    if ([price, discount, paid].some((n) => Number.isNaN(n) || n < 0)) {
      toast.error('القيم المالية يجب أن تكون أرقامًا صحيحة');
      return;
    }

    setSessionLoading(true);

    try {
      const res = await api.post('/attendance/session-package-check-in', {
        client_id: sessionClient.clientId,
        session_type_id: selectedSessionType,
        sessions_count: count,
        unit_price: price,
        discount_amount: discount,
        paid_amount: paid,
        notes: sessionNotes || 'تسجيل حضور من شاشة الاسكان عبر حصة مدفوعة',
      });

      setLastScan({
        type: 'success',
        data: res.data.data,
        status: res.data.status,
        message: res.data.message,
      });

      toast.success(res.data.message || 'تم بيع الحصة وتسجيل الحضور');
      closeSessionModal();
      fetchTodayList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تنفيذ العملية');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSendReminder = async (scan) => {
    if (!scan?.subscriptionId) {
      toast.error('لا يوجد اشتراك صالح لإرسال التذكير');
      return;
    }

    setReminderLoading(true);

    try {
      const res = await api.post(`/subscriptions/${scan.subscriptionId}/manual-reminder`);
      toast.success(res.data.message || 'تم إرسال التذكير');
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إرسال التذكير');
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50/70 p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <ScanInputCard
            qrCode={qrCode}
            setQrCode={setQrCode}
            loading={loading}
            handleScan={handleScan}
            inputRef={inputRef}
            fetchTodayList={fetchTodayList}
          />

          {!lastScan ? (
            <EmptyState />
          ) : lastScan.type === 'success' ? (
            <SuccessCard scan={lastScan} onNavigate={navigate} />
          ) : (
            <ErrorCard
              scan={lastScan}
              onNavigate={navigate}
              onOpenSessionModal={openSessionModal}
              onSendReminder={handleSendReminder}
              reminderLoading={reminderLoading}
            />
          )}
        </div>

        <TodayAttendanceList
          todayList={todayList}
          listLoading={listLoading}
          fetchTodayList={fetchTodayList}
        />
      </div>

      <SessionSaleModal
        open={sessionModalOpen}
        onClose={closeSessionModal}
        sessionClient={sessionClient}
        sessionTypes={sessionTypes}
        selectedSessionType={selectedSessionType}
        setSelectedSessionType={setSelectedSessionType}
        sessionCount={sessionCount}
        setSessionCount={setSessionCount}
        unitPrice={unitPrice}
        setUnitPrice={setUnitPrice}
        discountAmount={discountAmount}
        setDiscountAmount={setDiscountAmount}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        sessionNotes={sessionNotes}
        setSessionNotes={setSessionNotes}
        sessionLoading={sessionLoading}
        onConfirm={confirmSessionAttendance}
      />
    </div>
  );
}
