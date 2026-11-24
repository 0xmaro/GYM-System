<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'check_in_at'      => $this->check_in_at->toDateTimeString(),
            'type'             => $this->type,
            'class_type'       => $this->class_type,
            'sessions_before'  => $this->sessions_before,
            'sessions_after'   => $this->sessions_after,
            'registered_by'    => $this->registeredBy?->name,
            'client'           => $this->whenLoaded('client', fn() => [
                'id'   => $this->client->id,
                'name' => $this->client->name,
                'qr_id'=> $this->client->qr_id,
            ]),
        ];
    }
}
