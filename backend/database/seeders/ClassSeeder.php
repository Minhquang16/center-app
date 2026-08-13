<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ClassSeeder extends Seeder
{
    public function run(): void
    {
        // Delete garbled ones
        DB::table('classes')->where('name', 'like', '%?%')->delete();
        DB::table('classes')->where('class_code', 'like', '%?%')->delete();

        $scheduleClasses = [
            '3NC', '5NC1', '4NC1', '6CC2', '8CLC', '9CB', 
            '3CC', '5NC2', '4NC2', '6CLC', '9NC', 'Khối 10', 
            '8CC', '7CLC', 'Khối 12', '7CC', '5NC3', '6CC1', 
            'Khối 11', 'Lớp KHTN', 'Khối 3', 'Khối 5', 'Khối 6', 'Khối 7'
        ];

        foreach ($scheduleClasses as $code) {
            $grade = 0;
            preg_match('/\d+/', $code, $matches);
            if (!empty($matches)) {
                $grade = intval($matches[0]);
            }

            // Adjust name if it's already starting with Khối or Lớp
            if (str_starts_with($code, 'Khối') || str_starts_with($code, 'Lớp')) {
                $name = $code;
            } else {
                $name = 'Lớp ' . $code;
            }

            DB::table('classes')->updateOrInsert(
                ['class_code' => $code],
                [
                    'name' => $name,
                    'grade' => $grade,
                    'subject' => 'Toán',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
