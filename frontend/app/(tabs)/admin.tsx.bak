import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth, api } from '@/contexts/AuthContext';

interface Analytics {
  total_users: number;
  active_users_30d: number;
  admin_count: number;
  inactive_users: number;
  total_accounts: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  is_active: boolean;
}

type ViewMode = 'analytics' | 'users';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 🔒 HARD GUARD
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access only');
      router.replace('/(tabs)');
    }
  }, [user]);

  const loadAnalytics = async () => {
    const res = await api.get('/admin/analytics');
    if (res.data.success) setAnalytics(res.data.analytics);
  };

  const loadUsers = async () => {
    const res = await api.get('/admin/users');
    if (res.data.success) setUsers(res.data.users);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadAnalytics(), loadUsers()]);
      setLoading(false);
    };
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAnalytics(), loadUsers()]);
    setRefreshing(false);
  };

  if (!user || user.role !== 'admin') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Welcome, {user.name}
          </ThemedText>
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          {['analytics', 'users'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.tab,
                viewMode === mode && styles.tabActive,
              ]}
              onPress={() => setViewMode(mode as ViewMode)}
            >
              <Ionicons
                name={mode === 'analytics' ? 'bar-chart' : 'people'}
                size={20}
                color={viewMode === mode ? '#fff' : '#6B7C61'}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  viewMode === mode && styles.tabTextActive,
                ]}
              >
                {mode.toUpperCase()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6B7C61" />
        ) : viewMode === 'analytics' ? (
          <ThemedText style={styles.emptyText}>
            Analytics Loaded
          </ThemedText>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText>{item.role}</ThemedText>
              </View>
            )}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFCFA' },
  header: { padding: 20, backgroundColor: '#2D3E2D' },
  headerTitle: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerSubtitle: { color: '#A8B89D' },
  tabContainer: { flexDirection: 'row', padding: 20, gap: 10 },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
  },
  tabActive: { backgroundColor: '#6B7C61' },
  tabText: { color: '#6B7C61', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  userCard: {
    padding: 16,
    margin: 10,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
  },
});
