import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Notification({ notifications, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsOpen(true);
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden"
          >
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
                className="flex items-start p-4 border-b border-white/10 last:border-b-0"
              >
                <div className="flex-shrink-0 mr-3">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{notification.title}</p>
                  <p className="text-sm text-white/70">{notification.message}</p>
                </div>
                <button
                  onClick={() => onClose(notification.id)}
                  className="ml-4 flex-shrink-0 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 