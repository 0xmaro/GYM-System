<?php

namespace App\Observers;

use App\Models\Client;
use App\Services\AuditLogService;

class ClientObserver
{
    public function created(Client $client): void
    {
        AuditLogService::log('client.created', 'Client', $client->id, [], $client->toArray());
    }

    public function updated(Client $client): void
    {
        AuditLogService::log('client.updated', 'Client', $client->id, $client->getOriginal(), $client->getChanges());
    }

    public function deleted(Client $client): void
    {
        AuditLogService::log('client.deleted', 'Client', $client->id, $client->toArray(), []);
    }
}
