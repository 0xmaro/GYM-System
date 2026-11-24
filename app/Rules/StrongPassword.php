<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (strlen($value) < 8) {
            $fail('كلمة المرور يجب أن لا تقل عن 8 أحرف.');
        }

        if (!preg_match('/[0-9]/', $value)) {
            $fail('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.');
        }

        if (!preg_match('/[a-zA-Z]/', $value)) {
            $fail('كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.');
        }
    }
}
