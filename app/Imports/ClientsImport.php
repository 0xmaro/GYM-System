<?php

namespace App\Imports;

use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\QrCard;
use App\Models\SubscriptionType;
use App\Services\QrIdGenerator;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ClientsImport implements ToCollection, WithHeadingRow
{
    public $errors = [];
    public $importedCount = 0;
    public $skippedCount = 0;

    public function collection(Collection $rows)
    {
        $subscriptionTypes = SubscriptionType::all()->keyBy('name');

        foreach ($rows as $index => $row) {
            try {
                if (empty($row['name']) || empty($row['phone'])) {
                    $this->skippedCount++;
                    $this->addError($index + 2, $row, 'الاسم أو رقم الهاتف مفقود');
                    continue;
                }

                DB::transaction(function () use ($row, $subscriptionTypes) {
                    $qrId = QrIdGenerator::getAvailable();

                    $client = Client::create([
                        'qr_id' => $qrId,
                        'name' => $row['name'],
                        'phone' => $row['phone'],
                        'gender' => ($row['gender'] ?? '') === 'أنثى' ? 'female' : 'male',
                        'status' => 'active',
                    ]);

                    QrCard::create([
                        'qr_id' => $qrId,
                        'client_id' => $client->id,
                        'status' => 'distributed',
                        'issued_at' => now(),
                    ]);

                    if (!empty($row['subscription_type'])) {
                        $type = $subscriptionTypes->get($row['subscription_type']);
                        if ($type) {
                            $startDate = Carbon::parse($row['start_date'] ?? now());
                            $endDate = Carbon::parse($row['end_date'] ?? $startDate->copy()->addDays($type->duration_days));

                            ClientSubscription::create([
                                'client_id' => $client->id,
                                'subscription_type_id' => $type->id,
                                'start_date' => $startDate,
                                'end_date' => $endDate,
                                'original_end_date' => $endDate,
                                'sessions_remaining' => $type->sessions_count,
                                'amount_paid' => $type->price_monthly,
                                'status' => 'active',
                                'created_by' => 1,
                            ]);
                        }
                    }
                    $this->importedCount++;
                });

            } catch (\Exception $e) {
                $this->skippedCount++;
                $this->addError($index + 2, $row, $e->getMessage());
            }
        }
    }

    private function addError($rowNumber, $row, $reason)
    {
        $this->errors[] = [
            'Row' => $rowNumber,
            'Name' => $row['name'] ?? 'N/A',
            'Phone' => $row['phone'] ?? 'N/A',
            'Reason' => $reason
        ];
    }
}
