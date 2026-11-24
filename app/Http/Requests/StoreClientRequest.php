<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'                  => 'required|string|max:100',
            'phone'                 => 'required|string|max:20|unique:clients,phone',
            'gender'                => 'required|in:male,female',
            'age'                   => 'nullable|integer|min:5|max:100',
            'address'               => 'nullable|string|max:255',
            'photo_url'             => 'nullable|url',
            'notes'                 => 'nullable|string|max:500',
            'subscription_type_id'  => 'nullable|exists:subscription_types,id',
            'start_date'            => 'nullable|date',
            'amount_paid'           => 'nullable|integer|min:0',
            'discount_amount'       => 'nullable|integer|min:0',
            'discount_reason'       => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'   => 'الاسم مطلوب.',
            'phone.required'  => 'رقم الهاتف مطلوب.',
            'phone.unique'    => 'رقم الهاتف مسجل مسبقاً.',
            'gender.required' => 'الجنس مطلوب.',
            'gender.in'       => 'الجنس يجب أن يكون male أو female.',
        ];
    }
}
