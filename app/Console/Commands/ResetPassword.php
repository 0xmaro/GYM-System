<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResetPassword extends Command
{
    protected $signature = 'gymos:reset-password {email}';
    protected $description = 'إعادة تعيين كلمة المرور لموظف وتوليد كلمة مرور قوية عشوائية';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("المستخدم صاحب الإيميل {$email} غير موجود.");
            return;
        }

        // توليد كلمة مرور تحقق شروط الأمان (8 أحرف، فيها رقم وحرف)
        $newPassword = Str::random(6) . 'A1@';
        $user->update(['password' => Hash::make($newPassword)]);

        $this->info("✅ تم إعادة تعيين كلمة المرور للموظف: {$user->name}");
        $this->warn("كلمة المرور المؤقتة هي: {$newPassword}");
        $this->line("يرجى إبلاغه بتغييرها فور تسجيل الدخول.");
    }
}
