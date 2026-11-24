<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ClientsImport;

class ImportClientsFromExcel extends Command
{
    protected $signature = 'gymos:import-clients {--file= : مسار ملف الإكسيل}';
    protected $description = 'استيراد الأعضاء من ملف Excel إلى النظام وتوليد QR تلقائي';

    public function handle()
    {
        $file = $this->option('file');

        if (!$file || !file_exists($file)) {
            $this->error('الملف غير موجود! يرجى تحديد المسار الصحيح: --file=clients.xlsx');
            return;
        }

        $this->info('جاري الاستيراد...');

        $import = new ClientsImport();
        Excel::import($import, $file);

        $this->info("✅ تم استيراد: {$import->importedCount} عضو.");
        $this->warn("⚠️ تم تخطي: {$import->skippedCount} صف.");

        if (count($import->errors) > 0) {
            $errorFile = storage_path('app/private/import_errors_' . time() . '.json');
            file_put_contents($errorFile, json_encode($import->errors, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            $this->error("تم حفظ تفاصيل الأخطاء في: {$errorFile}");
        }
    }
}
