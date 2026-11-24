<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $client = $this->route('client');

        return [
            'name'      => ['sometimes', 'string', 'max:100'],
            'phone'     => [
                'sometimes',
                'string',
                'max:20',
                Rule::unique('clients', 'phone')->ignore($client?->id),
            ],
            'qr_id'     => ['sometimes', 'string', 'max:50'],
            'gender'    => ['sometimes', 'in:male,female'],
            'age'       => ['nullable', 'integer', 'min:5', 'max:100'],
            'address'   => ['nullable', 'string', 'max:255'],
            'photo_url' => ['nullable', 'url'],
            'notes'     => ['nullable', 'string', 'max:500'],
            'status'    => ['sometimes', 'in:active,frozen,expired'],
        ];
    }
}
