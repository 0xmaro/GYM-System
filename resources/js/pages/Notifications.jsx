import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { formatMoney } from '../lib/api';
import {
  Bell, AlertTriangle, Clock, DollarSign, RefreshCw, Eye,
  Search, Loader2, MessageSquare, CheckCircle2, Zap, X,
  Wifi, WifiOff, ExternalLink, Bot
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AUTO_DELAY_MS = 2500;

function isNotifiedToday(item, type) {
  const dateField = type === 'debt' ? item.notified_at : item.last_notified_at;
  if (!dateField) return false;
  return new Date(dateField).toDateString() === new Date().toDateString();
}

// ─── بناء رسالة واتساب ويب ────────────────────────────────────
function buildWaMessage(item, type) {
  const name = item.client_name ?? item.client?.name ?? '';
  let msg = `أهلاً يا ${name}، تذكير من الجيم:\n`;
  if (type === 'expired')  msg += `اشتراكك انتهى يوم ${item.end_date}، ننتظرك للتجديد! 🏋️`;
  if (type === 'expiring') msg += `اشتراكك ينتهي يوم ${item.end_date}، يرجى التجديد. 💪`;
  if (type === 'debt')     msg += `يوجد مبلغ متأخر ${formatMoney(item.amount)}، يرجى السداد. 🙏`;
  return msg;
}

function buildWaUrl(item, type) {
  const phone = (item.client_phone ?? item.client?.phone ?? '').replace(/\D/g, '');
  if (!phone) return null;
  // تأكد من كود مصر
  let p = phone;
  if (p.startsWith('0')) p = '2' + p;
  if (!p.startsWith('20')) p = '20' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(buildWaMessage(item, type))}`;
}

export default function Notifications() {
  const [data, setData]           = useState({ expired: [], expiring: [], debts: [] });
  const [stats, setStats]         = useState({ bot_status: null });
  const [loading, setLoading]     = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [autoMode, setAutoMode]   = useState(false);
  const [autoProgress, setAutoProgress] = useState({ current: 0, total: 0, done: false });
  const autoRef                   = useRef(false);
  const [sentIds, setSentIds]     = useState([]);
  const [searchTerms, setSearchTerms] = useState({ expired: '', expiring: '', debts: '' });

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/notifications/pending');
      setData({
        expired:  res.data.expired  ?? [],
        expiring: res.data.expiring ?? [],
        debts:    res.data.debts    ?? [],
      });
      setStats({ bot_status: res.data.bot_status ?? null });
    } catch {
      toast.error('فشل تحميل التنبيهات من السيرفر');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── إرسال عبر البوت ──────────────────────────────────────────
  const sendViaBot = useCallback(async (item, type) => {
    if (type === 'debt') {
      await api.post(`/debts/${item.id}/notify`);
    } else {
      await api.post(`/notifications/send-reminder/${item.id}`);
    }
    setSentIds(prev => [...prev, item.id]);
  }, []);

  // ─── فتح واتساب ويب ───────────────────────────────────────────
  const openWhatsAppWeb = useCallback((item, type) => {
    const url = buildWaUrl(item, type);
    if (!url) { toast.error('لا يوجد رقم هاتف لهذا العميل'); return; }
    window.open(url, '_blank');
  }, []);

  // ─── زر البوت (يدوي) ──────────────────────────────────────────
  const handleBotSend = async (item, type) => {
    setProcessingId(item.id);
    const tid = toast.loading('جاري الإرسال عبر البوت...');
    try {
      await sendViaBot(item, type);
      toast.success('تم إرسال التنبيه عبر البوت ✅', { id: tid });
    } catch {
      toast.error('فشل الإرسال عبر البوت', { id: tid });
    }
    setProcessingId(null);
  };

  // ─── الوضع التلقائي (بالبوت فقط) ─────────────────────────────
  const startAutoMode = async () => {
    const queue = [
      ...data.expired .filter(i => !isNotifiedToday(i, 'expired')  && !sentIds.includes(i.id)).map(i => ({ item: i, type: 'expired'  })),
      ...data.expiring.filter(i => !isNotifiedToday(i, 'expiring') && !sentIds.includes(i.id)).map(i => ({ item: i, type: 'expiring' })),
      ...data.debts   .filter(i => !isNotifiedToday(i, 'debt')     && !sentIds.includes(i.id)).map(i => ({ item: i, type: 'debt'     })),
    ];
    if (queue.length === 0) { toast.success('كل التنبيهات تم إرسالها مسبقاً اليوم ✅'); return; }

    setAutoMode(true);
    autoRef.current = true;
    setAutoProgress({ current: 0, total: queue.length, done: false });
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (!autoRef.current) break;
      const { item, type } = queue[i];
      setAutoProgress({ current: i + 1, total: queue.length, done: false });
      try { await sendViaBot(item, type); successCount++; } catch {}
      if (i < queue.length - 1 && autoRef.current) {
        await new Promise(r => setTimeout(r, AUTO_DELAY_MS));
      }
    }

    setAutoMode(false);
    autoRef.current = false;
    setAutoProgress(prev => ({ ...prev, done: true }));
    toast.success(`تم إرسال ${successCount} تنبيه عبر البوت ✅`);
    fetchData(true);
  };

  const stopAutoMode = () => {
    autoRef.current = false;
    setAutoMode(false);
    toast('تم إيقاف الإرسال التلقائي', { icon: '⚠️' });
  };

  const filteredItems = (items, term) =>
    items.filter(i => (i.client_name ?? i.client?.name ?? '').toLowerCase().includes(term.toLowerCase()));

  const pendingCount =
    data.expired .filter(i => !isNotifiedToday(i, 'expired')  && !sentIds.includes(i.id)).length +
    data.expiring.filter(i => !isNotifiedToday(i, 'expiring') && !sentIds.includes(i.id)).length +
    data.debts   .filter(i => !isNotifiedToday(i, 'debt')     && !sentIds.includes(i.id)).length;

  const botConnected = stats.bot_status?.connected === true;

  // ─── زراير الأكشن لكل سطر ──────────────────────────────────────
  const ActionBtns = ({ item, type }) => {
    const notified    = isNotifiedToday(item, type) || sentIds.includes(item.id);
    const isProc      = processingId === item.id;

    if (notified) {
      return (
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success-pale text-success text-xs font-medium">
            <CheckCircle2 size={12} /> أُرسل اليوم
          </span>
          {/* لا يزال بإمكانه الفتح في واتساب ويب */}
          <button
            onClick={() => openWhatsAppWeb(item, type)}
            className="p-1.5 rounded text-muted hover:text-success hover:bg-success-pale transition-colors"
            title="فتح في واتساب ويب"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        {/* زر البوت */}
        <button
          onClick={() => handleBotSend(item, type)}
          disabled={isProc || !botConnected}
          title={botConnected ? 'إرسال عبر البوت' : 'البوت غير متصل'}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
            ${botConnected
              ? 'bg-primary text-white hover:bg-primary-hover active:scale-95'
              : 'bg-surface-offset text-muted cursor-not-allowed opacity-60'
            }`}
        >
          {isProc
            ? <Loader2 size={12} className="animate-spin" />
            : <Bot size={12} />
          }
          {isProc ? 'جاري...' : 'بوت'}
        </button>

        {/* زر واتساب ويب */}
        <button
          onClick={() => openWhatsAppWeb(item, type)}
          title="فتح في واتساب ويب"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-success-pale text-success hover:bg-success hover:text-white transition-all active:scale-95"
        >
          <ExternalLink size={12} />
          ويب
        </button>
      </div>
    );
  };

  // ─── شريط حالة البوت ──────────────────────────────────────────
  const BotStatusBar = () => {
    const bs = stats.bot_status;
    if (!bs) return null;
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mb-4
        ${bs.connected ? 'bg-success-pale text-success' : 'bg-danger-pale text-danger'}`}>
        {bs.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
        {bs.connected
          ? `✅ البوت متصل${bs.number ? ` — ${bs.number}` : ''}`
          : '⚠️ البوت غير متصل — زر "بوت" معطّل، استخدم "ويب"'
        }
        <Link to="/whatsapp" className="mr-auto text-xs underline opacity-70 hover:opacity-100">
          إدارة البوت ←
        </Link>
      </div>
    );
  };

  // ─── جدول قسم ─────────────────────────────────────────────────
  const SectionTable = ({ title, icon: Icon, color, items, type, searchKey, emptyMsg, columns }) => {
    const term     = searchTerms[searchKey];
    const filtered = filteredItems(items, term);
    const pendingN = filtered.filter(i => !isNotifiedToday(i, type) && !sentIds.includes(i.id)).length;

    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-divider">
          <div className="flex items-center gap-2">
            <span className={`p-2 rounded-lg ${color}`}><Icon size={16} /></span>
            <h2 className="font-semibold text-base">{title}</h2>
            {pendingN > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning-pale text-warning text-xs font-bold">
                {pendingN} ينتظر
              </span>
            )}
          </div>
          <div className="relative w-48">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={term}
              onChange={e => setSearchTerms(p => ({ ...p, [searchKey]: e.target.value }))}
              placeholder="بحث بالاسم..."
              className="w-full pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted py-10 text-sm">{emptyMsg}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-offset text-muted text-xs">
                  {columns.map(c => <th key={c} className="px-4 py-2.5 text-right font-medium">{c}</th>)}
                  <th className="px-4 py-2.5 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-surface-offset/40 transition-colors">
                    {type !== 'debt' && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.client_name}</td>
                        <td className="px-4 py-3 text-muted" dir="ltr">{item.client_phone}</td>
                        <td className="px-4 py-3">{item.end_date}</td>
                        {type === 'expiring' && (
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${item.days_remaining <= 3 ? 'bg-danger-pale text-danger' : 'bg-warning-pale text-warning'}`}>
                              {item.days_remaining} يوم
                            </span>
                          </td>
                        )}
                        {type === 'expired' && (
                          <td className="px-4 py-3 text-danger text-xs">{item.expired_days} يوم مضى</td>
                        )}
                      </>
                    )}
                    {type === 'debt' && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.client_name}</td>
                        <td className="px-4 py-3 text-muted" dir="ltr">{item.client_phone}</td>
                        <td className="px-4 py-3 font-bold text-danger">{formatMoney(item.amount)}</td>
                        <td className="px-4 py-3">{item.due_date}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <ActionBtns item={item} type={type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-muted">
      <Loader2 size={24} className="animate-spin" />
      <span>جاري فحص حالة المشتركين والديون...</span>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell size={22} className="text-primary" /> التنبيهات والإشعارات
          </h1>
          <p className="text-muted text-sm mt-0.5">إرسال تذكيرات الاشتراكات والديون عبر البوت أو واتساب ويب</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData()} className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-2">
            <RefreshCw size={15} /> تحديث
          </button>
          {!autoMode ? (
            <button
              onClick={startAutoMode}
              disabled={pendingCount === 0 || !botConnected}
              title={!botConnected ? 'البوت غير متصل' : ''}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={15} /> إرسال تلقائي ({pendingCount})
            </button>
          ) : (
            <button onClick={stopAutoMode} className="btn-danger flex items-center gap-1.5 text-sm px-4 py-2">
              <X size={15} />
              إيقاف ({autoProgress.current}/{autoProgress.total})
            </button>
          )}
        </div>
      </div>

      {/* شريط حالة البوت */}
      <BotStatusBar />

      {/* شريط التقدم */}
      {autoMode && (
        <div className="card px-5 py-3 mb-4 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-primary" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>إرسال تلقائي عبر البوت...</span>
              <span>{autoProgress.current} / {autoProgress.total}</span>
            </div>
            <div className="h-1.5 bg-surface-offset rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${autoProgress.total > 0 ? (autoProgress.current / autoProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* الاشتراكات المنتهية */}
      <SectionTable
        title="اشتراكات منتهية"
        icon={AlertTriangle}
        color="bg-danger-pale text-danger"
        items={data.expired}
        type="expired"
        searchKey="expired"
        emptyMsg="لا توجد اشتراكات منتهية ✅"
        columns={['العضو', 'الهاتف', 'تاريخ الانتهاء', 'منذ']}
      />

      {/* الاشتراكات قرب الانتهاء */}
      <SectionTable
        title="اشتراكات قرب الانتهاء"
        icon={Clock}
        color="bg-warning-pale text-warning"
        items={data.expiring}
        type="expiring"
        searchKey="expiring"
        emptyMsg="لا توجد اشتراكات قرب الانتهاء ✅"
        columns={['العضو', 'الهاتف', 'تاريخ الانتهاء', 'المتبقي']}
      />

      {/* الديون */}
      <SectionTable
        title="تذكيرات الديون"
        icon={DollarSign}
        color="bg-primary-highlight text-primary"
        items={data.debts}
        type="debt"
        searchKey="debts"
        emptyMsg="لا توجد ديون معلقة ✅"
        columns={['العضو', 'الهاتف', 'المبلغ', 'تاريخ الاستحقاق']}
      />
    </div>
  );
}
