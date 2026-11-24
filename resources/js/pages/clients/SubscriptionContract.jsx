import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import logo from './logomygym.png';
import {
  ArrowRight,
  Printer,
  FileText,
  Phone,
  User,
  CalendarDays,
  ShieldCheck,
  CreditCard,
  MapPin,
  Clock3,
  CheckCircle2,
  Dumbbell,
  Wallet,
  Activity,
  BadgeInfo,
} from 'lucide-react';

const money = (value) => String(Number(value ?? 0));

const dateOnly = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ar-EG');
};

const dateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ar-EG');
};

const statusMeta = {
  active: {
    label: 'اشتراك نشط',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'from-emerald-500 to-emerald-400',
  },
  frozen: {
    label: 'اشتراك مجمّد',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    bar: 'from-amber-500 to-orange-400',
  },
  expired: {
    label: 'اشتراك منتهي',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'from-rose-500 to-rose-400',
  },
};

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className={`text-sm text-left ${strong ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-white border-slate-200 text-slate-900',
    primary: 'bg-sky-50 border-sky-100 text-sky-800',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] ?? tones.default}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl bg-white/80 border border-white shadow-sm flex items-center justify-center">
          <Icon size={18} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      </div>
      <p className="text-2xl font-black leading-none tabular-nums">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Icon size={17} />
        </div>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SubscriptionContract() {
  const { id, subscriptionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/clients/${id}/subscriptions/${subscriptionId}/contract`)
      .then((res) => setData(res.data.contract))
      .finally(() => setLoading(false));
  }, [id, subscriptionId]);

  const contractStatus = useMemo(() => {
    return statusMeta[data?.subscription?.status] ?? {
      label: data?.subscription?.status ?? 'حالة غير محددة',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      bar: 'from-slate-500 to-slate-400',
    };
  }, [data]);

  const progress = useMemo(() => {
    const total = Number(data?.plan?.duration_days ?? 0);
    const remaining = Math.max(0, Number(data?.subscription?.days_remaining ?? 0));
    if (!total || total <= 0) return 0;
    const passed = Math.max(0, total - remaining);
    return Math.min(100, Math.round((passed / total) * 100));
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-100 rounded-2xl" />
          <div className="h-40 bg-slate-100 rounded-[2rem]" />
          <div className="grid md:grid-cols-4 gap-4">
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
          </div>
          <div className="h-96 bg-slate-100 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-10 shadow-sm">
          <p className="text-lg font-black text-slate-900">تعذر تحميل بيانات العقد</p>
          <Link
            to={`/clients/${id}`}
            className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-sky-700 hover:underline"
          >
            <ArrowRight size={16} />
            الرجوع إلى بروفايل العميل
          </Link>
        </div>
      </div>
    );
  }

  const { gym, client, subscription, plan, attendance, payment, issued_at } = data;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 print:p-0" dir="rtl">
      <style>
        {`
          @media print {
            body {
              background: #fff !important;
            }
            .print-hide {
              display: none !important;
            }
            .print-shell {
              box-shadow: none !important;
              border: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
            .print-card {
              box-shadow: none !important;
              break-inside: avoid;
            }
            .print-section {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="print-hide flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          to={`/clients/${id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black hover:bg-slate-50 transition"
        >
          <ArrowRight size={16} />
          الرجوع للبروفايل
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition shadow-sm"
        >
          <Printer size={16} />
          طباعة العقد
        </button>
      </div>

      <div className="print-shell bg-[#f8fafc] rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${contractStatus.bar}`} />

        <div className="p-5 md:p-8 space-y-6">
          {/* Hero */}
          <div className="rounded-[2rem] bg-white border border-slate-200 p-6 md:p-8 print-card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logo} alt="My Gym Logo" className="w-full h-full object-contain p-2" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-black uppercase tracking-[0.14em]">
                      <FileText size={13} />
                      Contract
                    </span>
                    <span className={`inline-flex px-3 py-1 rounded-full border text-[11px] font-black ${contractStatus.badge}`}>
                      {contractStatus.label}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                    عقد اشتراك نادي My Gym
                  </h1>

                  <p className="text-sm md:text-base text-slate-600 font-bold mt-2">
                    هذا العقد يثبت اتفاق الاشتراك بين الطرف الأول{' '}
                    <span className="text-slate-900 font-black">My Gym — إدارة الكابتن إيهاب</span>{' '}
                    والطرف الثاني العميل المشترك بالبيانات الموضحة أدناه.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                      <Phone size={13} />
                      {gym.phone}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                      <CalendarDays size={13} />
                      إصدار العقد: {dateTime(issued_at)}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                      <CreditCard size={13} />
                      رقم الاشتراك: {subscription.id}
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-w-[260px] rounded-[1.5rem] bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-slate-900">شريط حالة الاشتراك</p>
                  <p className="text-sm font-black text-slate-700">{progress}%</p>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-l ${contractStatus.bar}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-bold text-slate-600">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <p className="text-slate-500 mb-1">تاريخ البداية</p>
                    <p className="text-slate-900 font-black">{dateOnly(subscription.start_date)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <p className="text-slate-500 mb-1">تاريخ النهاية</p>
                    <p className="text-slate-900 font-black">{dateOnly(subscription.end_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 print-section">
            <StatBox icon={Wallet} label="المدفوع" value={money(subscription.amount_paid)} tone="success" />
            <StatBox icon={BadgeInfo} label="الخصم" value={money(subscription.discount_amount)} tone="warning" />
            <StatBox icon={Activity} label="إجمالي الحضور" value={attendance.total_visits ?? 0} tone="primary" />
            <StatBox
              icon={Clock3}
              label="الأيام المتبقية"
              value={subscription.days_remaining ?? 0}
              tone={subscription.status === 'frozen' ? 'warning' : 'default'}
            />
          </div>

          {/* Details */}
          <div className="grid xl:grid-cols-2 gap-5 print-section">
            <SectionCard title="بيانات الطرف الثاني (العميل)" icon={User}>
              <div className="space-y-1">
                <InfoRow label="الاسم" value={client.name} strong />
                <InfoRow label="رقم الهاتف" value={client.phone} />
                <InfoRow label="النوع" value={client.gender === 'male' ? 'ذكر' : 'أنثى'} />
                <InfoRow label="السن" value={client.age ?? '—'} />
                <InfoRow label="العنوان" value={client.address ?? '—'} />
                <InfoRow label="كود العضو" value={client.qr_id} />
              </div>
            </SectionCard>

            <SectionCard title="بيانات الطرف الأول" icon={ShieldCheck}>
              <div className="space-y-1">
                <InfoRow label="اسم الجهة" value={gym.name ?? 'My Gym'} strong />
                <InfoRow label="الإدارة" value={gym.manager ?? 'الكابتن إيهاب'} />
                <InfoRow label="رقم التواصل" value={gym.phone ?? '01116485054'} />
                <InfoRow label="نوع المستند" value="عقد اشتراك عميل" />
                <InfoRow label="تاريخ الإصدار" value={dateTime(issued_at)} />
                <InfoRow label="حالة العقد" value={contractStatus.label} />
              </div>
            </SectionCard>

            <SectionCard title="تفاصيل الباقة" icon={Dumbbell}>
              <div className="space-y-1">
                <InfoRow label="اسم الباقة" value={plan.label || plan.name || '—'} strong />
                <InfoRow label="مدة الباقة" value={`${plan.duration_days ?? '—'} يوم`} />
                <InfoRow label="عدد الحصص" value={plan.sessions_count ?? 'غير محدود'} />
                <InfoRow label="سعر الباقة" value={money(plan.price)} />
              </div>
            </SectionCard>

            <SectionCard title="تفاصيل الاشتراك والتنفيذ" icon={CreditCard}>
              <div className="space-y-1">
                <InfoRow label="تاريخ البداية" value={dateOnly(subscription.start_date)} />
                <InfoRow label="تاريخ النهاية" value={dateOnly(subscription.end_date)} />
                <InfoRow label="الأيام المتبقية" value={subscription.days_remaining ?? 0} />
                <InfoRow label="الحصص المتبقية" value={subscription.sessions_remaining ?? 'غير محدود'} />
                <InfoRow label="الحالة" value={contractStatus.label} strong />
                <InfoRow label="آخر حضور" value={dateTime(attendance.last_visit_at)} />
              </div>
            </SectionCard>
          </div>

          {/* Finance + terms */}
          <div className="grid xl:grid-cols-3 gap-5 print-section">
            <div className="xl:col-span-2">
              <SectionCard title="الماليات وطريقة السداد" icon={Wallet}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.16em] mb-2">الملخص المالي</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">سعر الباقة</span>
                        <span className="font-black text-slate-900">{money(plan.price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">الخصم</span>
                        <span className="font-black text-amber-700">{money(subscription.discount_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-500">المدفوع النهائي</span>
                        <span className="font-black text-emerald-700 text-lg">{money(subscription.amount_paid)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.16em] mb-2">بيانات السداد</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">طريقة الدفع</span>
                        <span className="font-black text-slate-900">{payment?.payment_method ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">قيمة العملية</span>
                        <span className="font-black text-slate-900">{money(payment?.amount ?? subscription.amount_paid)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">تاريخ العملية</span>
                        <span className="font-black text-slate-900">{dateTime(payment?.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="شروط مختصرة" icon={CheckCircle2}>
              <div className="space-y-3 text-sm text-slate-700 font-medium leading-7">
                <p className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  يلتزم العميل باللوائح الداخلية للنادي واحترام مواعيد العمل والتعليمات التنظيمية.
                </p>
                <p className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  الاشتراك يخص العميل المذكور فقط ولا يجوز نقله أو مشاركته مع أي شخص آخر.
                </p>
                <p className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  أي تجميد أو تعديل على الاشتراك يتم وفق النظام المعتمد داخل النادي وبموافقة الإدارة.
                </p>
                <p className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  توقيع الطرفين على هذا العقد يعد إقرارًا بصحة البيانات والموافقة على تفاصيل الاشتراك.
                </p>
              </div>
            </SectionCard>
          </div>

          {/* Notes strip */}
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-5 print-section">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">ملاحظة إدارية</p>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  هذا المستند تم إنشاؤه من النظام ويعكس حالة الاشتراك الحالية وبيانات العميل والباقة وقت الإصدار.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-sm font-black">
                <MapPin size={16} />
                My Gym — إدارة الكابتن إيهاب
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid md:grid-cols-2 gap-5 print-section">
            <div className="rounded-[1.75rem] bg-white border border-slate-200 p-6">
              <p className="text-sm text-slate-500 font-black mb-12">توقيع الطرف الأول</p>
              <div className="border-b-2 border-dashed border-slate-300 h-10" />
              <div className="mt-4 text-sm font-bold text-slate-700">
                <p>My Gym</p>
                <p>إدارة الكابتن إيهاب خاطر</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white border border-slate-200 p-6">
              <p className="text-sm text-slate-500 font-black mb-12">توقيع الطرف الثاني</p>
              <div className="border-b-2 border-dashed border-slate-300 h-10" />
              <div className="mt-4 text-sm font-bold text-slate-700">
                <p>{client.name}</p>
                <p>{client.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
