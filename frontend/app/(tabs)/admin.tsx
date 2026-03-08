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
  Dimensions,
  useWindowDimensions,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  LineChart,
  BarChart,
  ProgressChart,
} from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth, api } from '@/contexts/AuthContext';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import {
  buildAnalyticsReport,
  buildUsersReport,
  buildOverviewReport,
} from '@/components/pdf-reports';

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS  — aligned with LandingPage / AboutPage
───────────────────────────────────────────────────────────────────────────── */
const C = {
  dark:    '#1A2318',
  forest:  '#2D4A2A',
  moss:    '#4A7C47',
  sage:    '#7FAB6E',
  cream:   '#F8F5EE',
  sand:    '#EFE8D8',
  amber:   '#C8873A',
  coral:   '#D96B4E',
  white:   '#FFFFFF',
  stone:   '#8A9288',
  mist:    '#E4EAE1',
  success: '#3A8C5C',
  danger:  '#C94040',
};

/* Legacy alias — keeps all existing COLORS.xxx references inside chart configs working */
const COLORS = {
  forest:      C.dark,
  forestMid:   C.forest,
  moss:        C.moss,
  sage:        C.sage,
  mint:        '#A8C5A0',
  cream:       C.cream,
  parchment:   C.sand,
  spore:       C.mist,
  mushCap:     C.amber,
  mushGill:    '#E8A96A',
  mushStem:    '#F0D4A8',
  toxicRed:    C.danger,
  safeGreen:   C.success,
  unknownGray: C.stone,
  white:       C.white,
  textDark:    C.dark,
  textMid:     C.forest,
  textLight:   C.stone,
  shadow:      'rgba(26,46,26,0.10)',
  border:      C.mist,
};

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES  (unchanged)
───────────────────────────────────────────────────────────────────────────── */
interface MushroomAnalytics {
  total_scans: number;
  scans_last_30d: number;
  most_scanned_mushrooms: { name: string; count: number }[];
  top_locations: { location: string; count: number }[];
  detection_success_rate: number;
  edible_vs_toxic: { edible: number; toxic: number; unknown: number };
}
interface UserAnalytics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_count: number;
  recent_registrations_30d: number;
  recent_logins_7d: number;
}
interface Analytics {
  users: UserAnalytics;
  mushrooms: MushroomAnalytics;
  timeline: { date: string; scans: number }[];
}
interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  is_active: boolean;
  last_login?: string;
}
type Section = 'home' | 'users' | 'analytics';

/* ─────────────────────────────────────────────────────────────────────────────
   DEACTIVATION REASONS  (unchanged)
───────────────────────────────────────────────────────────────────────────── */
const DEACTIVATION_REASONS = [
  'Inactive for a long time',
  'Abusing camera or uploading inappropriate images/videos',
  'Spamming or sending scam',
  'Fake identity or impersonation',
  'Suspicious or fraudulent activity',
  'Multiple/duplicate accounts used for abuse',
  'Violating community guidelines or app policies',
];

/* ─────────────────────────────────────────────────────────────────────────────
   CHART CONFIGS  (colors updated to match design tokens)
───────────────────────────────────────────────────────────────────────────── */
const chartConfig = {
  backgroundGradientFrom: C.white,
  backgroundGradientTo:   C.white,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(74,124,71,${opacity})`,
  labelColor:   () => C.forest,
  propsForDots: { r: '4', strokeWidth: '2', stroke: C.moss, fill: C.white },
  propsForBackgroundLines: {
    strokeDasharray: '4 4',
    stroke: C.mist,
    strokeWidth: 1,
  },
  fillShadowGradientFrom:    C.sage,
  fillShadowGradientTo:      C.white,
  fillShadowGradientOpacity: 0.15,
};

const mushroomChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(200,135,58,${opacity})`,
  fillShadowGradientFrom:    C.amber,
  fillShadowGradientOpacity: 0.12,
};

/* ─────────────────────────────────────────────────────────────────────────────
   REUSABLE UI COMPONENTS  (visual redesign only — props/signatures unchanged)
───────────────────────────────────────────────────────────────────────────── */

/** Section header — now uses an Ionicons icon instead of emoji */
const SectionHeader = ({ title, subtitle, emoji }: { title: string; subtitle?: string; emoji?: string }) => {
  // Map the original emoji to a matching Ionicon name
  const iconMap: Record<string, string> = {
    '⚡': 'flash-outline', '📊': 'bar-chart-outline', '📈': 'trending-up-outline',
    '👤': 'person-outline', '👥': 'people-outline', '🍄': 'leaf-outline',
    '🏆': 'trophy-outline', '📄': 'document-text-outline', '🔍': 'scan-outline',
    '📅': 'calendar-outline', '🎯': 'checkmark-done-outline',
  };
  const iconName = (emoji && iconMap[emoji]) ?? 'ellipse-outline';
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionHeaderLeft}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={iconName as any} size={13} color={C.moss} />
        </View>
        <View>
          <Text style={s.sectionTitle}>{title}</Text>
          {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
};

const Card = ({ children, style, title, subtitle }: {
  children: React.ReactNode; style?: any; title?: string; subtitle?: string;
}) => (
  <View style={[s.card, style]}>
    {(title || subtitle) && (
      <View style={s.cardHeader}>
        {title    && <Text style={s.cardTitle}>{title}</Text>}
        {subtitle && <Text style={s.cardSubtitle}>{subtitle}</Text>}
      </View>
    )}
    {children}
  </View>
);

