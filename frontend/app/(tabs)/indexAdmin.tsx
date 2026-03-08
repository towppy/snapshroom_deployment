import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useAuth, api } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function IndexAdmin() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalScans: 0,
    activeUsers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuickStats = async () => {
    try {
      const response = await api.get('/admin/analytics');
      if (response.data.success) {
        setStats({
          totalUsers: response.data.data.users.total_users || 0,
          totalScans: response.data.data.mushrooms.total_scans || 0,
          activeUsers: response.data.data.users.active_users || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchQuickStats();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuickStats();
    setRefreshing(false);
  };

  const quickActions = [
    {
      icon: 'bar-chart',
      title: 'Analytics',
      description: 'View detailed reports',
      color: '#7BA05B',
      route: '/(tabs)/admin',
    },
    {
      icon: 'people',
      title: 'User Management',
      description: 'Manage all users',
      color: '#5A8F4C',
      route: '/(tabs)/admin',
    },
    {
      icon: 'camera',
      title: 'Scan Mushroom',
      description: 'Identify mushrooms',
      color: '#6B9B5E',
      route: '/camera',
    },
    {
      icon: 'map',
      title: 'Location Map',
      description: 'View scan locations',
      color: '#7FA863',
      route: '/(tabs)/map',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HamburgerMenu />
          <NotificationDropdown iconColor="#7BA05B" />
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <LinearGradient
          colors={['#7BA05B', '#6A8F4D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="shield-checkmark" size={48} color="#FFD700" />
          <ThemedText style={styles.welcomeText}>Welcome Back, Admin</ThemedText>
          <ThemedText style={styles.nameText}>{user?.name}</ThemedText>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#81C995', '#6FB583']}
              style={styles.statGradient}
            >
              <Ionicons name="people-outline" size={32} color="#fff" />
              <ThemedText style={styles.statNumber}>{stats.totalUsers}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Users</ThemedText>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#F4A896', '#E89B7C']}
              style={styles.statGradient}
            >
              <Ionicons name="scan" size={32} color="#fff" />
              <ThemedText style={styles.statNumber}>{stats.totalScans}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Scans</ThemedText>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#F4B860', '#E8A84F']}
              style={styles.statGradient}
            >
              <Ionicons name="pulse" size={32} color="#fff" />
              <ThemedText style={styles.statNumber}>{stats.activeUsers}</ThemedText>
              <ThemedText style={styles.statLabel}>Active Users</ThemedText>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <LinearGradient
                  colors={[action.color, action.color + 'DD']}
                  style={styles.actionGradient}
                >
                  <Ionicons name={action.icon as any} size={36} color="#fff" />
                  <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
                  <ThemedText style={styles.actionDescription}>
                    {action.description}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* System Status */}
        <View style={styles.statusSection}>
          <ThemedText style={styles.sectionTitle}>System Status</ThemedText>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#81C995' }]} />
                <ThemedText style={styles.statusText}>Backend Online</ThemedText>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#81C995" />
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#81C995' }]} />
                <ThemedText style={styles.statusText}>Database Connected</ThemedText>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#81C995" />
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 12,
    opacity: 0.9,
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3F4941',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#3F4941',
  },
});
