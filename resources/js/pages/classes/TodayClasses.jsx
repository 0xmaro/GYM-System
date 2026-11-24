import { useEffect, useMemo, useState } from 'react';
import { classApi } from '../../lib/classes';
import {
  CalendarDays,
  Clock3,
  Users,
  Dumbbell,
  Filter,
  Search,
  UserRound,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: 'from-slate-50 to-white border-slate-200 text-slate-900',
    primary: 'from-sky-50 to-white border-sky-100 text-sky-800',
    success: 'from-emerald-50 to-white border-emerald-100 text-emerald-800',
    warning: 'from-amber-50 to-white border-amber-100 text-amber-800',
  };

  return (
    <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 shadow-sm ${tones[tone] ?? tones.default}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-white shadow-sm flex items-center justify-center">
          <Icon size={20} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      </div>
      <p className="text-2xl font-black leading-none tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Sparkles size={28} className="text-slate-400" />
      </div>
      <p className="text-lg font-black text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 font-medium mt-2">{hint}</p>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 rounded-[1.75rem] bg-slate-100" />
        <div className="h-28 rounded-[1.75rem] bg-slate-100" />
        <div className="h-28 rounded-[1.75rem] bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-[2rem] bg-slate-100" />
        <div className="h-72 rounded-[2rem] bg-slate-100" />
      </div>
    </div>
  );
}

export default function TodayClasses() {
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [result, setResult] = useState({
    date: '',
    day: '',
    count: 0,
    classes: [],
  });

  const [selectedClass, setSelectedClass] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const loadTodayClasses = async (selectedDate = '') => {
    try {
      setLoading(true);
      const res = await classApi.getToday(selectedDate || null);
      setResult(res);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'فشل تحميل حصص اليوم');
    } finally {
      setLoading(false);
    }
  };

  const openAttendees = async (gymClass) => {
    try {
      setSelectedClass(gymClass);
      setAttendees([]);
      setAttendeesCount(0);
      setAttendeesLoading(true);

      const res = await classApi.getAttendees(gymClass.id, date || null);
      setAttendees(res.data || []);
      setAttendeesCount(res.count || 0);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'فشل تحميل قائمة الحضور');
    } finally {
      setAttendeesLoading(false);
    }
  };

  useEffect(() => {
    loadTodayClasses();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadTodayClasses(date);
  };

  const totalAttendees = useMemo(
    () => (result.classes || []).reduce((sum, cls) => sum + Number(cls.attendees_today ?? 0), 0),
    [result.classes]
  );

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-[#f8fbff] to-white p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 backdrop-blur shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-l from-sky-500 via-cyan-400 to-emerald-400" />
        <div className="p-6 md:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-black uppercase tracking-[0.18em] mb-3">
              <CalendarDays size={13} />
              Today's Schedule
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
              حصص اليوم
            </h1>

            <p className="text-sm md:text-base text-slate-500 font-medium mt-3 leading-7">
              شاشة مريحة لعرض الحصص اليومية، متابعة السعات، وعدد الحضور لكل حصة بشكل واضح ومنظم.
            </p>
          </div>

          <form
            onSubmit={handleFilter}
            className="w-full xl:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative min-w-[220px]">
              <CalendarDays
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black text-white px-5 py-3 text-sm font-black transition shadow-sm"
            >
              <Filter size={16} />
              عرض الحصص
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="التاريخ"
          value={result.date || '—'}
          tone="primary"
        />
        <StatCard
          icon={Clock3}
          label="اليوم"
          value={result.day || '—'}
          tone="default"
        />
        <StatCard
          icon={Dumbbell}
          label="عدد الحصص"
          value={result.count || 0}
          tone="success"
        />
        <StatCard
          icon={Users}
          label="إجمالي الحضور"
          value={totalAttendees}
          tone="warning"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingCards />
      ) : result.classes?.length === 0 ? (
        <EmptyState
          title="لا توجد حصص في هذا اليوم"
          hint="جرّب اختيار تاريخ آخر أو أضف جدول حصص جديد لهذا اليوم."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {result.classes.map((item) => {
            const attendeesToday = Number(item.attendees_today ?? 0);
            const capacity = Number(item.capacity ?? 20);
            const ratio = capacity > 0 ? Math.min(100, Math.round((attendeesToday / capacity) * 100)) : 0;

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-sky-500 to-emerald-400" />

                <div className="p-5 md:p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-black">
                          <Clock3 size={12} />
                          {item.time || 'بدون وقت'}
                        </span>

                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-black">
                          <Dumbbell size={12} />
                          {item.type || '—'}
                        </span>
                      </div>

                      <h3 className="text-xl md:text-2xl font-black text-slate-900">
                        {item.name}
                      </h3>

                      <p className="text-sm text-slate-500 font-medium mt-2">
                        كلاس اليوم مع تنظيم أوضح للحضور والسعة والكابتن.
                      </p>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-50 to-emerald-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <Dumbbell size={22} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.14em] mb-1">
                        الكابتن
                      </p>
                      <p className="font-black text-slate-900">{item.captain_name || 'غير محدد'}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.14em] mb-1">
                        الحضور اليوم
                      </p>
                      <p className="font-black text-slate-900">{attendeesToday}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.14em] mb-1">
                        المدة
                      </p>
                      <p className="font-black text-slate-900">{item.duration_minutes ?? 60} دقيقة</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.14em] mb-1">
                        السعة
                      </p>
                      <p className="font-black text-slate-900">{capacity}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black text-slate-900">نسبة إشغال الحصة</p>
                      <p className="text-sm font-black text-slate-700">{ratio}%</p>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ratio >= 85
                            ? 'bg-gradient-to-l from-rose-500 to-orange-400'
                            : ratio >= 60
                            ? 'bg-gradient-to-l from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-l from-emerald-500 to-sky-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-2">
                      {attendeesToday} من {capacity} مقاعد محجوزة أو مستخدمة.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => openAttendees(item)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm transition shadow-sm"
                    >
                      <Search size={16} />
                      عرض قائمة الحضور
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="relative overflow-hidden border-b border-slate-100">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-sky-500 to-emerald-400" />
              <div className="p-5 md:p-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-black">
                      <Users size={12} />
                      عدد الحاضرين: {attendeesCount}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-black">
                      <Clock3 size={12} />
                      {selectedClass.time || 'بدون وقت'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-slate-900">{selectedClass.name}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-2">
                    قائمة الحضور الخاصة بهذه الحصة في التاريخ المحدد.
                  </p>
                </div>

                <button
                  onClick={() => setSelectedClass(null)}
                  className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto max-h-[70vh] bg-slate-50/40">
              {attendeesLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-20 rounded-2xl bg-slate-100" />
                  <div className="h-20 rounded-2xl bg-slate-100" />
                  <div className="h-20 rounded-2xl bg-slate-100" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Users size={24} className="text-slate-400" />
                  </div>
                  <p className="font-black text-slate-900">لا يوجد حضور اليوم</p>
                  <p className="text-sm text-slate-500 font-medium mt-2">
                    لم يتم تسجيل أي حضور لهذه الحصة حتى الآن.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendees.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <UserRound size={18} />
                        </div>

                        <div>
                          <p className="font-black text-slate-900 text-base">{row.client_name}</p>
                          <p className="text-sm text-slate-500 font-medium mt-1">
                            {row.client_phone || 'بدون رقم هاتف'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                          <CheckCircle2 size={12} />
                          {row.type}
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-black">
                          <Clock3 size={12} />
                          {row.check_in_time || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
