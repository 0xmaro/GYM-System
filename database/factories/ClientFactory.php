<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'qr_id' => $this->faker->unique()->numerify('QR######'),
            'name' => $this->faker->name(),
            'phone' => $this->faker->unique()->numerify('01#########'),
            'age' => $this->faker->numberBetween(16, 60),
            'gender' => $this->faker->randomElement(['male', 'female']),
            'status' => 'active',
        ];
    }
}
