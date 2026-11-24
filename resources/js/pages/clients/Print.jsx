import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Printer, CheckSquare, Square, CreditCard } from 'lucide-react';

export default function PrintQR() {
    const [clients, setClients] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients', { params: { per_page: 100 } });
            setClients(res.data.data ?? []);
        } catch {
            toast.error('حدث خطأ أثناء جلب الأعضاء');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id, hasQr) => {
        if (!hasQr) {
            toast.error('هذا العضو لا يملك كود QR بعد');
            return;
        }

        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const printableClients = clients.filter(c => !!c.qr_id);

    const toggleSelectAll = () => {
        if (selectedIds.length === printableClients.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(printableClients.map(c => c.id));
        }
    };

    const handlePrint = async () => {
        if (selectedIds.length === 0) {
            toast.error('الرجاء تحديد عضو واحد على الأقل للطباعة');
            return;
        }

        const toastId = toast.loading('جاري تجهيز الكروت للطباعة...');

        try {
            const queryParams = selectedIds.map(id => `client_ids[]=${id}`).join('&');
            const response = await api.get(`/qr-cards/print-batch?${queryParams}`, { responseType: 'text' });

            const printWindow = window.open('', '_blank');
            printWindow.document.write(response.data);
            printWindow.document.close();

            toast.success('تم فتح نافذة الطباعة', { id: toastId });
        } catch {
            toast.error('حدث خطأ أثناء الاتصال بالخادم للطباعة', { id: toastId });
        }
    };

    if (loading) {
        return <div className="p-10 text-center font-bold text-primary">جاري تحميل البيانات...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-card p-6 rounded-2xl shadow-sm border border-border gap-4">
                <div className="flex items-start gap-3">
                    <div className="bg-primary-pale p-3 rounded-xl text-primary">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-ink">طباعة كروت العضوية</h1>
                        <p className="text-muted text-sm mt-1">
                            سيتم الطباعة على قالب الرجال أو النساء تلقائيًا حسب نوع العضو
                        </p>
                        <p className="text-xs text-muted mt-2">
                            المتاح للطباعة: <span className="font-black text-ink">{printableClients.length}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={handlePrint}
                    disabled={selectedIds.length === 0}
                    className="flex items-center justify-center bg-primary hover:bg-[#c04b24] text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                    <Printer size={20} className="ml-2" />
                    طباعة المحدد ({selectedIds.length})
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-mist text-muted text-sm border-b border-border">
                        <tr>
                            <th className="p-4 w-16 text-center cursor-pointer" onClick={toggleSelectAll}>
                                {selectedIds.length === printableClients.length && printableClients.length > 0
                                    ? <CheckSquare className="text-primary mx-auto" />
                                    : <Square className="mx-auto" />}
                            </th>
                            <th className="p-4 font-bold">اسم العضو</th>
                            <th className="p-4 font-bold">رقم الهاتف</th>
                            <th className="p-4 font-bold">النوع</th>
                            <th className="p-4 font-bold">كود الـ QR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {clients.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-muted">لا يوجد أعضاء</td>
                            </tr>
                        ) : (
                            clients.map(client => {
                                const selected = selectedIds.includes(client.id);
                                const hasQr = !!client.qr_id;

                                return (
                                    <tr
                                        key={client.id}
                                        className={`hover:bg-mist transition-colors cursor-pointer ${selected ? 'bg-primary-pale' : ''} ${!hasQr ? 'opacity-60' : ''}`}
                                        onClick={() => toggleSelect(client.id, hasQr)}
                                    >
                                        <td className="p-4 text-center">
                                            {selected
                                                ? <CheckSquare className="text-primary mx-auto" />
                                                : <Square className="text-muted mx-auto" />}
                                        </td>

                                        <td className="p-4 font-bold text-ink">{client.name}</td>

                                        <td className="p-4 text-muted" dir="ltr">{client.phone}</td>

                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                                client.gender === 'female'
                                                    ? 'bg-pink-100 text-pink-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {client.gender === 'female' ? 'سيدة' : 'رجل'}
                                            </span>
                                        </td>

                                        <td className="p-4 font-bold text-ink">
                                            {client.qr_id || (
                                                <span className="text-danger text-xs bg-danger-pale px-2 py-1 rounded">
                                                    غير معين
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
