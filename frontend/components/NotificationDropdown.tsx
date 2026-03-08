import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, api } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Notification {
  _id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: any; // may be ISO string, timestamp, or mongo extended JSON
}

interface NotificationDropdownProps {
  iconColor?: string;
  iconSize?: number;
}

export default function NotificationDropdown({ 
  iconColor = '#7BA05B', 
  iconSize = 24 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.unread_count ?? response.data.count ?? 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        // Log sample of incoming created_at values on web for debugging
        if (typeof window !== 'undefined' && window?.console?.log) {
          try {
            console.log('NotificationDropdown payload (sample):', response.data.notifications.slice(0,5).map((n:any)=>({ id: n.id || n._id, created_at: n.created_at })));
          } catch (e) { console.log('NotificationDropdown logging failed', e); }
        }

        // Get only the 5 most recent notifications
        setNotifications(response.data.notifications.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    const route = user?.role === 'admin' ? '/(tabs)/adminNotifications' : '/(tabs)/notifications';
    router.push(route);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'login':
        return 'log-in';
      case 'registration':
        return 'person-add';
      case 'profile_update':
        return 'person-circle';
      case 'password_change':
        return 'lock-closed';
      case 'mushroom_scan':
        return 'camera';
      case 'role_change':
        return 'shield';
      case 'account_status':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'login':
      case 'registration':
        return '#4CAF50';
      case 'profile_update':
      case 'password_change':
        return '#2196F3';
      case 'mushroom_scan':
        return '#7BA05B';
      case 'role_change':
        return '#FF9800';
      case 'account_status':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const formatTime = (input: any) => {
    if (!input) return '';
    let d: any = input;
    let dateObj: Date | null = null;
    try {
      if (typeof d === 'object') {
        if (d.$date) {
          if (typeof d.$date === 'string') dateObj = new Date(d.$date);
          else if (d.$date.$numberLong) dateObj = new Date(Number(d.$date.$numberLong));
        } else if (d.$numberLong) {
          dateObj = new Date(Number(d.$numberLong));
        }
      } else if (typeof d === 'number') {
        dateObj = d > 1e12 ? new Date(d) : new Date(d * 1000);
      } else if (typeof d === 'string') {
        const digitsOnly = /^\d+$/;
        if (digitsOnly.test(d)) {
          dateObj = d.length === 13 ? new Date(Number(d)) : new Date(Number(d) * 1000);
        } else {
          dateObj = new Date(d);
        }
      }
    } catch (err) {
      dateObj = null;
    }

    if (!dateObj || isNaN(dateObj.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
      onPress={() => markAsRead(item._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor(item.type)}20` }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={20} color={getNotificationColor(item.type)} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.bellContainer}
      >
        <Ionicons name={isOpen ? "notifications" : "notifications-outline"} size={iconSize} color={iconColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdown}>
                {/* Header */}
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Notifications</Text>
                  <TouchableOpacity onPress={() => setIsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#757575" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#7BA05B" />
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications</Text>
                  </View>
                ) : (
                  <>
                    <FlatList
                      data={notifications}
                      renderItem={renderNotification}
                      keyExtractor={(item) => item._id}
                      style={styles.notificationList}
                      showsVerticalScrollIndicator={false}
                    />

                    {/* Footer */}
                  
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  dropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    width: 300,
    alignSelf: 'left',
    overflow: 'hidden',
    maxHeight: 500,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  notificationList: {
    maxHeight: 350,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    backgroundColor: '#F0F8F0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7BA05B',
    marginLeft: 8,
    marginTop: 6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7BA05B',
  },
});
