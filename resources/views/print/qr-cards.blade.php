<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>طباعة كروت العضوية</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap" rel="stylesheet">

    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            background: #000;
            font-family: "Cairo", sans-serif;
        }

        .print-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            background: #000;
        }

        .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }

        .card-print {
            position: relative;
            width: 170mm;
            height: calc(170mm * 1360 / 784);
            max-height: 285mm;
            aspect-ratio: 784 / 1360;
            overflow: hidden;
            border-radius: 14px;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #111;
        }

        .card-bg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
                to top,
                rgba(0,0,0,0.72) 0%,
                rgba(0,0,0,0.42) 16%,
                rgba(0,0,0,0.14) 30%,
                rgba(0,0,0,0.00) 48%
            );
            pointer-events: none;
        }

        .card-info {
            position: absolute;
            left: 50%;
            bottom: 4.2%;
            transform: translateX(-50%);
            width: 36%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 10px 10px 8px;
            border-radius: 18px;
            background: rgba(0,0,0,0.74);
            box-shadow: 0 0 14px rgba(0,0,0,.55);
            backdrop-filter: blur(4px);
            z-index: 3;
        }

        .qr-box {
            width: 112px;
            height: 112px;
            background: #fff;
            border-radius: 10px;
            padding: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,.28);
            margin-bottom: 8px;
            flex-shrink: 0;
        }

        .qr-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }

        .empty-qr {
            font-size: 10px;
            color: #666;
            text-align: center;
            line-height: 1.2;
        }

        .member-name {
            margin: 0;
            font-size: 13px;
            line-height: 1.25;
            font-weight: 800;
            color: #fff;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .member-phone {
            margin: 3px 0 0;
            font-size: 11px;
            line-height: 1.2;
            font-weight: 700;
            color: rgba(255,255,255,0.95);
            direction: ltr;
        }

        .member-id {
            margin: 3px 0 0;
            font-size: 9px;
            line-height: 1.2;
            font-weight: 600;
            color: rgba(255,255,255,0.78);
            direction: ltr;
            letter-spacing: .4px;
        }

        @media print {
            html, body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .print-page {
                margin: 0;
            }
        }
    </style>
</head>
<body>
    @foreach ($clients as $client)
        @php
            $bg = $client->gender === 'female'
                ? asset('cards/mywomen.png')
                : asset('cards/mymen.png');

            $qrText = $client->qr_id ?: ($client->id ?? '');
            $qrUrl = $qrText
                ? 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' . urlencode($qrText)
                : null;
        @endphp

        <div class="print-page">
            <div class="card-print">
                <img class="card-bg" src="{{ $bg }}" alt="Card background for {{ $client->name }}">

                <div class="card-overlay"></div>

                <div class="card-info">
                    <div class="qr-box">
                        @if ($qrUrl)
                            <img src="{{ $qrUrl }}" alt="QR {{ $qrText }}">
                        @else
                            <div class="empty-qr">NO<br>QR</div>
                        @endif
                    </div>

                    <p class="member-name">{{ $client->name }}</p>

                    @if($client->phone)
                        <p class="member-phone">{{ $client->phone }}</p>
                    @endif

                    <p class="member-id">{{ $qrText }}</p>
                </div>
            </div>
        </div>
    @endforeach

    <script>
        window.onload = () => {
            setTimeout(() => window.print(), 700);
        };
    </script>
</body>
</html>
