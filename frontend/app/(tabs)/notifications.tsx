import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth, api } from '@/contexts/AuthContext';
import HamburgerMenu from '@/components/HamburgerMenu';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  is_read: boolean;
  created_at: any; // server may send ISO string, timestamp, or extended JSON
  metadata?: Record<string, any>;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    try {
      const unreadOnly = filter === 'unread';
      const response = await api.get(`/notifications?unread_only=${unreadOnly}`);
      
      if (response.data.success) {
        // Log incoming date values on web for debugging
        if (typeof window !== 'undefined' && window?.console?.log) {
          try {
            console.log('Notifications payload (sample):', response.data.notifications.slice(0,5).map(n => ({ id: n.id, created_at: n.created_at })) );
          } catch (e) {
            console.log('Notifications payload logging failed', e);
          }
        }

        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unread_count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, filter, loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      if (response.data.success) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      const response = await api.delete('/notifications/clear-all');
      if (response.data.success) {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: '#4CAF50' };
      case 'error':
        return { name: 'close-circle' as const, color: '#F44336' };
      case 'warning':
        return { name: 'warning' as const, color: '#FF9800' };
      case 'info':
      default:
        return { name: 'information-circle' as const, color: '#2196F3' };
    }
  };

  const formatDate = (dateString: any) => {
    // Be defensive: accept ISO strings, numeric timestamps (s or ms),
    // or Mongo extended JSON like {$date: '...'} / {$date: {$numberLong: '...'}}
    let d: any = dateString;
    if (!d) return '';

    let dateObj: Date | null = null;

    try {
      if (typeof d === 'object') {
        // Mongo extended JSON
        if (d.$date) {
          if (typeof d.$date === 'string') dateObj = new Date(d.$date);
          else if (d.$date.$numberLong) dateObj = new Date(Number(d.$date.$numberLong));
        } else if (d.$numberLong) {
          dateObj = new Date(Number(d.$numberLong));
        }
      } else if (typeof d === 'number') {
        // assume milliseconds unless clearly seconds
        dateObj = d > 1e12 ? new Date(d) : new Date(d * 1000);
      } else if (typeof d === 'string') {
        const digitsOnly = /^\d+$/;
        if (digitsOnly.test(d)) {
          // numeric string
          if (d.length === 13) dateObj = new Date(Number(d));
          else dateObj = new Date(Number(d) * 1000);
        } else {
          dateObj = new Date(d);
        }
      }
    } catch (err) {
      dateObj = null;
    }

    if (!dateObj || isNaN(dateObj.getTime())) return '';

    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (hours < 1) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    // Fallback to a readable local date/time
    return dateObj.toLocaleString();
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>Please log in to view notifications</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          {unreadCount > 0 && (
            <ThemedText style={styles.unreadBadge}>{unreadCount} unread</ThemedText>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={18} color="#E84A5F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B7C61" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <ThemedText style={styles.emptyText}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </ThemedText>
          </View>
        ) : (
          notifications.map((notification) => {
            const { name: iconName, color: iconColor } = getNotificationIcon(notification.type);
            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.is_read && styles.unreadCard,
                ]}
              >
                <View style={styles.notificationIconContainer}>
                  <Ionicons name={iconName} size={28} color={iconColor} />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {!notification.is_read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                          {(() => {
                            const formatted = formatDate(notification.created_at);
                            const fallback = (notification.created_at && String(notification.created_at)) || 'Unknown date';
                            return (
                              <Text style={styles.notificationTime}>{formatted || fallback}</Text>
                            );
                          })()}
                </View>
                <View style={styles.notificationActions}>
                  {!notification.is_read && (
                    <TouchableOpacity onPress={() => markAsRead(notification.id)}>
                      <Ionicons name="checkmark" size={22} color="#4CAF50" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => deleteNotification(notification.id)}>
                    <Ionicons name="trash-outline" size={20} color="#E84A5F" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E3DF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3E2D',
  },
  unreadBadge: {
    fontSize: 14,
    color: '#6B7C61',
    marginTop: 4,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6B7C61',
    borderRadius: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E3DF',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F3EF',
  },
  filterButtonActive: {
    backgroundColor: '#6B7C61',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  clearButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#E84A5F',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E2D',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationActions: {
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'center',
    marginLeft: 8,
  },
});
