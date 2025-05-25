import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check } from 'lucide-react';

export default function Notification({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead,
  unreadCount 
}) {
  // Ensure notifications is always an array
  const notificationsArray = Array.isArray(notifications) ? notifications : [];

  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    notificationsArray.forEach(notification => {
      if (!notification.read) {
        setTimeout(() => {
          onClose(notification.id);
        }, 5000);
      }
    });
  }, [notificationsArray, onClose]);

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notificationsArray.length > 0 && (
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-white/70" />
            <span className="text-white/70 text-sm">
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-white/70 hover:text-white text-sm flex items-center gap-1"
            >
              <Check size={14} />
              Mark all as read
            </button>
          )}
        </div>
      )}
      <AnimatePresence>
        {notificationsArray.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`rounded-lg border p-4 shadow-lg ${getNotificationColor(notification.type)} ${
              !notification.read ? 'ring-2 ring-white/20' : ''
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="font-medium mb-1">{notification.title}</h3>
                <p className="text-sm opacity-90">{notification.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatTimestamp(notification.timestamp)}
                </p>
              </div>
              <div className="flex items-start gap-2">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="text-white/70 hover:text-white"
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onClose(notification.id)}
                  className="text-white/70 hover:text-white"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 