import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function NotificationBell({ align = 'right', label = null }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center group w-full ${label ? 'rounded-xl justify-start' : 'rounded-full justify-center'}`}
      >
        <div className="relative flex items-center justify-center">
            <Bell className="w-5 h-5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800 animate-pulse"></span>
            )}
        </div>
        {label && <span className="ml-3 text-[13px] font-semibold">{label}</span>}
      </button>

      {showDropdown && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0 sm:left-full sm:top-0 sm:ml-2 sm:-mt-2'} mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[110] overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Đã đọc tất cả
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                Không có thông báo nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 group ${notification.is_read ? 'bg-white dark:bg-slate-800' : 'bg-cyan-50/50 dark:bg-cyan-900/20'}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notification.is_read ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400'}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className={`text-sm line-clamp-2 ${notification.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}
                          title={notification.message}
                        >
                          {notification.message}
                        </p>
                        <span className="text-xs text-slate-400 mt-1.5 block font-medium">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                      {!notification.is_read && (
                        <button 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800 text-cyan-600 dark:text-cyan-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
