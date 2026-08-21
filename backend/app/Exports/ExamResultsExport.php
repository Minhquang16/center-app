<?php

namespace App\Exports;

use App\Models\ExamCandidate;
use App\Models\Exam;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ExamResultsExport implements FromCollection, WithHeadings, WithMapping
{
    protected $examId;
    protected $exam;
    protected $shiftId;
    protected $roomId;
    protected $dynamicRanks = [];
    protected $dynamicScholarships = [];

    public function __construct($examId, $shiftId = null, $roomId = null)
    {
        $this->examId = $examId;
        $this->exam = Exam::findOrFail($examId);
        $this->shiftId = $shiftId;
        $this->roomId = $roomId;
        
        $this->calculateDynamicRanks();
    }
    
    protected function calculateDynamicRanks()
    {
        // Calculate ranks for the entire exam regardless of shift/room filter
        $allCandidates = ExamCandidate::where('exam_id', $this->examId)
            ->whereNotNull('total_score')
            ->orderBy('total_score', 'desc')
            ->get();
            
        $currentRank = 1;
        $displayRank = 1;
        $prevScore = null;
        $scholarshipsAwarded = 0;
        
        foreach ($allCandidates as $c) {
            if ($prevScore !== null) {
                if ($c->total_score == $prevScore) {
                    $this->dynamicRanks[$c->id] = $displayRank;
                } else {
                    $displayRank = $currentRank;
                    $this->dynamicRanks[$c->id] = $displayRank;
                }
            } else {
                $this->dynamicRanks[$c->id] = $displayRank;
            }
            $prevScore = $c->total_score;
            
            if ($this->dynamicRanks[$c->id] <= 3 && $scholarshipsAwarded < 3) {
                $this->dynamicScholarships[$c->id] = true;
                $scholarshipsAwarded++;
            } else {
                $this->dynamicScholarships[$c->id] = false;
            }
            
            $currentRank++;
        }
    }

    public function collection()
    {
        $query = ExamCandidate::with(['student', 'shift', 'room'])
            ->where('exam_id', $this->examId);

        if ($this->shiftId) {
            if ($this->shiftId === 'unassigned') {
                $query->whereNull('exam_shift_id');
            } else {
                $query->where('exam_shift_id', $this->shiftId);
            }
        }

        if ($this->roomId) {
            if ($this->roomId === 'unassigned') {
                $query->whereNull('exam_room_id');
            } else {
                $query->where('exam_room_id', $this->roomId);
            }
        }

        return $query->orderByRaw('`rank` IS NULL, `rank` ASC')
            ->orderBy('total_score', 'desc')
            ->orderBy('candidate_number', 'asc')
            ->get();
    }

    public function headings(): array
    {
        $headers = [
            'SBD',
            'Họ và Tên',
            'Lớp',
            'Ca thi',
            'Phòng thi',
            'Bỏ thi',
        ];
        
        $settings = is_array($this->exam->display_settings) ? $this->exam->display_settings : json_decode($this->exam->display_settings, true);
        if ($this->exam->scoring_type === 'multiple_subjects' && !empty($settings['subjects'])) {
            foreach ($settings['subjects'] as $subj) {
                $headers[] = 'Điểm ' . $subj['name'];
            }
        }
        
        if (!isset($settings['show_total']) || $settings['show_total']) {
            $headers[] = 'Tổng Điểm';
        }
        
        return array_merge($headers, [
            'Xếp Hạng',
            'Học bổng',
            'Ghi chú'
        ]);
    }

    public function map($candidate): array
    {
        $scores = is_array($candidate->scores) ? $candidate->scores : json_decode($candidate->scores, true);
        if (!$scores) $scores = [];
        
        $row = [
            $candidate->candidate_number,
            $candidate->student ? $candidate->student->full_name : '',
            $candidate->student ? $candidate->student->grade : '',
            $candidate->shift ? $candidate->shift->name : '',
            $candidate->room ? $candidate->room->name : '',
            $candidate->is_absent ? 'X' : '',
        ];

        $settings = is_array($this->exam->display_settings) ? $this->exam->display_settings : json_decode($this->exam->display_settings, true);
        if ($this->exam->scoring_type === 'multiple_subjects' && !empty($settings['subjects'])) {
            foreach ($settings['subjects'] as $subj) {
                $row[] = $scores[$subj['name']] ?? '';
            }
        }
        
        if (!isset($settings['show_total']) || $settings['show_total']) {
            $row[] = $candidate->total_score;
        }

        $row[] = $candidate->rank ?: ($this->dynamicRanks[$candidate->id] ?? '');
        
        $isScholarship = $candidate->rank ? $candidate->is_scholarship : ($this->dynamicScholarships[$candidate->id] ?? false);
        $row[] = $isScholarship ? 'CÓ' : '';
        $row[] = $candidate->note;

        return $row;
    }
}
