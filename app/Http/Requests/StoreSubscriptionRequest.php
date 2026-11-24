<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'subscription_type_id' => 'required|exists:subscription_types,id',
            'start_date'           => 'required|date',
            'amount_paid'          => 'required|integer|min:0',
            'discount_amount'      => 'nullable|integer|min:0',
            'discount_reason'      => 'nullable|string|max:255',
        ];
    }
}
