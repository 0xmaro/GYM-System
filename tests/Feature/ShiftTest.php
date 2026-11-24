<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\StaffShift;
use App\Models\User;

class ShiftTest extends TestCase
{
    public function test_cannot_open_two_shifts_simultaneously()
    {
        $user = $this->actAsReception();

        $this->postJson('/api/v1/shifts/open', ['opening_cash' => 1000])->assertStatus(200);

        $response = $this->postJson('/api/v1/shifts/open', ['opening_cash' => 2000]);
        $response->assertStatus(422);
    }

public function test_can_close_shift_with_mismatch_without_note()
    {
        $user = $this->actAsReception();

        // 1. نفتح الشيفت
        $this->postJson('/api/v1/shifts/open', ['opening_cash' => 50000]);

        // 2. نجيب الـ ID
        $shift = StaffShift::where('staff_id', $user->id)->where('status', 'open')->first();

        // 3. محاولة القفل بـ 600 جنيه (في زيادة 100 جنيه) بدون ملاحظة
        $response = $this->postJson("/api/v1/shifts/{$shift->id}/close", [
            'actual_cash' => 60000
        ]);

        // الكنترولر بيسمح بالقفل عادي (200 OK) ويسجل الزيادة في الداتا بيز
        $response->assertStatus(200);
    }

    public function test_shift_closes_successfully_with_note_on_mismatch()
    {
        $user = $this->actAsReception();

        $this->postJson('/api/v1/shifts/open', ['opening_cash' => 50000]);

        $shift = StaffShift::where('staff_id', $user->id)->where('status', 'open')->first();

        $response = $this->postJson("/api/v1/shifts/{$shift->id}/close", [
            'actual_cash' => 60000,
            'difference_note' => 'فلوس فكة زيادة من العميل'
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('staff_shifts', [
            'id' => $shift->id,
            'status' => 'closed',
            'cash_difference' => 10000 // بالقروش
        ]);
    }

    public function test_handover_creates_new_shift()
    {
        $userA = $this->actAsReception();

        $this->postJson('/api/v1/shifts/open', ['opening_cash' => 50000]);

        $shift = StaffShift::where('staff_id', $userA->id)->where('status', 'open')->first();

        $userB = clone $this->actAsReception(); // موظف جديد

        // نرجع نسجل دخول بالموظف الأول عشان هو اللي بيسلم
        $this->actingAs($userA, 'sanctum');

        $response = $this->postJson("/api/v1/shifts/{$shift->id}/handover", [
            'handover_to' => $userB->id,
            'actual_cash' => 50000,
            'difference_note' => null
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('staff_shifts', [
            'id' => $shift->id,
            'status' => 'closed'
        ]);

        $this->assertDatabaseHas('staff_shifts', [
            'staff_id' => $userB->id,
            'status' => 'open'
        ]);
    }
}
