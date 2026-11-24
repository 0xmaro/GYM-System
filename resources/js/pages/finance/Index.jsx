import React, { useState, useEffect } from 'react';
import api, { formatMoney } from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowUpCircle, ArrowDownCircle, PlayCircle, StopCircle, Receipt, AlertCircle } from 'lucide-react';

export default function FinanceIndex() {
    const [shift, setShift] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startCash, setStartCash] = useState('');
    const [txType, setTxType] = useState(null);
    const [txForm, setTxForm] = useState({ amount: '', description: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            try {
                const shiftRes = await api.get('/shifts/current');
                setShift(shiftRes.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setShift(null);
                } else {
                    throw err;
                }
            }

            const txRes = await api.get('/transactions');
            setTransactions(txRes.data?.data || txRes.data || []);
        } catch (error) {
            console.error('Error fetching finance data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async (e) => {
        e.preventDefault();
        try {
            await api.post('/shifts/open', { opening_cash: startCash });
            toast.success('تم فتح الشيفت بنجاح، بالتوفيق!');
            setStartCash('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'تعذر فتح الشيفت');
        }
    };

    const handleCloseShift = async () => {
        const actualCashStr = window.prompt("برجاء جرد الدرج وإدخال النقدية الفعلية الموجودة الآن (بالجنيه):");
        if (actualCashStr === null || actualCashStr.trim() === '') return;

        const actualCash = Number(actualCashStr);
        let differenceNote = 'تم التقفيل بدون فرق'; // قيمة افتراضية عشان لارافل ميضربش 422

        if (actualCash !== shift.expected_cash) {
            differenceNote = window.prompt(`انتبه! المتوقع ${shift.expected_cash} والفعلي ${actualCash}. برجاء كتابة سبب العجز/الزيادة:`);
            if (!differenceNote) {
                toast.error('يجب كتابة سبب الفرق لتقفيل الشيفت');
                return;
            }
        }

        try {
            await api.post(`/shifts/${shift.id}/close`, {
                actual_cash: actualCash,
                difference_note: differenceNote // بعتنا الملاحظة دايماً
            });

            toast.success('تم تقفيل الشيفت بنجاح!');
            setShift(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تقفيل الشيفت');
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/transactions/${txType}`, {
                amount: Math.round(Number(txForm.amount)), // تحويل لرقم صحيح
                category: txForm.description, // تم تغيير الاسم لـ category ليتوافق مع لارافل
                notes: txForm.description,
                payment_method: 'cash'
            });
            toast.success('تم تسجيل المعاملة بنجاح');
            setTxType(null);
            setTxForm({ amount: '', description: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'خطأ في تسجيل المعاملة');
        }
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    if (loading) return <div className="p-10 text-center font-bold text-primary">جاري تحميل البيانات المالية...</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div>
                    <h1 className="text-2xl font-black text-ink">المالية والشيفتات</h1>
                    <p className="text-muted text-sm mt-1">إدارة نقدية الدرج والمصروفات اليومية</p>
                </div>
            </div>

            {!shift ? (
                <div className="bg-warning-pale border-2 border-warning/30 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                    <AlertCircle size={64} className="mx-auto text-warning mb-4" />
                    <h2 className="text-2xl font-black text-warning mb-2">لا يوجد شيفت مفتوح حالياً</h2>
                    <p className="text-ink mb-6">يجب فتح شيفت عمل جديد لتتمكن من تسجيل أي اشتراكات أو مصروفات.</p>

                    <form onSubmit={handleOpenShift} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <input
                            type="number"
                            min="0"
                            required
                            placeholder="عهدة الدرج الحالية (بالجنيه)"
                            value={startCash}
                            onChange={(e) => setStartCash(e.target.value)}
                            className="px-4 py-3 bg-card border border-warning/50 rounded-xl focus:border-warning outline-none w-full sm:w-64"
                        />
                        <button type="submit" className="flex items-center bg-warning hover:bg-[#a06210] text-white px-6 py-3 rounded-xl font-bold w-full sm:w-auto transition-all">
                            <PlayCircle className="ml-2" size={20} />
                            بداية الشيفت
                        </button>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
                        <div className="bg-ink p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold mb-1">الشيفت الحالي: مفتوح</h2>
                                <p className="text-gray-400 text-sm">بدأ في: {new Date(shift.start_time).toLocaleTimeString('ar-EG')}</p>
                            </div>
                            <button onClick={handleCloseShift} className="flex items-center bg-danger hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all">
                                <StopCircle className="ml-2" size={20} />
                                تقفيل الشيفت
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse border-b border-border">
                            <div className="p-6 text-center">
                                <p className="text-muted text-sm mb-2">النقدية المتوقعة بالدرج</p>
                                <p className="text-3xl font-black text-ink">{formatMoney(shift.expected_cash)}</p>
                            </div>
                            <div className="p-6 text-center">
                                <p className="text-muted text-sm mb-2 text-success flex items-center justify-center"><ArrowUpCircle size={16} className="ml-1" /> إجمالي الإيرادات</p>
                                <p className="text-2xl font-bold text-success">{formatMoney(totalIncome)}</p>
                            </div>
                            <div className="p-6 text-center">
                                <p className="text-muted text-sm mb-2 text-danger flex items-center justify-center"><ArrowDownCircle size={16} className="ml-1" /> إجمالي المصروفات</p>
                                <p className="text-2xl font-bold text-danger">{formatMoney(totalExpense)}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-mist flex gap-4">
                            <button onClick={() => setTxType('income')} className="flex-1 flex items-center justify-center bg-success-pale text-success border border-success hover:bg-success hover:text-white px-4 py-3 rounded-xl font-bold transition-all">
                                <ArrowUpCircle className="ml-2" size={20} /> إضافة إيراد خارجي
                            </button>
                            <button onClick={() => setTxType('expense')} className="flex-1 flex items-center justify-center bg-danger-pale text-danger border border-danger hover:bg-danger hover:text-white px-4 py-3 rounded-xl font-bold transition-all">
                                <ArrowDownCircle className="ml-2" size={20} /> سحب مصروف
                            </button>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl border border-border flex flex-col h-[400px]">
                        <div className="p-4 border-b border-border bg-gray-50 flex items-center">
                            <Receipt size={20} className="ml-2 text-muted" />
                            <h3 className="font-bold text-ink">سجل حركات اليوم</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {transactions.length === 0 ? (
                                <p className="text-center text-muted mt-10">لا يوجد حركات مسجلة اليوم.</p>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-mist rounded-lg transition-all border border-transparent hover:border-border">
                                        <div className="flex items-center">
                                            {tx.type === 'income' ?
                                                <div className="bg-success-pale p-2 rounded-lg text-success ml-3"><ArrowUpCircle size={20} /></div> :
                                                <div className="bg-danger-pale p-2 rounded-lg text-danger ml-3"><ArrowDownCircle size={20} /></div>
                                            }
                                            <div>
                                                <p className="font-bold text-ink text-sm">{tx.category || tx.notes}</p>
                                                <p className="text-xs text-muted">{new Date(tx.created_at).toLocaleTimeString('ar-EG')}</p>
                                            </div>
                                        </div>
                                        <div className={`font-black ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                            {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {txType && (
                <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in zoom-in-95 duration-200">
                        <h3 className={`text-xl font-black mb-6 flex items-center ${txType === 'income' ? 'text-success' : 'text-danger'}`}>
                            {txType === 'income' ? <><ArrowUpCircle className="ml-2" /> تسجيل إيراد</> : <><ArrowDownCircle className="ml-2" /> تسجيل مصروف</>}
                        </h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">المبلغ (بالجنيه)</label>
                                <input
                                    type="number"
                                    min="1" required
                                    value={txForm.amount}
                                    onChange={e => setTxForm({...txForm, amount: e.target.value})}
                                    className="w-full px-4 py-3 bg-mist border border-border rounded-xl focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">البيان (السبب)</label>
                                <input
                                    type="text" required
                                    placeholder={txType === 'income' ? "مثال: بيع زجاجة مياه" : "مثال: فاتورة كهرباء، صيانة..."}
                                    value={txForm.description}
                                    onChange={e => setTxForm({...txForm, description: e.target.value})}
                                    className="w-full px-4 py-3 bg-mist border border-border rounded-xl focus:border-primary outline-none"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setTxType(null)} className="flex-1 bg-mist hover:bg-gray-200 text-ink px-4 py-3 rounded-xl font-bold transition-all">إلغاء</button>
                                <button type="submit" className={`flex-1 text-white px-4 py-3 rounded-xl font-bold transition-all ${txType === 'income' ? 'bg-success hover:bg-[#15805e]' : 'bg-danger hover:bg-[#c94342]'}`}>حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
