import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet, ScrollView, Animated, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface HamburgerMenuProps {
  onAdminNavigate?: (section: string) => void;
  currentSection?: string;
}

export default function HamburgerMenu({ onAdminNavigate, currentSection }: HamburgerMenuProps = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { width } = useWindowDimensions();
  const isWeb = width > 768;

  // Fixed px width: 280 on mobile, 300 on web
  const MENU_WIDTH = isWeb ? 300 : 280;

  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;

  useEffect(() => {
    if (menuOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -MENU_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [menuOpen]);

  const handleNavigate = (item: any) => {
    setMenuOpen(false);
    if (item.section) {
      if (onAdminNavigate) {
        onAdminNavigate(item.section);
      } else {
        router.push('/(tabs)/admin' as any);
      }
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const adminMenuItems = [
    { label: 'Home', icon: 'home', section: 'home', description: 'Dashboard & Quick Actions' },
    { label: 'User Management', icon: 'people', section: 'users', description: 'Manage users & roles' },
    { label: 'Analytics', icon: 'bar-chart', section: 'analytics', description: 'View statistics & insights' },
    { label: 'History', icon: 'time', route: '/history' },
    { label: 'About', icon: 'information-circle', route: '/(tabs)/about' },
    { label: 'Profile', icon: 'person', route: '/(tabs)/profile' },
  ];

  const userMenuItems = [
    { label: 'Home', icon: 'home', route: '/' },
    ...(user ? [{ label: 'Capture', icon: 'camera', route: '/(tabs)/camera' }] : []),
    { label: 'History', icon: 'time', route: '/history' },
    ...(user ? [{ label: 'Profile', icon: 'person', route: '/(tabs)/profile' }] : []),
    { label: 'Map', icon: 'map', route: '/(tabs)/map' },
    { label: 'About', icon: 'information-circle', route: '/(tabs)/about' },
  ];

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  return (
    <View style={styles.container}>
      {/* Hamburger Icon */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setMenuOpen(true)}
      >
        <Ionicons name="menu" size={28} color="#2D3E2D" />
      </TouchableOpacity>

      {/* Modal Menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.menuContainer,
              {
                width: MENU_WIDTH,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMenuOpen(false)}
            >
              <Ionicons name="close" size={28} color="#E6F4FE" />
            </TouchableOpacity>

            {/* Menu Title */}
            <Text style={styles.menuTitle}>SnapShroom</Text>

            {/* Menu Items */}
            <ScrollView
              style={styles.menuItems}
              showsVerticalScrollIndicator={false}
            >
              {menuItems.map((item, index) => {
                const isActive = currentSection === (item as any).section;

                return (
                  <TouchableOpacity
                    key={(item as any).section || (item as any).route || index}
                    style={[
                      styles.menuItem,
                      isActive && styles.activeMenuItem,
                    ]}
                    onPress={() => handleNavigate(item)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={'#E6F4FE'}
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={[
                        styles.menuItemText,
                        isActive && styles.activeMenuText,
                      ]}>
                        {item.label}
                      </Text>
                      {(item as any).description && (
                        <Text style={styles.menuItemDescription}>
                          {(item as any).description}
                        </Text>
                      )}
                    </View>
                    {isActive && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                );
              })}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Logout */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                <Ionicons name="log-out" size={24} color="#FF6B6B" />
                <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Info */}
            {user && (
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userRole}>{user.role?.toUpperCase()}</Text>
              </View>
            )}
          </Animated.View>

          {/* Tap outside to close */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  hamburgerButton: {
    padding: 10,
    zIndex: 10,
    backgroundColor: 'rgba(123, 160, 91, 0.2)',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuContainer: {
    // width set dynamically above
    height: '100%',
    backgroundColor: '#2D3E2D',
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 11,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E6F4FE',
    marginBottom: 30,
  },
  menuItems: {
    flex: 1,
    // Hide scrollbar on web via platform check
    ...(Platform.OS === 'web' ? ({ scrollbarWidth: 'none' } as any) : {}),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#3D4E3D',
    position: 'relative',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#E6F4FE',
    fontWeight: '500',
    flexShrink: 1,
  },
  menuItemDescription: {
    fontSize: 12,
    color: 'rgba(230, 244, 254, 0.6)',
    marginTop: 2,
    flexShrink: 1,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(18, 58, 10, 0)',
    borderLeftWidth: 4,
    borderLeftColor: '#023802',
  },
  activeMenuText: {
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: '700',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dad018',
    marginLeft: 8,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#3D4E3D',
    marginVertical: 10,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  userInfo: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#3D4E3D',
    marginTop: 10,
  },
  userEmail: {
    color: '#A8B89D',
    fontSize: 14,
    marginBottom: 4,
  },
  userRole: {
    color: '#7A8F7A',
    fontSize: 12,
    fontWeight: '600',
  },
  adminMenuItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    paddingLeft: 13,
  },
  adminMenuText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  adminBadge: {
    marginLeft: 'auto',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    color: '#2D3E2D',
    fontSize: 10,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});