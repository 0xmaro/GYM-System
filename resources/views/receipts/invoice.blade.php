<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إيصال دفع - {{ $receipt_number }}</title>
    <style>
        body { font-family: 'Cairo', sans-serif; background: #fff; color: #151820; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #D85A30; padding-bottom: 15px; margin-bottom: 20px; }
        .gym-name { font-size: 24px; font-weight: 900; color: #D85A30; }
        .receipt-title { font-size: 18px; font-weight: bold; margin-top: 5px; color: #8a92a6; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .details-table th, .details-table td { padding: 10px; text-align: right; border-bottom: 1px solid #e2e6f0; }
        .details-table th { width: 30%; color: #8a92a6; font-size: 14px; }
        .details-table td { font-weight: bold; font-size: 15px; }
        .amount-row td { font-size: 18px; color: #1D9E75; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #8a92a6; border-top: 1px dashed #e2e6f0; padding-top: 15px; }
        .hash { font-size: 10px; word-break: break-all; color: #ccc; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="gym-name">{{ $gym_name }}</div>
        <div class="receipt-title">إيصال دفع إلكتروني ({{ $receipt_number }})</div>
    </div>

    <table class="details-table">
        <tr><th>اسم المشترك:</th><td>{{ $client_name }} (ID: {{ $qr_id }})</td></tr>
        <tr><th>نوع الاشتراك:</th><td>{{ $subscription_type }}</td></tr>
        <tr><th>طريقة الدفع:</th><td>{{ $payment_method }}</td></tr>
        <tr><th>تاريخ العملية:</th><td dir="ltr" style="text-align: right;">{{ $date }}</td></tr>
        <tr><th>بواسطة الموظف:</th><td>{{ $cashier_name }}</td></tr>
        @if($discount > 0)
        <tr><th>الخصم:</th><td style="color: #E24B4A;">{{ $discount }} ج.م</td></tr>
        @endif
        <tr class="amount-row"><th>المبلغ المدفوع:</th><td>{{ $amount }} ج.م</td></tr>
    </table>

    <div class="footer">
        <p>شكراً لثقتكم في {{ $gym_name }}! نتمنى لكم تمريناً ممتعاً 💪</p>
        <div class="hash">Digital Signature: {{ $hash }}</div>
    </div>
</body>
</html>
