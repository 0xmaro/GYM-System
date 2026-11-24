// resources/js/pages/classes/Index.jsx
import { useEffect, useState } from 'react';
import { classApi } from '../../lib/classes';

const initialForm = {
  name: '',
  type: '',
  captain_id: '',
  schedule: {
    days: [],
    time: '',
  },
  duration_minutes: 60,
  capacity: 20,
  is_active: true,
};

const days = [
  { label: 'السبت', value: 'saturday' },
  { label: 'الأحد', value: 'sunday' },
  { label: 'الاثنين', value: 'monday' },
  { label: 'الثلاثاء', value: 'tuesday' },
  { label: 'الأربعاء', value: 'wednesday' },
  { label: 'الخميس', value: 'thursday' },
  { label: 'الجمعة', value: 'friday' },
];

export default function ClassesIndex({ captains = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await classApi.getAll();
      setRows(data || []);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'فشل تحميل الحصص');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleDay = (day) => {
    const exists = form.schedule.days.includes(day);
    setForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: exists
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      type: item.type || '',
      captain_id: item.captain_id || '',
      schedule: {
        days: item.schedule?.days || [],
        time: item.schedule?.time || '',
      },
      duration_minutes: item.duration_minutes ?? 60,
      capacity: item.capacity ?? 20,
      is_active: !!item.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...form,
        captain_id: Number(form.captain_id),
        duration_minutes: Number(form.duration_minutes),
        capacity: Number(form.capacity),
      };

      if (editingId) {
        await classApi.update(editingId, payload);
        alert('تم تعديل الحصة بنجاح');
      } else {
        await classApi.create(payload);
        alert('تم إنشاء الحصة بنجاح');
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'فشل حفظ الحصة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف الحصة؟')) return;

    try {
      await classApi.remove(id);
      alert('تم حذف الحصة بنجاح');
      loadData();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'فشل حذف الحصة');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة الحصص</h1>
        <p className="text-sm text-gray-500">
          إضافة وتعديل وجدولة الحصص الرياضية
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {editingId ? 'تعديل حصة' : 'إضافة حصة جديدة'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="اسم الحصة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="border rounded-lg px-3 py-2"
            placeholder="نوع الحصة"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />

          <select
            className="border rounded-lg px-3 py-2"
            value={form.captain_id}
            onChange={(e) => setForm({ ...form, captain_id: e.target.value })}
          >
            <option value="">اختر الكابتن</option>
            {captains.map((captain) => (
              <option key={captain.id} value={captain.id}>
                {captain.name}
              </option>
            ))}
          </select>

          <input
            type="time"
            className="border rounded-lg px-3 py-2"
            value={form.schedule.time}
            onChange={(e) =>
              setForm({
                ...form,
                schedule: { ...form.schedule, time: e.target.value },
              })
            }
          />

          <input
            type="number"
            min="15"
            max="300"
            className="border rounded-lg px-3 py-2"
            placeholder="المدة بالدقائق"
            value={form.duration_minutes}
            onChange={(e) =>
              setForm({ ...form, duration_minutes: e.target.value })
            }
          />

          <input
            type="number"
            min="1"
            max="500"
            className="border rounded-lg px-3 py-2"
            placeholder="السعة"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </div>

        <div>
          <div className="mb-2 font-medium">أيام الحصة</div>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const active = form.schedule.days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <span>الحصة مفعلة</span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة الحصة'}
          </button>
        </div>
      </form>

      <div className="bg-white border rounded-2xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold">قائمة الحصص</h2>
        </div>

        {loading ? (
          <div className="p-4">جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-gray-500">لا توجد حصص</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3">الاسم</th>
                  <th className="text-right p-3">النوع</th>
                  <th className="text-right p-3">الكابتن</th>
                  <th className="text-right p-3">الوقت</th>
                  <th className="text-right p-3">الأيام</th>
                  <th className="text-right p-3">المدة</th>
                  <th className="text-right p-3">السعة</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">إجمالي الحضور</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">{item.type}</td>
                    <td className="p-3">{item.captain_name}</td>
                    <td className="p-3">{item.schedule?.time || '—'}</td>
                    <td className="p-3">
                      {(item.schedule?.days || []).join(' - ')}
                    </td>
                    <td className="p-3">{item.duration_minutes} دقيقة</td>
                    <td className="p-3">{item.capacity}</td>
                    <td className="p-3">
                      {item.is_active ? (
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">
                          مفعلة
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-red-50 text-red-700">
                          متوقفة
                        </span>
                      )}
                    </td>
                    <td className="p-3">{item.total_attendances}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-white"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
