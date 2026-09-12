<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    private $settingsFile = 'settings.json';

    public function index()
    {
        if (!Storage::exists($this->settingsFile)) {
            // Default settings
            $defaultSettings = [
                'bank_id' => 'TCB',
                'account_no' => '6616102005',
                'account_name' => 'SUNNY EDUCATION'
            ];
            Storage::put($this->settingsFile, json_encode($defaultSettings));
        }

        $settings = json_decode(Storage::get($this->settingsFile), true);
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'bank_id' => 'required|string',
            'account_no' => 'required|string',
            'account_name' => 'required|string',
        ]);

        $settings = [
            'bank_id' => $request->bank_id,
            'account_no' => $request->account_no,
            'account_name' => strtoupper($request->account_name),
        ];

        Storage::put($this->settingsFile, json_encode($settings));

        return response()->json([
            'message' => 'Cập nhật cấu hình thành công',
            'settings' => $settings
        ]);
    }
}
