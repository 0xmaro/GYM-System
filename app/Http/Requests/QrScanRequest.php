<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class QrScanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'qr_id'      => 'required|string|max:20',
            'class_type' => 'nullable|string|max:100',
        ];
    }
}
