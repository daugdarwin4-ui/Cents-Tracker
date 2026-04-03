import { useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TYPE_STYLES = {
  budget_alert: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  low_balance: 'text-red-400 bg-red-400/10 border-red-400/20',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const TYPE_LABELS = {
  budget_alert: 'Budget Alert',
  low_balance: 'Low Balance',
  info: 'Info',
};

export default function Notifications() {
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteNotification } = useNotifications();
  const { success, error: showError } = useToast();

  const handleMarkRead = useCallback(async (id) => {
    const { error } = await markRead(id);
    if (error) showError('Could not mark as read.');
  }, [markRead, showError]);

  const handleMarkAllRead = useCallback(async () => {
    const { error } = await markAllRead();
    if (error) showError('Could not mark all as read.');
    else success('All notifications marked as read.');
  }, [markAllRead, success, showError]);

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteNotification(id);
    if (error) showError('Could not delete notification.');
  }, [deleteNotification, showError]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary-400" />
          <h2 className="text-sm font-medium text-gray-300">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </h2>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`card flex items-start gap-3 transition-opacity ${notif.is_read ? 'opacity-60' : ''}`}
            >
              {/* Type badge */}
              <span
                className={`mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLES[notif.type] || TYPE_STYLES.info}`}
              >
                {TYPE_LABELS[notif.type] || notif.type}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notif.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
                  {notif.message}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {new Date(notif.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50"
                    title="Mark as read"
                  >
                    <Check size={13} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-dark-50"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
