<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index()
    {
        $notifications = Notification::where(function($query) {
                $query->where('user_id', auth()->id())
                      ->orWhereNull('user_id'); // Broadcast notifications
            })
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();
            
        return response()->json($notifications);
    }

    public function markAsRead($id)
    {
        $notification = Notification::findOrFail($id);
        
        // Ensure user can only mark their own or broadcast notifications
        if ($notification->user_id !== null && $notification->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->update(['is_read' => true]);
        
        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllAsRead()
    {
        Notification::where(function($query) {
                $query->where('user_id', auth()->id())
                      ->orWhereNull('user_id');
            })
            ->where('is_read', false)
            ->update(['is_read' => true]);
            
        return response()->json(['message' => 'All marked as read']);
    }
}
