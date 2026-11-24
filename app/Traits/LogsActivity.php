<?php

namespace App\Traits;

use App\Models\AuditLog;

trait LogsActivity
{
    protected static function bootLogsActivity(): void
    {
        static::created(fn($model)  => static::writeLog('create', null, $model->getAttributes(), $model));
        static::updated(fn($model)  => static::writeLog('update', $model->getOriginal(), $model->getChanges(), $model));
        static::deleted(fn($model)  => static::writeLog('delete', $model->getAttributes(), null, $model));
    }

    protected static function writeLog(string $event, ?array $old, ?array $new, $model): void
    {
        $skip = ['password', 'remember_token', 'updated_at'];

        $oldClean = $old ? array_diff_key($old, array_flip($skip)) : null;
        $newClean = $new ? array_diff_key($new, array_flip($skip)) : null;

        AuditLog::create([
            'user_id'     => auth()->id(),
            'action'      => strtolower(class_basename($model)) . '.' . $event,
            'entity_type' => class_basename($model),
            'entity_id'   => $model->id,
            'old_values'  => $oldClean ? json_encode($oldClean, JSON_UNESCAPED_UNICODE) : null,
            'new_values'  => $newClean ? json_encode($newClean, JSON_UNESCAPED_UNICODE) : null,
            'ip_address'  => request()->ip(),
            'device_info' => request()->userAgent(),
        ]);
    }
}
