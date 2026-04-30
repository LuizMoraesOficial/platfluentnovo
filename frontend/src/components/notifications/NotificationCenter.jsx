import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertTriangle, MessageSquare, Calendar, X, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function NotificationCenter({ userRole }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read-notifications') || '[]');
    } catch { return []; }
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['/api/announcements'],
    queryFn: () => apiRequest('/announcements'),
    enabled: !!profile,
  });

  // Filter announcements relevant to this user's role
  const relevantAnnouncements = announcements.filter(a => {
    if (!a.target_role || a.target_role === 'all') return true;
    if (a.target_role === profile?.role) return true;
    if (a.target_user_id && a.target_user_id === profile?.id) return true;
    return false;
  });

  const notifications = relevantAnnouncements.map(a => ({
    id: a.id,
    type: a.type || 'info',
    title: a.title,
    message: a.content || a.message || '',
    timestamp: new Date(a.created_at || a.createdAt || Date.now()),
    read: readIds.includes(a.id),
  }));

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('read-notifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('read-notifications', JSON.stringify(allIds));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'class': return <Calendar className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-white hover:bg-white/10"
        data-testid="button-notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop — clica fora para fechar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Painel */}
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#eeeef0' }}>Notificações</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ fontSize: 11, color: '#E59313', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#42424a', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Bell style={{ width: 32, height: 32, margin: '0 auto 8px', color: '#42424a' }} />
                  <p style={{ fontSize: 13, color: '#42424a' }}>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      background: !notification.read ? 'rgba(229,147,19,0.06)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = !notification.read ? 'rgba(229,147,19,0.06)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>{getIcon(notification.type)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: notification.read ? '#86868e' : '#eeeef0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E59313', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                        {notification.message && (
                          <p style={{ fontSize: 12, color: '#5a5a64', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {notification.message}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: '#42424a', marginTop: 4 }}>{formatTime(notification.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
