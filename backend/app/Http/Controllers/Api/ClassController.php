<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClassController extends Controller
{
    public function index()
    {
        $classes = \App\Models\ClassModel::where('status', 'active')->select('id', 'name', 'class_code', 'grade', 'schedules')->get();
        
        return response()->json($classes);
    }

    public function withStudents()
    {
        $classes = \App\Models\ClassModel::where('status', 'active')->orderBy('grade')->get(['id', 'name', 'class_code', 'grade', 'schedules']);
        
        // Chỉ cần lấy id, grade, class_type để tính sĩ số, KHÔNG cần query count hay toàn bộ thông tin
        $students = \App\Models\Student::where('status', '!=', 'dropped')->get(['id', 'grade', 'class_type']);

        $classes->map(function($class) use ($students) {
            $count = 0;
            foreach($students as $s) {
                $matchGrade = true;
                if ($class->grade) {
                    $matchGrade = ($s->grade == $class->grade);
                }
                
                $matchType = false;
                if ($s->class_type) {
                    $matchType = ($class->class_code === $s->class_type) || ($class->class_code === $s->grade . '-' . $s->class_type);
                } else {
                    $matchType = ($class->class_code == $s->grade);
                }

                if ($matchGrade && $matchType) {
                    $count++;
                }
            }
            
            $class->student_count = $count;
            return $class;
        });
        
        return response()->json($classes);
    }

    public function getStudentsByClass($id)
    {
        $class = \App\Models\ClassModel::findOrFail($id);
        
        // Chỉ đếm số buổi học cho danh sách học sinh (để hiển thị chi tiết lớp)
        $students = \App\Models\Student::where('status', '!=', 'dropped')
            ->withCount(['attendances as attended_this_month' => function ($query) {
                $query->whereMonth('checked_at', now()->month)
                      ->whereYear('checked_at', now()->year);
            }])
            ->get(['id', 'full_name', 'student_code', 'grade', 'class_type', 'parent_name', 'parent_phone']);

        $classStudents = $students->filter(function($s) use ($class) {
            $matchGrade = true;
            if ($class->grade) {
                $matchGrade = ($s->grade == $class->grade);
            }
            
            $matchType = false;
            if ($s->class_type) {
                $matchType = ($class->class_code === $s->class_type) || ($class->class_code === $s->grade . '-' . $s->class_type);
            } else {
                $matchType = ($class->class_code == $s->grade);
            }

            return $matchGrade && $matchType;
        })->values();

        return response()->json($classStudents, 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function store(Request $request)
    {
        $branchId = auth()->user()->branch_id;
        $data = $request->validate([
            'name' => 'required|string',
            'class_code' => ['required', 'string', \Illuminate\Validation\Rule::unique('classes')->where('branch_id', $branchId)],
            'grade' => 'nullable|integer',
            'schedules' => 'nullable|array'
        ]);

        $class = \App\Models\ClassModel::create($data);
        return response()->json(['message' => 'Tạo lớp thành công', 'class' => $class]);
    }

    public function update(Request $request, $id)
    {
        $class = \App\Models\ClassModel::findOrFail($id);
        
        $branchId = auth()->user()->branch_id;
        $data = $request->validate([
            'name' => 'required|string',
            'class_code' => ['required', 'string', \Illuminate\Validation\Rule::unique('classes')->where('branch_id', $branchId)->ignore($id)],
            'grade' => 'nullable|integer',
            'schedules' => 'nullable|array'
        ]);

        $class->update($data);
        return response()->json(['message' => 'Cập nhật lớp thành công', 'class' => $class]);
    }

    public function destroy($id)
    {
        $class = \App\Models\ClassModel::findOrFail($id);
        $class->update(['status' => 'inactive']); // Soft delete by status
        return response()->json(['message' => 'Xóa lớp thành công']);
    }
}
