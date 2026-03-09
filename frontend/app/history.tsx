import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';

interface ScanRecord {
  _id: string;
  user_id?: string | null;
  mushroom_detected: boolean;
  detection_confidence: number;
  mushroom_type: string | null;
  classification_confidence: number | null;
  edibility: string | null;
  image_url: string | null;
  location: {
    region?: string;
    province?: string;
    city?: string;
  } | null;
  created_at: string;
  success: boolean;
  scanned_by?: string;
}

const isWeb = Platform.OS === 'web';

export default function HistoryScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'detected' | 'edible' | 'poisonous'>('all');
  const [scope, setScope] = useState<'mine' | 'universe'>('mine');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    console.log('DEBUG accessToken:', accessToken);
    fetchScanHistory();
  }, [scope, accessToken]);

  const fetchScanHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_URL}/toxicity/scans/history?limit=10000&scope=${scope}`, {
        headers,
      });

      const data = await response.json();

      if (data.success && data.scans) {
        setScans(data.scans);
      } else {
        throw new Error('Failed to fetch scan history');
      }
    } catch (err) {
      console.error('Error fetching scan history:', err);
      setError('Unable to load scan history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScanHistory();
  };

  const executeDeleteScan = async (scanId: string) => {
    setDeleteConfirmId(null);
    try {
      const response = await fetch(`${API_URL}/toxicity/scans/${scanId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const data = await response.json();
      if (data.success) {
        setScans(prev => prev.filter(s => s._id !== scanId));
      } else {
        Alert.alert('Error', data.message || 'Failed to delete scan.');
      }
    } catch {
      Alert.alert('Error', 'Failed to delete scan. Please try again.');
    }
  };

  const handleDeleteScan = (scanId: string) => {
    if (isWeb) {
      setDeleteConfirmId(scanId);
      return;
    }
    Alert.alert(
        'Delete Scan',
        'Remove this scan from your history? It will no longer appear in My Scans or Universe.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => executeDeleteScan(scanId) },
        ]
      );
  };

  const isDangerous = (edibility: string | null) => {
    if (!edibility) return false;
    const lower = edibility.toLowerCase();
    return lower.includes('poison') || lower.includes('toxic') || lower.includes('deadly') || lower.includes('dangerous');
  };

  const isEdible = (edibility: string | null) => {
    if (!edibility) return false;
    const lower = edibility.toLowerCase();
    return lower.includes('safe') || lower.includes('edible');
  };

  const getEdibilityColor = (edibility: string | null) => {
    if (!edibility) return '#999';
    if (isEdible(edibility)) return '#4CAF50';
    if (isDangerous(edibility)) return '#D32F2F';
    return '#FF9800';
  };

  const getEdibilityIcon = (edibility: string | null) => {
    if (!edibility) return 'help-circle';
    if (isEdible(edibility)) return 'checkmark-circle';
    if (isDangerous(edibility)) return 'alert-circle';
    return 'warning';
  };

  const formatDate = (dateString: string | Date | number | null | undefined) => {
    if (!dateString) return 'Unknown date';
    // Normalize Python isoformat quirks for JS Date:
    //  - +00:00 → Z  (Hermes doesn't parse +00:00)
    //  - 6-digit microseconds → 3-digit milliseconds (.387000 → .387)
    const normalized = typeof dateString === 'string'
      ? dateString.replace('+00:00', 'Z').replace(/(\.\d{3})\d+/, '$1')
      : dateString;
    const date = new Date(normalized as any);
    if (isNaN(date.getTime())) return 'Unknown date';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFilteredScans = () => {
    switch (activeFilter) {
      case 'detected': return scans.filter(s => s.mushroom_detected);
      case 'edible': return scans.filter(s => isEdible(s.edibility));
      case 'poisonous': return scans.filter(s => isDangerous(s.edibility));
      default: return scans;
    }
  };

  // ── MOBILE card renderer ──────────────────────────────────────────────────
          const renderScanCard = (scan: ScanRecord) => {

          
            const edibilityColor = getEdibilityColor(scan.edibility);
            const edibilityIcon = getEdibilityIcon(scan.edibility);

            // Log image_url for debugging
            console.log('History image_url:', scan.image_url);
          //const [imageError, setImageError] = useState(false);
            return (
              <TouchableOpacity
                key={scan._id}
                style={styles.scanCard}
                onPress={() => {
                  if (scan.mushroom_type) {
                    Alert.alert(
                      scan.mushroom_type,
                      `Confidence: ${((scan.classification_confidence || 0) * 100).toFixed(1)}%\n` +
                      `Edibility: ${scan.edibility || 'Unknown'}\n` +
                      `Location: ${scan.location?.region || 'Unknown'}`,
                      [{ text: 'OK' }]
                    );
                  }
                }}
      >
        <TouchableOpacity key={scan._id} style={styles.scanCard}>
      <View style={styles.imageContainer}>
        {scan.image_url ? (
          <Image
            source={{ uri: scan.image_url }}
            style={styles.scanImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.scanImage, styles.noImagePlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#CCC" />
          </View>
        )}
      </View>
    </TouchableOpacity>

        <View style={styles.scanInfo}>
          <View style={styles.scanHeader}>
            <ThemedText style={styles.mushroomName}>
              {scan.mushroom_type || 'No Mushroom Detected'}
            </ThemedText>
            <View style={styles.scanHeaderRight}>
              <ThemedText style={styles.scanDate}>{formatDate(scan.created_at)}</ThemedText>
              {scope === 'mine' && (
                <TouchableOpacity
                  onPress={() => handleDeleteScan(scan._id)}
                  style={styles.deleteMobileBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {scan.mushroom_detected && scan.classification_confidence !== null && (
            <View style={styles.confidenceRow}>
              <Ionicons name="analytics" size={14} color="#666" />
              <ThemedText style={styles.confidenceText}>
                {(scan.classification_confidence * 100).toFixed(1)}% confidence
              </ThemedText>
            </View>
          )}

          <View style={styles.edibilityRow}>
            <Ionicons name={edibilityIcon} size={16} color={edibilityColor} />
            <ThemedText style={[styles.edibilityText, { color: edibilityColor }]}>
              {scan.edibility ? scan.edibility.charAt(0).toUpperCase() + scan.edibility.slice(1) : 'Unknown'}
            </ThemedText>
          </View>


          <View style={styles.locationRow}>
            <Ionicons name="person-circle" size={14} color="#999" />
            <ThemedText style={styles.locationText}>
              Scanned by: {scan.scanned_by || (scope === 'mine' ? (user?.name || user?.username || user?.email || 'You') : 'Anonymous')}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── WEB grid card renderer ─────────────────────────────────────────────────
  const renderWebCard = (scan: ScanRecord) => {
    console.log('IMAGE URL:', scan.image_url);
    const edibilityColor = getEdibilityColor(scan.edibility);
    const edibilityIcon = getEdibilityIcon(scan.edibility);

    return (
      <TouchableOpacity
        key={scan._id}
        style={webStyles.gridCard}
        onPress={() => {
          if (scan.mushroom_type) {
            Alert.alert(
              scan.mushroom_type,
              `Confidence: ${((scan.classification_confidence || 0) * 100).toFixed(1)}%\n` +
              `Edibility: ${scan.edibility || 'Unknown'}\n`,
              [{ text: 'OK' }]
            );
          }
        }}
      >
        {/* Square image */}
        <View style={webStyles.cardImageWrap}>
          {scan.image_url ? (
            <Image source={{ uri: scan.image_url }} style={webStyles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[webStyles.cardImage, webStyles.cardImagePlaceholder]}>
              <Ionicons name="image-outline" size={36} color="#CCC" />
            </View>
          )}
          {/* Detection pill */}
          <View style={[webStyles.detectionPill, { backgroundColor: scan.mushroom_detected ? '#4CAF50' : '#D32F2F' }]}>
            <Ionicons name={scan.mushroom_detected ? 'checkmark' : 'close'} size={11} color="#FFF" />
            <Text style={webStyles.detectionPillText}>{scan.mushroom_detected ? 'Detected' : 'Not Detected'}</Text>
          </View>

          {/* Delete button — only in My Scans */}
          {scope === 'mine' && (
            <TouchableOpacity
              style={webStyles.deleteBtn}
              onPress={() => handleDeleteScan(scan._id)}
            >
              <Ionicons name="trash" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Card body */}
        <View style={webStyles.cardBody}>
          <Text style={webStyles.cardTitle} numberOfLines={1}>
            {scan.mushroom_type || 'No Mushroom Detected'}
          </Text>
          <Text style={webStyles.cardDate}>{formatDate(scan.created_at)}</Text>

          <View style={webStyles.cardDivider} />

          <View style={webStyles.cardRow}>
            <Ionicons name={edibilityIcon} size={14} color={edibilityColor} />
            <Text style={[webStyles.cardEdibility, { color: edibilityColor }]}>
              {scan.edibility ? scan.edibility.charAt(0).toUpperCase() + scan.edibility.slice(1) : 'Unknown'}
            </Text>
          </View>

          {scan.classification_confidence !== null && (
            <View style={webStyles.cardRow}>
              <Ionicons name="analytics" size={14} color="#888" />
              <Text style={webStyles.cardMeta}>
                {(scan.classification_confidence * 100).toFixed(1)}% confidence
              </Text>
            </View>
          )}

         

          <View style={webStyles.cardRow}>
            <Ionicons name="person-circle-outline" size={14} color="#aaa" />
            <Text style={webStyles.cardMeta} numberOfLines={1}>
              Scanned by: {scan.scanned_by || (scope === 'mine' ? (user?.name || user?.username || user?.email || 'You') : 'Anonymous')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Shared loading / error / empty states ──────────────────────────────────
  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#7BA05B" />
      <ThemedText style={styles.loadingText}>Loading your scan history...</ThemedText>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContent}>
      <Ionicons name="alert-circle" size={48} color="#D32F2F" />
      <ThemedText style={styles.errorText}>{error}</ThemedText>
      <TouchableOpacity style={styles.retryButton} onPress={fetchScanHistory}>
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.centerContent}>
      <Ionicons name="camera-outline" size={64} color="#CCC" />
      <ThemedText style={styles.emptyTitle}>No Scans Yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Start scanning mushrooms to see your history here!
      </ThemedText>
      <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/(tabs)/camera')}>
        <Ionicons name="camera" size={20} color="#FFF" />
        <ThemedText style={styles.scanButtonText}>Scan Mushroom</ThemedText>
      </TouchableOpacity>
    </View>
  );

  // ── WEB LAYOUT ─────────────────────────────────────────────────────────────
  if (isWeb) {
    const filtered = getFilteredScans();

    const filterOptions: { key: typeof activeFilter; label: string; icon: string }[] = [
      { key: 'all', label: 'All Scans', icon: 'list' },
      { key: 'detected', label: 'Detected', icon: 'checkmark-circle' },
      { key: 'edible', label: 'Edible', icon: 'leaf' },
      { key: 'poisonous', label: 'Poisonous', icon: 'warning' },
    ];

    return (
      <ThemedView style={webStyles.pageWrapper}>
        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <View style={webStyles.topHeader}>
          <View style={webStyles.headerLeft}>
            <HamburgerMenu />
            <NotificationDropdown iconColor="#7BA05B" />
            <Text style={webStyles.headerTitle}>Scan History</Text>
          </View>
          <TouchableOpacity style={webStyles.refreshBtn} onPress={handleRefresh} disabled={loading}>
            <Ionicons name="refresh" size={20} color="#7BA05B" />
            <Text style={webStyles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={webStyles.bodyRow}>
          {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
          <View style={webStyles.sidebar}>
            {/* Stats */}
            <View style={webStyles.sidebarSection}>
              <Text style={webStyles.sidebarHeading}>Overview</Text>
              <View style={webStyles.statBlock}>
                <Text style={webStyles.statBigNumber}>{scans.length}</Text>
                <Text style={webStyles.statBlockLabel}>Total Scans</Text>
              </View>
              <View style={webStyles.statRow}>
                <View style={[webStyles.miniStat, { borderColor: '#4CAF50' }]}>
                  <Text style={[webStyles.miniStatNum, { color: '#4CAF50' }]}>
                    {scans.filter(s => s.mushroom_detected).length}
                  </Text>
                  <Text style={webStyles.miniStatLabel}>Detected</Text>
                </View>
                <View style={[webStyles.miniStat, { borderColor: '#7BA05B' }]}>
                  <Text style={[webStyles.miniStatNum, { color: '#7BA05B' }]}>
                    {scans.filter(s => isEdible(s.edibility)).length}
                  </Text>
                  <Text style={webStyles.miniStatLabel}>Edible</Text>
                </View>
                <View style={[webStyles.miniStat, { borderColor: '#D32F2F' }]}>
                  <Text style={[webStyles.miniStatNum, { color: '#D32F2F' }]}>
                    {scans.filter(s => isDangerous(s.edibility)).length}
                  </Text>
                  <Text style={webStyles.miniStatLabel}>Toxic</Text>
                </View>
              </View>
            </View>

            {/* Scope Toggle: My Scans / Universe */}
            <View style={webStyles.sidebarSection}>
              <Text style={webStyles.sidebarHeading}>Source</Text>
              <View style={webStyles.scopeToggle}>
                <TouchableOpacity
                  style={[webStyles.scopeBtn, scope === 'mine' && webStyles.scopeBtnActive]}
                  onPress={() => setScope('mine')}
                >
                  <Ionicons name="person" size={15} color={scope === 'mine' ? '#fff' : '#7BA05B'} />
                  <Text style={[webStyles.scopeBtnText, scope === 'mine' && webStyles.scopeBtnTextActive]}>
                    My Scans
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[webStyles.scopeBtn, scope === 'universe' && webStyles.scopeBtnActive]}
                  onPress={() => setScope('universe')}
                >
                  <Ionicons name="globe" size={15} color={scope === 'universe' ? '#fff' : '#7BA05B'} />
                  <Text style={[webStyles.scopeBtnText, scope === 'universe' && webStyles.scopeBtnTextActive]}>
                    Universe
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters */}
            <View style={webStyles.sidebarSection}>
              <Text style={webStyles.sidebarHeading}>Filter</Text>
              {filterOptions.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[webStyles.filterBtn, activeFilter === f.key && webStyles.filterBtnActive]}
                  onPress={() => setActiveFilter(f.key)}
                >
                  <Ionicons
                    name={f.icon as any}
                    size={16}
                    color={activeFilter === f.key ? '#fff' : '#7BA05B'}
                  />
                  <Text style={[webStyles.filterBtnText, activeFilter === f.key && webStyles.filterBtnTextActive]}>
                    {f.label}
                  </Text>
                  <View style={[webStyles.filterCount, activeFilter === f.key && webStyles.filterCountActive]}>
                    <Text style={[webStyles.filterCountText, activeFilter === f.key && { color: '#7BA05B' }]}>
                      {f.key === 'all' ? scans.length
                        : f.key === 'detected' ? scans.filter(s => s.mushroom_detected).length
                        : f.key === 'edible' ? scans.filter(s => isEdible(s.edibility)).length
                        : scans.filter(s => isDangerous(s.edibility)).length}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity style={webStyles.sidebarScanBtn} onPress={() => router.push('/(tabs)/camera')}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={webStyles.sidebarScanBtnText}>New Scan</Text>
            </TouchableOpacity>
          </View>

          {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
          <ScrollView style={webStyles.mainArea} contentContainerStyle={webStyles.mainContent}>
            {loading && !refreshing && renderLoading()}
            {error && !loading && renderError()}
            {!loading && !error && scans.length === 0 && renderEmpty()}

            {!loading && !error && scans.length > 0 && (
              <>
                <View style={webStyles.contentHeader}>
                  <Text style={webStyles.contentTitle}>
                    {filtered.length} {filtered.length === 1 ? 'scan' : 'scans'}
                    {activeFilter !== 'all' ? ` · ${filterOptions.find(f => f.key === activeFilter)?.label}` : ''}
                  </Text>
                </View>

                {filtered.length === 0 ? (
                  <View style={webStyles.emptyFilter}>
                    <Ionicons name="search-outline" size={48} color="#CCC" />
                    <Text style={webStyles.emptyFilterText}>No scans match this filter.</Text>
                  </View>
                ) : (
                  <View style={webStyles.grid}>
                    {filtered.map(scan => renderWebCard(scan))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────── */}
        {deleteConfirmId !== null && (
          <View style={webStyles.deleteModalOverlay}>
            <View style={webStyles.deleteModalCard}>
              {/* Icon header */}
              <View style={webStyles.deleteModalIconWrap}>
                <Ionicons name="trash" size={28} color="#fff" />
              </View>

              <Text style={webStyles.deleteModalTitle}>Delete Scan?</Text>
              <Text style={webStyles.deleteModalBody}>
                This scan will be removed from your{' '}
                <Text style={{ fontWeight: '700' }}>My Scans</Text> and{' '}
                <Text style={{ fontWeight: '700' }}>Universe</Text> feeds.{`\n`}
                The record is kept in our database.
              </Text>

              <View style={webStyles.deleteModalActions}>
                <TouchableOpacity
                  style={webStyles.deleteModalCancelBtn}
                  onPress={() => setDeleteConfirmId(null)}
                >
                  <Text style={webStyles.deleteModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={webStyles.deleteModalConfirmBtn}
                  onPress={() => executeDeleteScan(deleteConfirmId)}
                >
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={webStyles.deleteModalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ThemedView>
    );
  }

  // ── MOBILE LAYOUT (untouched) ───────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HamburgerMenu />
          <NotificationDropdown iconColor="#7BA05B" />
        </View>
        <ThemedText style={styles.headerTitle}>Scan History</ThemedText>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
          <Ionicons name="refresh" size={24} color="#7BA05B" />
        </TouchableOpacity>
      </View>

      {/* Scope Toggle */}
      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.scopeTabBtn, scope === 'mine' && styles.scopeTabBtnActive]}
          onPress={() => setScope('mine')}
        >
          <Ionicons name="person" size={16} color={scope === 'mine' ? '#fff' : '#7BA05B'} />
          <ThemedText style={[styles.scopeTabText, scope === 'mine' && styles.scopeTabTextActive]}>My Scans</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeTabBtn, scope === 'universe' && styles.scopeTabBtnActive]}
          onPress={() => setScope('universe')}
        >
          <Ionicons name="globe" size={16} color={scope === 'universe' ? '#fff' : '#7BA05B'} />
          <ThemedText style={[styles.scopeTabText, scope === 'universe' && styles.scopeTabTextActive]}>Universe</ThemedText>
        </TouchableOpacity>
      </View>

      {loading && !refreshing && renderLoading()}
      {error && !loading && renderError()}
      {!loading && !error && scans.length === 0 && renderEmpty()}

      {!loading && !error && scans.length > 0 && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#7BA05B']} />
          }
        >
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{scans.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Scans</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{scans.filter(s => s.mushroom_detected).length}</ThemedText>
              <ThemedText style={styles.statLabel}>Detected</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {scans.filter(s => isEdible(s.edibility)).length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Edible</ThemedText>
            </View>
          </View>

          <View style={styles.scanList}>
            {scans.map(scan => renderScanCard(scan))}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

// ── WEB STYLES ─────────────────────────────────────────────────────────────────
const webStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#F2F4F0',
    height: '100%' as any,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3E2D',
    marginLeft: 4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#7BA05B',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7BA05B',
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    height: '100%' as any,
    overflow: 'hidden' as any,
  },
  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    width: 260,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E8E4DE',
    padding: 20,
    gap: 8,
    position: 'sticky' as any,
    top: 0,
    alignSelf: 'flex-start',
    height: '100vh' as any,
    overflowY: 'auto' as any,
  },
  sidebarSection: {
    marginBottom: 24,
  },
  sidebarHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as any,
    marginBottom: 12,
  },
  statBlock: {
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  statBigNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#7BA05B',
    lineHeight: 48,
  },
  statBlockLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
  },
  miniStatNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: '#7BA05B',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    flex: 1,
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: '#F0EDE8',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filterCountActive: {
    backgroundColor: '#fff',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },

  /* ── Scope Toggle ── */
  scopeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden' as any,
    borderWidth: 1.5,
    borderColor: '#7BA05B',
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  scopeBtnActive: {
    backgroundColor: '#7BA05B',
  },
  scopeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7BA05B',
  },
  scopeBtnTextActive: {
    color: '#fff',
  },

  sidebarScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7BA05B',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  sidebarScanBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // ── Main content area ──────────────────────────────────────────────────────
  mainArea: {
    flex: 1,
    height: '100vh' as any,
  },
  mainContent: {
    padding: 28,
    paddingTop: 20,
  },
  contentHeader: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  emptyFilter: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyFilterText: {
    fontSize: 15,
    color: '#bbb',
  },
  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  gridCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAE8E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F3EF',
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detectionPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#D32F2F',
    borderRadius: 20,
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3E2D',
  },
  cardDate: {
    fontSize: 11,
    color: '#bbb',
    marginBottom: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0EDE8',
    marginVertical: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  cardEdibility: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },

  // ── Delete confirm modal ───────────────────────────────────────────────────
  deleteModalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  deleteModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 28,
    width: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  deleteModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteModalBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%' as any,
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── MOBILE STYLES (untouched) ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E2D',
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7BA05B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3E2D',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7BA05B',
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7BA05B',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E4DE',
    marginHorizontal: 12,
  },
  scanList: {
    gap: 12,
  },
  scanCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  scanImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F3EF',
  },
  noImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  scanHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteMobileBtn: {
    padding: 2,
  },
  mushroomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E2D',
    flex: 1,
    marginRight: 8,
  },
  scanDate: {
    fontSize: 11,
    color: '#999',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  edibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  edibilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#999',
  },
  scopeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  scopeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  scopeTabBtnActive: {
    backgroundColor: '#7BA05B',
  },
  scopeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7BA05B',
  },
  scopeTabTextActive: {
    color: '#FFF',
  },
});