/** StatTile — emoji replaced with Ionicons icon */
const StatTile = ({ emoji, value, label, accentColor, wide = false }: {
  emoji: string; value: string | number; label: string; accentColor: string; wide?: boolean;
}) => {
  const iconMap: Record<string, string> = {
    '👥': 'people-outline', '✅': 'checkmark-circle-outline', '🔍': 'scan-outline',
    '📅': 'calendar-outline', '🛡️': 'shield-checkmark-outline', '🎯': 'checkmark-done-outline',
    '📝': 'create-outline', '⭕': 'close-circle-outline', '⭐': 'star-outline',
  };
  const iconName = iconMap[emoji] ?? 'ellipse-outline';
  return (
    <View style={[s.statTile, wide && s.statTileWide]}>
      <View style={[s.statTileTopBar, { backgroundColor: accentColor }]} />
      <View style={[s.statTileIconWrap, { backgroundColor: `${accentColor}18` }]}>
        <Ionicons name={iconName as any} size={20} color={accentColor} />
      </View>
      <Text style={[s.statTileValue, { color: accentColor }]}>{value}</Text>
      <Text style={s.statTileLabel}>{label}</Text>
    </View>
  );
};

/** InlineStatRow — emoji replaced with Ionicons icon */
const InlineStatRow = ({ items }: {
  items: { emoji: string; value: string | number; label: string; color: string }[];
}) => {
  const iconMap: Record<string, string> = {
    '🛡️': 'shield-checkmark-outline', '🎯': 'checkmark-done-outline',
    '📝': 'create-outline', '👥': 'people-outline',
  };
  return (
    <View style={s.inlineStatRow}>
      {items.map((item, i) => {
        const iconName = iconMap[item.emoji] ?? 'ellipse-outline';
        return (
          <React.Fragment key={i}>
            {i > 0 && <View style={s.inlineDivider} />}
            <View style={s.inlineStat}>
              <View style={[s.inlineIconWrap, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={iconName as any} size={18} color={item.color} />
              </View>
              <Text style={[s.inlineStatValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.inlineStatLabel}>{item.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const RankItem = ({ rank, name, value, valueLabel = '' }: {
  rank: number; name: string; value: number; valueLabel?: string;
}) => {
  const rankColors = [C.amber, C.sage, C.stone];
  const accent = rankColors[rank - 1] ?? C.mist;
  return (
    <View style={s.rankItem}>
      <View style={[s.rankBadge, { backgroundColor: `${accent}20`, borderColor: `${accent}40`, borderWidth: 1 }]}>
        <Text style={[s.rankBadgeText, { color: accent }]}>{rank}</Text>
      </View>
      <Text style={s.rankItemName} numberOfLines={1}>{name}</Text>
      <View style={s.rankItemRight}>
        <Text style={[s.rankItemCount, { color: C.forest }]}>{value}</Text>
        {valueLabel ? <Text style={s.rankItemUnit}>{valueLabel}</Text> : null}
      </View>
    </View>
  );
};

const ExportButton = ({ onPress, label, icon = 'document-text-outline' }: {
  onPress: () => void; label: string; icon?: string;
}) => (
  <TouchableOpacity style={s.exportBtn} onPress={onPress} activeOpacity={0.85}>
    <View style={s.exportBtnIcon}>
      <Ionicons name={icon as any} size={16} color={C.white} />
    </View>
    <Text style={s.exportBtnText}>{label}</Text>
    <Ionicons name="arrow-forward" size={14} color={`${C.white}80`} />
  </TouchableOpacity>
);

/* FIX: Custom legend for ProgressChart (unchanged logic) */
const ProgressLegend = ({ items }: {
  items: { label: string; color: string; pct: number }[];
}) => (
  <View style={s.progressLegend}>
    {items.map((item, i) => (
      <View key={i} style={s.progressLegendItem}>
        <View style={[s.progressLegendDot, { backgroundColor: item.color }]} />
        <Text style={s.progressLegendLabel}>{item.label}</Text>
        <Text style={[s.progressLegendPct, { color: item.color }]}>
          {Math.round(item.pct * 100)}%
        </Text>
      </View>
    ))}
  </View>
);

/* ─────────────────────────────────────────────────────────────────────────────
   PDF EXPORT  (unchanged)
───────────────────────────────────────────────────────────────────────────── */
const exportPDF = async (html: string, filename: string) => {
  try {
    Alert.alert('Generating PDF', 'Please wait…');
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (!w) { Alert.alert('Export Failed', 'Unable to open print preview (popup blocked).'); return; }
      w.document.write(html); w.document.close(); w.focus();
      setTimeout(() => w.print(), 600);
      return;
    }
    const { uri } = await Print.printToFileAsync({ html, base64: false, width: 595, height: 842, orientation: 'portrait' });
    const FileSystem = (await import('expo-file-system/legacy')) as typeof import('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error('PDF file was not created');
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Save ${filename}`, UTI: 'com.adobe.pdf' });
    } else {
      Alert.alert('PDF Saved', `Report saved to:\n${uri}`);
    }
  } catch (err: any) { Alert.alert('Export Failed', err?.message || 'Could not generate PDF.'); }
};

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════*/
export default function AdminDashboard() {
  const { user, accessToken } = useAuth();
  const router = useRouter();

  const { width: screenWidth } = useWindowDimensions();
  const IS_WIDE = screenWidth >= 768;

  const FULL_CHART_W = screenWidth - 48 - 32;
  const HALF_CHART_W = Math.floor((screenWidth - 48 - 8) / 2) - 32;
  const CHART_W      = IS_WIDE ? HALF_CHART_W : FULL_CHART_W;
  const BAR_ITEM_W   = IS_WIDE ? 100 : 70;
  const MOBILE_BAR_H = 300;
  const WEB_BAR_H    = 240;

  const rowStyle  = { flexDirection: IS_WIDE ? 'row' as const : 'column' as const, gap: IS_WIDE ? 8 : 0, marginBottom: 16, alignItems: 'flex-start' as const };
  const halfStyle = { flex: IS_WIDE ? 1 : undefined, width: IS_WIDE ? undefined : '100%' as const, marginBottom: IS_WIDE ? 0 : 8 };

  const formatBarLabel = (label: string): string => {
    if (!IS_WIDE) return label;
    if (label.length <= 9) return label;
    const mid = Math.floor(label.length / 2);
    let splitAt = label.lastIndexOf(' ', mid);
    if (splitAt === -1) splitAt = label.indexOf(' ');
    if (splitAt === -1) return label.slice(0, 8) + '…';
    return label.slice(0, splitAt) + '\n' + label.slice(splitAt + 1);
  };

  const safeBarData = (items: { label: string; value: number }[], max = 5) => {
    const filtered = items.filter(i => typeof i.value === 'number').slice(0, max);
    if (filtered.length === 0) return { labels: ['No data'], datasets: [{ data: [0] }], chartWidth: CHART_W };
    return {
      labels:     filtered.map(i => formatBarLabel(i.label)),
      datasets:   [{ data: filtered.map(i => i.value) }],
      chartWidth: Math.max(CHART_W, filtered.length * BAR_ITEM_W),
    };
  };

  const timelineLabels = (tl: { date: string; scans: number }[]) => {
    const step = IS_WIDE ? 4 : 3;
    return tl.map((t, i) => {
      if (i % step !== 0 && i !== tl.length - 1) return '';
      const parts = t.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : t.date;
    });
  };

  /* ── State (unchanged) ── */
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [analytics, setAnalytics]           = useState<Analytics | null>(null);
  const [users, setUsers]                   = useState<User[]>([]);
  const [isConfirmingRole, setIsConfirmingRole] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: string; actionLabel: string } | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [pendingDeactivateUserId, setPendingDeactivateUserId] = useState<string | null>(null);
  const [selectedDeactivateReason, setSelectedDeactivateReason] = useState('');

  /* ── All functions below are UNCHANGED ── */

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin access only');
      router.replace('/(tabs)');
    }
  }, [user]);

  const setAuthHeader = () => {
    if (accessToken && !api.defaults.headers.common.Authorization)
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  };

  const loadAnalytics = async () => {
    try {
      setAuthHeader();
      const res = await api.get('/admin/analytics');
      if (res.data.success) setAnalytics(res.data.analytics);
    } catch (error: any) {
      if (error.response?.status === 401)
        Alert.alert('Session Expired', 'Please log in again.', [{ text: 'Login', onPress: () => router.replace('/') }]);
    }
  };

  const loadUsers = async () => {
    try {
      setAuthHeader();
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.users);
    } catch (error: any) {
      if (error.response?.status === 401)
        Alert.alert('Session Expired', 'Please log in again.', [{ text: 'Login', onPress: () => router.replace('/') }]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (currentSection === 'home')           await loadAnalytics();
      else if (currentSection === 'users')     await loadUsers();
      else if (currentSection === 'analytics') await loadAnalytics();
      setLoading(false);
    };
    if (user && user.role === 'admin' && accessToken) load();
  }, [currentSection, user, accessToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (['home', 'analytics'].includes(currentSection)) await loadAnalytics();
    else if (currentSection === 'users') await loadUsers();
    setRefreshing(false);
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (currentStatus) {
      setPendingDeactivateUserId(userId);
      setSelectedDeactivateReason('');
      setShowDeactivateModal(true);
    } else {
      try {
        setAuthHeader();
        const res = await api.put(`/admin/users/${userId}/activate`);
        if (res.data.success) { Alert.alert('Success', res.data.message); await loadUsers(); }
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to activate user');
      }
    }
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateModal(false);
    setPendingDeactivateUserId(null);
    setSelectedDeactivateReason('');
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingDeactivateUserId || !selectedDeactivateReason) return;
    setShowDeactivateModal(false);
    try {
      setAuthHeader();
      const res = await api.put(`/admin/users/${pendingDeactivateUserId}/deactivate`, { reason: selectedDeactivateReason });
      if (res.data.success) { Alert.alert('Success', res.data.message); await loadUsers(); }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setPendingDeactivateUserId(null);
      setSelectedDeactivateReason('');
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    setAuthHeader();
    const newIsAdmin  = currentRole === 'admin' ? 0 : 1;
    const newRole     = newIsAdmin === 1 ? 'admin' : 'user';
    const actionLabel = newIsAdmin === 1 ? 'Make Admin' : 'Make User';
    if (Platform.OS === 'web') {
      setPendingRoleChange({ userId, newRole: newRole, actionLabel });
      setIsConfirmingRole(true);
    } else {
      Alert.alert('Confirm Role Change', `${actionLabel}? This will change the role to ${newRole}.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          onPress: async () => {
            try {
              const res = await api.put(`/admin/users/${userId}/role`, { is_admin: newIsAdmin });
              if (res.data.success) { Alert.alert('Success', res.data.message); await loadUsers(); }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to change role');
            }
          },
        },
      ]);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setIsConfirmingRole(false);
    const { userId, newRole } = pendingRoleChange;
    const newIsAdmin = newRole === 'admin' ? 1 : 0;
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { is_admin: newIsAdmin });
      if (res.data.success) { Alert.alert('Success', res.data.message); await loadUsers(); }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change role');
    }
    setPendingRoleChange(null);
  };

  const handleCancelRoleChange = () => {
    setIsConfirmingRole(false);
    setPendingRoleChange(null);
  };

  if (!user || user.role !== 'admin') {
    return (
      <ThemedView style={s.container}>
        <ThemedText>Access Denied</ThemedText>
      </ThemedView>
    );
  }

  /* ── Loading / Empty (visual update only) ── */
  const renderLoading = (message: string) => (
    <View style={s.loadingContainer}>
      <View style={s.loadingIconWrap}>
        <Ionicons name="leaf" size={36} color={C.sage} />
      </View>
      <ActivityIndicator size="large" color={C.moss} style={{ marginTop: 16 }} />
      <Text style={s.loadingText}>{message}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="analytics-outline" size={44} color={C.stone} />
      </View>
      <Text style={s.emptyTitle}>No data yet</Text>
      <Text style={s.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );

  /* ═══════════════════════════════════════════
     HOME SECTION  (logic unchanged, visual updated)
  ═══════════════════════════════════════════ */
  const renderHome = () => {
    if (loading)    return renderLoading('Gathering spores…');
    if (!analytics) return renderEmpty();

    const { users: U, mushrooms: M, timeline } = analytics;

    const progressData = {
      labels: ['Active', 'Inactive', 'Admins'],
      data: [
        U.total_users > 0 ? U.active_users   / U.total_users : 0,
        U.total_users > 0 ? U.inactive_users / U.total_users : 0,
        U.total_users > 0 ? U.admin_count    / U.total_users : 0,
      ],
    };
    const progressLegendItems = [
      { label: 'Active',   color: `rgba(58,140,92,1)`,  pct: progressData.data[0] },
      { label: 'Inactive', color: `rgba(201,64,64,1)`,  pct: progressData.data[1] },
      { label: 'Admins',   color: `rgba(74,124,71,1)`,  pct: progressData.data[2] },
    ];
    const progressChartConfig = {
      ...chartConfig,
      color: (opacity = 1, index?: number) => {
        const colors = [`rgba(58,140,92,${opacity})`, `rgba(201,64,64,${opacity})`, `rgba(74,124,71,${opacity})`];
        return colors[index ?? 0] ?? colors[0];
      },
    };

    return (
      <View style={s.page}>
        {/* Page hero */}
        <View style={s.pageHero}>
          <View style={s.pageHeroLeft}>
            <Text style={s.pageHeroEyebrow}>ADMIN DASHBOARD</Text>
            <Text style={s.pageHeroTitle}>Overview</Text>
            <Text style={s.pageHeroSub}>Forest index healthy · All systems normal</Text>
          </View>
          <View style={s.pageHeroIcon}>
            <Ionicons name="leaf" size={30} color={C.sage} />
          </View>
        </View>

        <SectionHeader title="Quick Actions" emoji="⚡" />
        <View style={s.quickRow}>
          <TouchableOpacity style={[s.quickBtn, { backgroundColor: C.forest }]} onPress={() => setCurrentSection('users')} activeOpacity={0.85}>
            <View style={s.quickBtnIconWrap}><Ionicons name="people-outline" size={22} color={C.white} /></View>
            <Text style={s.quickBtnLabel}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, { backgroundColor: C.moss }]} onPress={() => setCurrentSection('analytics')} activeOpacity={0.85}>
            <View style={s.quickBtnIconWrap}><Ionicons name="bar-chart-outline" size={22} color={C.white} /></View>
            <Text style={s.quickBtnLabel}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, { backgroundColor: C.amber }]} onPress={loadAnalytics} activeOpacity={0.85}>
            <View style={s.quickBtnIconWrap}><Ionicons name="refresh-outline" size={22} color={C.white} /></View>
            <Text style={s.quickBtnLabel}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="At a Glance" emoji="📊" />
        <View style={s.statGrid}>
          <StatTile emoji="👥" value={U.total_users}    label="Total Users"  accentColor={C.moss} />
          <StatTile emoji="✅" value={U.active_users}   label="Active Users" accentColor={C.success} />
          <StatTile emoji="🔍" value={M.total_scans}    label="Total Scans"  accentColor={C.amber} />
          <StatTile emoji="📅" value={M.scans_last_30d} label="Scans (30d)"  accentColor={C.sage} />
        </View>

        <Card style={s.mb16}>
          <InlineStatRow items={[
            { emoji: '🛡️', value: U.admin_count,                     label: 'Admins',    color: C.moss },
            { emoji: '🎯', value: `${M.detection_success_rate}%`,    label: 'Success',   color: C.success },
            { emoji: '📝', value: U.recent_registrations_30d ?? '—', label: 'New (30d)', color: C.amber },
          ]} />
        </Card>

        <SectionHeader title="Scan Timeline" subtitle="Daily scan activity" emoji="📈" />
        <View style={rowStyle}>
          <View style={halfStyle}>
            <Card style={s.mb0}>
              {timeline && timeline.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{ labels: timelineLabels(timeline), datasets: [{ data: timeline.map(t => t.scans) }] }}
                    width={Math.max(CHART_W, timeline.length * (IS_WIDE ? 32 : 52))}
                    height={200}
                    chartConfig={mushroomChartConfig}
                    bezier
                    withShadow={false}
                    style={s.chart}
                  />
                </ScrollView>
              ) : (
                <View style={s.chartPlaceholder}><Text style={s.chartPlaceholderText}>No data yet</Text></View>
              )}
            </Card>
          </View>
          {IS_WIDE && (
            <View style={halfStyle}>
              <Card style={s.mb0} title="User Breakdown" subtitle="Active · Inactive · Admins">
                <ProgressChart
                  data={progressData}
                  width={CHART_W}
                  height={200}
                  strokeWidth={14}
                  radius={36}
                  chartConfig={progressChartConfig}
                  style={s.chart}
                  hideLegend={false}
                />
              </Card>
            </View>
          )}
        </View>

        {!IS_WIDE && (
          <>
            <SectionHeader title="User Breakdown" subtitle="Active · Inactive · Admins" emoji="👤" />
            <Card>
              <ProgressChart
                data={progressData}
                width={FULL_CHART_W}
                height={220}
                strokeWidth={16}
                radius={42}
                chartConfig={progressChartConfig}
                style={s.chart}
                hideLegend={true}
              />
              <ProgressLegend items={progressLegendItems} />
            </Card>
          </>
        )}

        <SectionHeader title="Reports" emoji="📄" />
        <Card style={s.mb24}>
          <ExportButton
            onPress={() => exportPDF(buildOverviewReport(analytics, user.name), 'SnapShroom_Overview_Report.pdf')}
            label="Export Overview Report"
            icon="document-text-outline"
          />
        </Card>
      </View>
    );
  };

  /* ═══════════════════════════════════════════
     USERS SECTION  (logic unchanged, visual updated)
  ═══════════════════════════════════════════ */
  const renderUsers = () => {
    if (loading) return renderLoading('Loading user mycelium…');

    return (
      <View style={s.page}>
        <View style={s.pageHero}>
          <View style={s.pageHeroLeft}>
            <Text style={s.pageHeroEyebrow}>USER DIRECTORY</Text>
            <Text style={s.pageHeroTitle}>{users.length} Members</Text>
            <Text style={s.pageHeroSub}>Manage roles and access control</Text>
          </View>
          <View style={s.pageHeroIcon}>
            <Ionicons name="people" size={30} color={C.sage} />
          </View>
        </View>

        {users.length > 0 && (
          <Card style={s.mb20}>
            <ExportButton
              onPress={() => exportPDF(buildUsersReport(users, user.name), 'SnapShroom_User_Directory.pdf')}
              label="Export User Directory"
              icon="people-outline"
            />
          </Card>
        )}

        <SectionHeader title="All Users" subtitle={`${users.length} registered accounts`} emoji="👥" />

        <FlatList
          data={users}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={s.userCard}>
              {/* Coloured top stripe */}
              <View style={[s.userCardStripe, { backgroundColor: item.role === 'admin' ? C.amber : C.sage }]} />

              <View style={s.userCardTop}>
                {/* Avatar */}
                <View style={[s.avatar, {
                  backgroundColor: item.role === 'admin' ? `${C.amber}20` : `${C.moss}20`,
                  borderColor:     item.role === 'admin' ? `${C.amber}45` : `${C.moss}45`,
                }]}>
                  <Text style={[s.avatarText, { color: item.role === 'admin' ? C.amber : C.moss }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                  {item.role === 'admin' && (
                    <View style={s.avatarBadge}>
                      <Ionicons name="star" size={8} color={C.white} />
                    </View>
                  )}
                </View>

                <View style={s.userCardMeta}>
                  <View style={s.userCardNameRow}>
                    <Text style={s.userCardName} numberOfLines={1}>{item.name}</Text>
                    <View style={[s.rolePill, {
                      backgroundColor: item.role === 'admin' ? `${C.amber}18` : `${C.moss}12`,
                    }]}>
                      <Text style={[s.rolePillText, { color: item.role === 'admin' ? C.amber : C.moss }]}>
                        {item.role === 'admin' ? 'Admin' : 'User'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.userCardEmail}>{item.email}</Text>
                  <Text style={s.userCardInfo}>@{item.username} · Joined {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
              </View>

              <View style={s.userCardDivider} />

              <View style={s.userCardStatusRow}>
                <View style={[s.statusBadge, {
                  backgroundColor: item.is_active ? `${C.success}12` : `${C.danger}12`,
                }]}>
                  <View style={[s.statusDot, { backgroundColor: item.is_active ? C.success : C.danger }]} />
                  <Text style={[s.statusLabel, { color: item.is_active ? C.success : C.danger }]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {item.last_login && (
                  <Text style={s.lastLoginText}>Last login {new Date(item.last_login).toLocaleDateString()}</Text>
                )}
              </View>

              <View style={s.userCardActions}>
                <TouchableOpacity
                  style={[s.actionBtn, {
                    backgroundColor: item.is_active ? `${C.danger}08`  : `${C.success}08`,
                    borderColor:     item.is_active ? `${C.danger}25`  : `${C.success}25`,
                  }]}
                  onPress={() => handleToggleUserStatus(item.id, item.is_active)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="power" size={14} color={item.is_active ? C.danger : C.success} />
                  <Text style={[s.actionBtnText, { color: item.is_active ? C.danger : C.success }]}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                {item.id !== user.id && (
                  <TouchableOpacity
                    style={[s.actionBtn, {
                      backgroundColor: item.role === 'admin' ? `${C.amber}15` : `${C.moss}08`,
                      borderColor:     item.role === 'admin' ? `${C.amber}35` : `${C.moss}25`,
                    }]}
                    onPress={() => handleChangeRole(item.id, item.role)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.role === 'admin' ? 'shield-checkmark' : 'person-outline'}
                      size={14}
                      color={item.role === 'admin' ? C.amber : C.moss}
                    />
                    <Text style={[s.actionBtnText, { color: item.role === 'admin' ? C.amber : C.moss }]}>
                      {item.role === 'admin' ? 'Admin' : 'User'}
                    </Text>
                    <Ionicons name="swap-horizontal" size={13} color={item.role === 'admin' ? C.amber : C.stone} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      </View>
    );
  };

  /* ═══════════════════════════════════════════
     ANALYTICS SECTION  (logic unchanged, visual updated)
  ═══════════════════════════════════════════ */
  const renderAnalytics = () => {
    if (loading)    return renderLoading('Analyzing mycelium network…');
    if (!analytics) return renderEmpty();

    const { users: U, mushrooms: M, timeline } = analytics;

    const progressChartConfig = {
      ...chartConfig,
      color: (opacity = 1, index?: number) => {
        const colors = [`rgba(58,140,92,${opacity})`, `rgba(201,64,64,${opacity})`, `rgba(74,124,71,${opacity})`];
        return colors[index ?? 0] ?? colors[0];
      },
    };

    return (
      <View style={s.page}>
        <View style={s.pageHero}>
          <View style={s.pageHeroLeft}>
            <Text style={s.pageHeroEyebrow}>FULL ANALYTICS</Text>
            <Text style={s.pageHeroTitle}>Insights</Text>
            <Text style={s.pageHeroSub}>Scan trends, species & locations</Text>
          </View>
          <View style={s.pageHeroIcon}>
            <Ionicons name="bar-chart" size={30} color={C.sage} />
          </View>
        </View>

        <SectionHeader title="User Analytics" emoji="👥" />
        <View style={s.statGrid}>
          <StatTile emoji="👥" value={U.total_users}    label="Total"    accentColor={C.moss} />
          <StatTile emoji="✅" value={U.active_users}   label="Active"   accentColor={C.success} />
          <StatTile emoji="⭕" value={U.inactive_users} label="Inactive" accentColor={C.danger} />
          <StatTile emoji="⭐" value={U.admin_count}    label="Admins"   accentColor={C.amber} />
        </View>

        <SectionHeader title="User Composition" subtitle="Active vs Inactive vs Admins" emoji="📊" />
        <View style={rowStyle}>
          <View style={halfStyle}>
            <Card style={s.mb0}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: ['Active', 'Inactive', 'Admins'],
                    datasets: [{
                      data: [U.active_users, U.inactive_users, U.admin_count],
                      colors: [() => C.success, () => C.danger, () => C.moss],
                    }],
                  }}
                  width={Math.max(CHART_W, 3 * BAR_ITEM_W)}
                  height={200}
                  fromZero
                  showValuesOnTopOfBars
                  withCustomBarColorFromData
                  flatColor
                  chartConfig={{ ...chartConfig, barPercentage: 0.55 }}
                  style={s.chart}
                />
              </ScrollView>
            </Card>
          </View>
          {IS_WIDE && timeline && timeline.length > 0 && (
            <View style={halfStyle}>
              <Card style={s.mb0} title="Scan Timeline" subtitle="Daily activity">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{ labels: timelineLabels(timeline), datasets: [{ data: timeline.map(t => t.scans) }] }}
                    width={Math.max(CHART_W, timeline.length * 32)}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    withShadow={false}
                    style={s.chart}
                  />
                </ScrollView>
              </Card>
            </View>
          )}
        </View>

        {!IS_WIDE && timeline && timeline.length > 0 && (
          <>
            <SectionHeader title="Scan Timeline" subtitle="Daily scan activity" emoji="📈" />
            <Card>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{ labels: timelineLabels(timeline), datasets: [{ data: timeline.map(t => t.scans) }] }}
                  width={Math.max(FULL_CHART_W, timeline.length * 52)}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  withShadow={false}
                  style={s.chart}
                />
              </ScrollView>
            </Card>
          </>
        )}

        <SectionHeader title="Mushroom Analytics" emoji="🍄" />
        <View style={s.statGridThree}>
          <StatTile emoji="🔍" value={M.total_scans}                   label="Total Scans"  accentColor={C.amber}   wide />
          <StatTile emoji="📅" value={M.scans_last_30d}                label="Last 30d"     accentColor={C.sage}    wide />
          <StatTile emoji="🎯" value={`${M.detection_success_rate}%`} label="Success Rate" accentColor={C.success} wide />
        </View>

        {(M.most_scanned_mushrooms.length > 0 || M.top_locations.length > 0) && (
          <View style={rowStyle}>
            {M.most_scanned_mushrooms.length > 0 && (
              <View style={halfStyle}>
                <SectionHeader title="Top Species" subtitle="Most scanned" emoji="🏆" />
                <Card style={s.mb0}>
                  {M.most_scanned_mushrooms.slice(0, 5).map((item, i) => (
                    <RankItem key={i} rank={i + 1} name={item.name} value={item.count} valueLabel="scans" />
                  ))}
                </Card>
              </View>
            )}
          </View>
        )}

        {M.most_scanned_mushrooms.length > 0 && (
          <>
            <SectionHeader title="Species Chart" subtitle="Scan count by mushroom" emoji="🍄" />
            <View style={rowStyle}>
              <View style={halfStyle}>
                <Card style={s.mb0}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(() => {
                      const bd = safeBarData(M.most_scanned_mushrooms.map(m => ({ label: m.name, value: m.count })));
                      return (
                        <BarChart
                          data={{ labels: bd.labels, datasets: bd.datasets }}
                          width={bd.chartWidth}
                          height={IS_WIDE ? WEB_BAR_H : MOBILE_BAR_H}
                          fromZero
                          showValuesOnTopOfBars
                          chartConfig={{ ...mushroomChartConfig, barPercentage: 0.55 }}
                          style={s.chart}
                          verticalLabelRotation={IS_WIDE ? 0 : 45}
                        />
                      );
                    })()}
                  </ScrollView>
                </Card>
              </View>
            </View>
          </>
        )}

        <SectionHeader title="Reports" emoji="📄" />
        <Card style={s.mb24}>
          <ExportButton
            onPress={() => exportPDF(buildAnalyticsReport(analytics, user.name), 'SnapShroom_Full_Analytics.pdf')}
            label="Export Full Analytics"
            icon="bar-chart-outline"
          />
        </Card>
      </View>
    );
  };

  /* ═══════════════════════════════════════════
     ROOT RENDER
  ═══════════════════════════════════════════ */
  return (
    <ThemedView style={s.container}>

      {/* ── NAVBAR — matches LandingPage / AboutPage ── */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <HamburgerMenu
            onAdminNavigate={(section) => setCurrentSection(section as Section)}
            currentSection={currentSection}
          />
          <NotificationDropdown iconColor={COLORS.mint} />
        </View>
        <View style={s.topHeaderCenter}>
          <View style={s.topHeaderLogoWrap}>
            <Ionicons name="leaf" size={18} color={C.white} />
          </View>
          <Text style={s.topHeaderTitle}>SnapShroom</Text>
        </View>
        <View style={s.topHeaderRight}>
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color={C.white} />
            <Text style={s.adminBadgeText}>Admin</Text>
          </View>
        </View>
      </View>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {(['home', 'users', 'analytics'] as Section[]).map(section => {
          const meta: Record<Section, { label: string; icon: string }> = {
            home:      { label: 'Overview',  icon: 'home-outline' },
            users:     { label: 'Users',     icon: 'people-outline' },
            analytics: { label: 'Analytics', icon: 'bar-chart-outline' },
          };
          const isActive = currentSection === section;
          return (
            <TouchableOpacity
              key={section}
              style={[s.tabItem, isActive && s.tabItemActive]}
              onPress={() => setCurrentSection(section)}
              activeOpacity={0.85}
            >
              <Ionicons name={meta[section].icon as any} size={18} color={isActive ? C.sage : C.stone} />
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{meta[section].label}</Text>
              {isActive && <View style={s.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── CONTEXT STRIP ── */}
      <View style={s.contextStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="person-circle-outline" size={13} color={C.stone} />
          <Text style={s.contextUser}>{user.name}</Text>
        </View>
        <Text style={s.contextSection}>
          {currentSection === 'home'      && 'Dashboard Overview'}
          {currentSection === 'users'     && 'User Management'}
          {currentSection === 'analytics' && 'Analytics & Insights'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.cream }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.moss} />}
        showsVerticalScrollIndicator={false}
      >
        {currentSection === 'home'      && renderHome()}
        {currentSection === 'users'     && renderUsers()}
        {currentSection === 'analytics' && renderAnalytics()}
      </ScrollView>

      {/* ── ROLE CHANGE MODAL ── */}
      {isConfirmingRole && pendingRoleChange && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.deactModalHeader}>
              <View style={[s.modalHeaderIcon, { backgroundColor: `${C.moss}15` }]}>
                <Ionicons name="swap-horizontal" size={20} color={C.moss} />
              </View>
              <Text style={s.modalTitle}>Confirm Role Change</Text>
            </View>
            <Text style={s.modalMessage}>
              {pendingRoleChange.actionLabel}? This will change the role to{' '}
              <Text style={{ fontWeight: '800', color: C.dark }}>{pendingRoleChange.newRole}</Text>.
            </Text>
            <View style={s.modalButtonRow}>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={handleCancelRoleChange} activeOpacity={0.8}>
                <Text style={s.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnConfirm]} onPress={handleConfirmRoleChange} activeOpacity={0.8}>
                <Text style={s.modalBtnConfirmText}>{pendingRoleChange.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── DEACTIVATION REASON MODAL ── */}
      {showDeactivateModal && (
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { maxWidth: 460, width: '92%' }]}>
            <View style={s.deactModalHeader}>
              <View style={[s.modalHeaderIcon, { backgroundColor: `${C.danger}15` }]}>
                <Ionicons name="ban" size={20} color={C.danger} />
              </View>
              <Text style={[s.modalTitle, { color: C.danger }]}>Deactivate Account</Text>
            </View>
            <Text style={[s.modalMessage, { marginTop: 8 }]}>
              Select a reason for deactivating this account. The user will be notified by email.
            </Text>
            <View style={s.deactReasonList}>
              {DEACTIVATION_REASONS.map((reason, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.deactReasonItem, selectedDeactivateReason === reason && s.deactReasonItemSelected]}
                  onPress={() => setSelectedDeactivateReason(reason)}
                  activeOpacity={0.8}
                >
                  <View style={[s.deactReasonRadio, selectedDeactivateReason === reason && s.deactReasonRadioSelected]} />
                  <Text style={[s.deactReasonText, selectedDeactivateReason === reason && s.deactReasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalButtonRow}>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={handleCancelDeactivate} activeOpacity={0.8}>
                <Text style={s.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: selectedDeactivateReason ? C.danger : C.mist }]}
                onPress={handleConfirmDeactivate}
                disabled={!selectedDeactivateReason}
                activeOpacity={0.8}
              >
                <Text style={[s.modalBtnConfirmText, { color: selectedDeactivateReason ? C.white : C.stone }]}>
                  Deactivate
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </ThemedView>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   STYLES  — aligned with LandingPage / AboutPage tokens
═════════════════════════════════════════════════════════════════════════════*/
const { width: SW } = Dimensions.get('window');

const s = StyleSheet.create({

  container: { flex: 1, backgroundColor: C.cream },

  /* ── Navbar ── */
  topHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 12,
    backgroundColor: C.dark,
    borderBottomWidth: 1, borderBottomColor: `${C.forest}60`,
  },
  topHeaderLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  topHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topHeaderRight:  { flex: 1, alignItems: 'flex-end' },
  topHeaderLogoWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center',
  },
  topHeaderTitle: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.moss, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  adminBadgeText: { color: C.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  /* ── Tab Bar ── */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.forest,
    borderBottomWidth: 1, borderBottomColor: `${C.moss}30`,
  },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2, position: 'relative' },
  tabItemActive:  { backgroundColor: `${C.sage}12` },
  tabLabel:       { fontSize: 11, color: C.stone, fontWeight: '600' },
  tabLabelActive: { color: C.sage, fontWeight: '800' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2.5, backgroundColor: C.sage, borderRadius: 2,
  },

  /* ── Context strip ── */
  contextStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: C.sand,
    borderBottomWidth: 1, borderBottomColor: C.mist,
  },
  contextUser:    { color: C.stone,  fontSize: 12 },
  contextSection: { color: C.forest, fontSize: 12, fontWeight: '700' },

  /* ── Page layout ── */
  page: { paddingHorizontal: 16, paddingTop: 20 },

  pageHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.forest, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 5, overflow: 'hidden',
  },
  pageHeroLeft:    { flex: 1 },
  pageHeroEyebrow: { color: C.sage, fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 4 },
  pageHeroTitle:   { color: C.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 },
  pageHeroSub:     { color: `${C.white}70`, fontSize: 12 },
  pageHeroIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: `${C.sage}22`, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${C.sage}30`,
  },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${C.moss}15`, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle:    { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.2 },
  sectionSubtitle: { fontSize: 11, color: C.stone, marginTop: 1 },

  /* ── Card ── */
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: C.mist,
  },
  cardHeader:   { marginBottom: 12 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: C.dark },
  cardSubtitle: { fontSize: 11, color: C.stone, marginTop: 2 },
  chart:        { borderRadius: 10, alignSelf: 'center' },
  chartPlaceholder:     { height: 100, alignItems: 'center', justifyContent: 'center' },
  chartPlaceholderText: { color: C.stone, fontSize: 12 },

  /* ── Stat tiles ── */
  statGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statGridThree: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statTile: {
    width: (SW - 48 - 10) / 2,
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statTileWide:   { width: (SW - 48 - 20) / 3 },
  statTileTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  statTileIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, marginTop: 4,
  },
  statTileValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
  statTileLabel: { fontSize: 11, color: C.stone, fontWeight: '600' },

  /* ── Inline stat row ── */
  inlineStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  inlineDivider: { width: 1, height: 44, backgroundColor: C.mist },
  inlineStat:    { flex: 1, alignItems: 'center', gap: 4 },
  inlineIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inlineStatValue: { fontSize: 20, fontWeight: '900' },
  inlineStatLabel: { fontSize: 11, color: C.stone, fontWeight: '600' },

  /* ── Quick actions ── */
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  quickBtnIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  quickBtnLabel: { color: C.white, fontSize: 12, fontWeight: '700' },

  /* ── Rank items ── */
  rankItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.sand },
  rankBadge:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: 12, fontWeight: '800' },
  rankItemName:  { flex: 1, fontSize: 14, fontWeight: '600', color: C.dark },
  rankItemRight: { alignItems: 'flex-end' },
  rankItemCount: { fontSize: 15, fontWeight: '800' },
  rankItemUnit:  { fontSize: 10, color: C.stone },

  /* ── Export button ── */
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.forest, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  exportBtnIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: `${C.sage}30`, alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { color: C.white, fontSize: 13, fontWeight: '700', flex: 1 },

  /* ── Loading / Empty ── */
  loadingContainer: { paddingVertical: 80, alignItems: 'center' },
  loadingIconWrap:  { width: 80, height: 80, borderRadius: 24, backgroundColor: `${C.moss}15`, alignItems: 'center', justifyContent: 'center' },
  loadingText:      { marginTop: 14, color: C.stone, fontSize: 14 },
  emptyContainer:   { paddingVertical: 80, alignItems: 'center' },
  emptyIconWrap:    { width: 80, height: 80, borderRadius: 24, backgroundColor: C.mist, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:       { color: C.dark, fontSize: 18, fontWeight: '800' },
  emptySubtitle:    { marginTop: 6, color: C.stone, fontSize: 13 },

  /* ── User cards ── */
  userCard: {
    backgroundColor: C.white, borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  userCardStripe: { height: 3 },
  userCardTop:    { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarText:  { fontSize: 22, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: C.amber, borderRadius: 9,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.white,
  },
  userCardMeta:    { flex: 1 },
  userCardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  userCardName:    { fontSize: 15, fontWeight: '800', color: C.dark, flex: 1, marginRight: 6 },
  rolePill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rolePillText:    { fontSize: 10, fontWeight: '700' },
  userCardEmail:   { fontSize: 13, color: C.forest, marginBottom: 2, fontStyle: 'italic' },
  userCardInfo:    { fontSize: 11, color: C.stone },
  userCardDivider: { height: 1, backgroundColor: C.sand, marginHorizontal: 0 },
  userCardStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  statusLabel:   { fontSize: 12, fontWeight: '700' },
  lastLoginText: { fontSize: 11, color: C.stone },
  userCardActions: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 4, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  /* ── Progress legend ── */
  progressLegend: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingTop: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: C.mist, marginTop: 8,
  },
  progressLegendItem:  { flexDirection: 'column', alignItems: 'center', gap: 4 },
  progressLegendDot:   { width: 12, height: 12, borderRadius: 6 },
  progressLegendLabel: { fontSize: 12, fontWeight: '600', color: C.dark },
  progressLegendPct:   { fontSize: 13, fontWeight: '800' },

  /* ── Modals ── */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26,35,24,0.55)',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalContent: {
    backgroundColor: C.white, borderRadius: 20, padding: 24,
    width: '85%', maxWidth: 400,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: C.mist,
  },
  deactModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  modalHeaderIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle:       { fontSize: 18, fontWeight: '900', color: C.dark, letterSpacing: -0.3 },
  modalMessage:     { fontSize: 15, color: C.stone, lineHeight: 22, marginBottom: 20 },
  modalButtonRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  modalBtn:         { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel:   { backgroundColor: C.sand, borderWidth: 1, borderColor: C.mist },
  modalBtnCancelText:  { fontSize: 14, fontWeight: '700', color: C.stone },
  modalBtnConfirm:     { backgroundColor: C.moss },
  modalBtnConfirmText: { fontSize: 14, fontWeight: '700', color: C.white },

  /* ── Deactivation reason list ── */
  deactReasonList: { marginBottom: 20, gap: 8 },
  deactReasonItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: C.mist,
    backgroundColor: C.sand, gap: 10,
  },
  deactReasonItemSelected: { borderColor: C.danger, backgroundColor: `${C.danger}06` },
  deactReasonRadio: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: C.mist, backgroundColor: C.white,
  },
  deactReasonRadioSelected: { borderColor: C.danger, backgroundColor: C.danger },
  deactReasonText:         { flex: 1, fontSize: 13, color: C.stone, lineHeight: 18 },
  deactReasonTextSelected: { color: C.danger, fontWeight: '600' },

  /* Utility */
  mb0:  { marginBottom: 0 },
  mb8:  { marginBottom: 8 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
});