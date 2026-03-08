import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth, api } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import * as ImagePicker from 'expo-image-picker';

type EditMode = 'none' | 'name' | 'password';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'snapshroom';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* ─── Design Tokens — aligned with LandingPage / AboutPage / Admin ─── */
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
  danger:  '#C94040',
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addLog = (message: string) => { console.log(message); };

  const [newName, setNewName] = useState(user?.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

  if (!user) {
    return (
      <ThemedView style={s.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  /* ── All functions below are UNCHANGED ── */

  const handleUpdateName = async () => {
    if (!newName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    if (newName.trim() === user.name) { Alert.alert('Info', 'Please enter a different name'); return; }
    setLoading(true);
    try {
      const response = await api.put('/auth/update-name', { name: newName.trim() });
      if (response.data.success) {
        showToast('Name updated successfully', 'success');
        await refreshUser();
        setEditMode('none');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update name');
    } finally { setLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) { Alert.alert('Error', 'All fields are required'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const response = await api.put('/auth/update-password', { oldPassword, newPassword, confirmPassword });
      if (response.data.success) {
        showToast('Password updated successfully', 'success');
        await refreshUser();
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        setEditMode('none');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { try { await logout(); } catch { Alert.alert('Error', 'Failed to logout'); } } },
    ]);
  };

  const uploadProfileImage = async () => {
    try {
      setUploadError(null);
      addLog('Starting avatar upload process...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Please allow access to your photos'); return; }
      addLog('✅ Media library permission granted');
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
      if (result.canceled) { addLog('Image selection cancelled by user'); return; }
      addLog('✅ Image selected');
      let base64String = '';
      const resultWithBase64 = result as any;
      if (resultWithBase64.base64) {
        base64String = resultWithBase64.base64;
      } else if (resultWithBase64.assets && resultWithBase64.assets.length > 0) {
        const asset = resultWithBase64.assets[0];
        if (asset.base64) {
          base64String = asset.base64;
        } else if (asset.uri) {
          try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            base64String = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => { const r = reader.result as string; resolve(r.includes(',') ? r.split(',')[1] : r); };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (conversionError: any) {
            const msg = `Failed to convert asset URI: ${conversionError.message}`;
            setUploadError(msg); Alert.alert('Error', msg); return;
          }
        }
      } else if (resultWithBase64.uri) {
        try {
          const response = await fetch(resultWithBase64.uri);
          const blob = await response.blob();
          base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => { const r = reader.result as string; resolve(r.includes(',') ? r.split(',')[1] : r); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (conversionError: any) {
          const msg = `Failed to convert image: ${conversionError.message}`;
          setUploadError(msg); Alert.alert('Error', msg); return;
        }
      }
      if (!base64String) { const msg = `Failed to get image data.`; setUploadError(msg); Alert.alert('Error', msg); return; }
      setUploading(true);
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) { const msg = 'Cloudinary configuration missing.'; setUploadError(msg); Alert.alert('Error', msg); setUploading(false); return; }
      try {
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blobData = new Blob([bytes], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', blobData, 'profile.jpg');
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'snapshroom/profiles');
        formData.append('tags', 'profile,user');
        const response = await fetch(CLOUDINARY_API_URL, { method: 'POST', body: formData });
        if (!response.ok) { const errorText = await response.text(); const msg = `Cloudinary upload failed: ${response.status} - ${errorText}`; setUploadError(msg); throw new Error(msg); }
        const cloudinaryData = await response.json();
        const imageUrl = cloudinaryData.secure_url;
        setProfileImage(imageUrl);
        try {
          const mongoResponse = await api.put('/auth/update-profile-image', { profileImage: imageUrl }, { timeout: 30000 });
          if (mongoResponse.data.success) { await refreshUser(); showToast('Profile picture updated!', 'success'); }
          else { setUploadError(mongoResponse.data.message || 'Unknown error from backend'); }
        } catch (mongoError: any) {
          const message = mongoError.response?.data?.message || mongoError.message || 'Failed to save profile picture to database';
          setUploadError(message); Alert.alert('Warning', message);
        }
      } catch (blobError: any) { const message = blobError.message || 'Failed to process image upload'; setUploadError(message); Alert.alert('Error', message); }
    } catch (error: any) { const message = error.message || 'Failed to upload profile picture'; setUploadError(message); Alert.alert('Error', message); }
    finally { setUploading(false); }
  };

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: () => {
        Alert.prompt('Confirm Password', 'Enter your password to confirm account deletion:', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async (password: string | undefined) => {
            if (!password || !password.trim()) { Alert.alert('Error', 'Password is required'); return; }
            setLoading(true);
            try {
              const response = await api.delete('/auth/delete-account', { data: { password } });
              if (response.data.success) { Alert.alert('Success', 'Account deleted successfully', [{ text: 'OK', onPress: async () => { await logout(); } }]); }
            } catch (error: any) { Alert.alert('Error', error.response?.data?.message || 'Failed to delete account'); }
            finally { setLoading(false); }
          }},
        ], 'secure-text');
      }},
    ]);
  };

  /* ── Render ── */
  const initials = user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <ThemedView style={s.container}>

      {/* ── NAVBAR — matches LandingPage / AboutPage / Admin ── */}
      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <HamburgerMenu />
          <NotificationDropdown iconColor={C.sage} />
        </View>
        <View style={s.topHeaderCenter}>
          <View style={s.topHeaderLogoWrap}>
            <Ionicons name="leaf" size={18} color={C.white} />
          </View>
          <ThemedText style={s.topHeaderTitle}>SnapShroom</ThemedText>
        </View>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── HERO / AVATAR ── */}
        <View style={s.heroSection}>
          {/* Background decoration */}
          <View style={s.heroBgCircle1} />
          <View style={s.heroBgCircle2} />

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatarRing}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={s.avatarImage} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <ThemedText style={s.avatarInitials}>{initials}</ThemedText>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.cameraBtn} onPress={uploadProfileImage} disabled={uploading} activeOpacity={0.85}>
              {uploading ? <ActivityIndicator color={C.white} size="small" /> : <Ionicons name="camera" size={16} color={C.white} />}
            </TouchableOpacity>
          </View>

          <ThemedText style={s.heroName}>{user.name}</ThemedText>
          <ThemedText style={s.heroEmail}>{user.email}</ThemedText>

          {/* Role badge */}
          <View style={[s.roleBadge, user.role === 'admin' && s.roleBadgeAdmin]}>
            <Ionicons name={user.role === 'admin' ? 'shield-checkmark' : 'person'} size={12} color={user.role === 'admin' ? C.amber : C.moss} />
            <ThemedText style={[s.roleBadgeText, user.role === 'admin' && s.roleBadgeTextAdmin]}>
              {user.role === 'admin' ? 'Admin' : 'User'}
            </ThemedText>
          </View>
        </View>

        {/* ── UPLOAD ERROR ── */}
        {uploadError && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={18} color={C.danger} />
            <ThemedText style={s.errorText}>{uploadError}</ThemedText>
            <TouchableOpacity onPress={() => setUploadError(null)}>
              <Ionicons name="close" size={18} color={C.stone} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── PROFILE INFORMATION ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="person-outline" size={13} color={C.moss} />
            </View>
            <ThemedText style={s.sectionTitle}>Profile Information</ThemedText>
          </View>

          {editMode !== 'name' ? (
            <View style={s.card}>
              {/* Name row */}
              <View style={s.infoRow}>
                <View style={s.infoRowLeft}>
                  <View style={[s.infoIconWrap, { backgroundColor: `${C.moss}15` }]}>
                    <Ionicons name="person-outline" size={16} color={C.moss} />
                  </View>
                  <View>
                    <ThemedText style={s.infoLabel}>Name</ThemedText>
                    <ThemedText style={s.infoValue}>{user.name}</ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.inlineEditBtn}
                  onPress={() => { setNewName(user.name); setEditMode('name'); }}
                >
                  <Ionicons name="pencil" size={14} color={C.moss} />
                  <ThemedText style={s.inlineEditBtnText}>Edit</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={s.cardDivider} />

              {/* Email row */}
              <View style={s.infoRow}>
                <View style={s.infoRowLeft}>
                  <View style={[s.infoIconWrap, { backgroundColor: `${C.amber}15` }]}>
                    <Ionicons name="mail-outline" size={16} color={C.amber} />
                  </View>
                  <View>
                    <ThemedText style={s.infoLabel}>Email</ThemedText>
                    <ThemedText style={s.infoValue}>{user.email}</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* ── Edit Name ── */
            <View style={s.editCard}>
              <ThemedText style={s.editLabel}>New Name</ThemedText>
              <TextInput
                style={s.input}
                placeholder="Enter new name"
                placeholderTextColor={C.stone}
                value={newName}
                onChangeText={setNewName}
                editable={!loading}
              />
              <View style={s.btnRow}>
                <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={() => { setEditMode('none'); setNewName(user.name); }} disabled={loading}>
                  <ThemedText style={s.btnCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnSave]} onPress={handleUpdateName} disabled={loading}>
                  {loading ? <ActivityIndicator color={C.white} size="small" /> : <ThemedText style={s.btnSaveText}>Save</ThemedText>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── SECURITY ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="shield-outline" size={13} color={C.moss} />
            </View>
            <ThemedText style={s.sectionTitle}>Security</ThemedText>
          </View>

          {editMode !== 'password' ? (
            <TouchableOpacity
              style={s.securityRow}
              onPress={() => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setShowPasswords({ old: false, new: false, confirm: false }); setEditMode('password'); }}
              activeOpacity={0.8}
            >
              <View style={[s.infoIconWrap, { backgroundColor: `${C.forest}15` }]}>
                <Ionicons name="lock-closed-outline" size={16} color={C.forest} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={s.securityTitle}>Change Password</ThemedText>
                <ThemedText style={s.securitySubtitle}>Update your password regularly for security</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.stone} />
            </TouchableOpacity>
          ) : (
            /* ── Edit Password ── */
            <View style={s.editCard}>
              {[
                { label: 'Current Password', value: oldPassword, onChange: setOldPassword, show: showPasswords.old, toggle: () => setShowPasswords(p => ({ ...p, old: !p.old })) },
                { label: 'New Password',     value: newPassword, onChange: setNewPassword, show: showPasswords.new, toggle: () => setShowPasswords(p => ({ ...p, new: !p.new })) },
                { label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword, show: showPasswords.confirm, toggle: () => setShowPasswords(p => ({ ...p, confirm: !p.confirm })) },
              ].map((field, i) => (
                <View key={i}>
                  {i > 0 && <View style={{ height: 12 }} />}
                  <ThemedText style={s.editLabel}>{field.label}</ThemedText>
                  <View style={s.passwordInputRow}>
                    <TextInput
                      style={s.passwordInput}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={C.stone}
                      value={field.value}
                      onChangeText={field.onChange}
                      secureTextEntry={!field.show}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={field.toggle} style={s.eyeBtn}>
                      <Ionicons name={field.show ? 'eye' : 'eye-off'} size={18} color={C.stone} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={s.btnRow}>
                <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={() => setEditMode('none')} disabled={loading}>
                  <ThemedText style={s.btnCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnSave]} onPress={handleUpdatePassword} disabled={loading}>
                  {loading ? <ActivityIndicator color={C.white} size="small" /> : <ThemedText style={s.btnSaveText}>Update</ThemedText>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── DANGER ZONE ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconWrap, { backgroundColor: `${C.danger}15` }]}>
              <Ionicons name="warning-outline" size={13} color={C.danger} />
            </View>
            <ThemedText style={[s.sectionTitle, { color: C.danger }]}>Account Actions</ThemedText>
          </View>

          <TouchableOpacity style={s.dangerBtn} onPress={handleLogout} activeOpacity={0.85}>
            <View style={[s.dangerBtnIcon, { backgroundColor: `${C.danger}12` }]}>
              <Ionicons name="log-out-outline" size={18} color={C.danger} />
            </View>
            <ThemedText style={s.dangerBtnText}>Logout</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.danger} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.dangerBtn, { marginTop: 10 }]} onPress={handleDeleteAccount} disabled={loading} activeOpacity={0.85}>
            <View style={[s.dangerBtnIcon, { backgroundColor: `${C.danger}12` }]}>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </View>
            <ThemedText style={s.dangerBtnText}>Delete Account</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <ThemedText style={s.footerText}>SnapShroom · Safe Mushroom Identification 🍄</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   STYLES — aligned with LandingPage / AboutPage / Admin tokens
═════════════════════════════════════════════════════════════════════════════*/
const s = StyleSheet.create({

  container: { flex: 1, backgroundColor: C.cream },
  scrollContent: { paddingBottom: 40 },

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
  topHeaderLogoWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center' },
  topHeaderTitle:  { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.5 },

  /* ── Hero ── */
  heroSection: {
    backgroundColor: C.forest, alignItems: 'center',
    paddingTop: 40, paddingBottom: 36, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  heroBgCircle1: { position: 'absolute', top: -60, right: -60,  width: 220, height: 220, borderRadius: 110, backgroundColor: `${C.sage}18` },
  heroBgCircle2: { position: 'absolute', bottom: -40, left: -50, width: 160, height: 160, borderRadius: 80,  backgroundColor: `${C.moss}18` },

  avatarWrap:     { position: 'relative', marginBottom: 16 },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 3, borderColor: `${C.sage}60`,
    overflow: 'hidden',
  },
  avatarImage:    { width: '100%', height: '100%' },
  avatarPlaceholder: {
    flex: 1, backgroundColor: `${C.moss}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 36, fontWeight: '900', color: C.sage, letterSpacing: -1 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.forest,
  },
  heroName:  { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5, marginBottom: 4 },
  heroEmail: { fontSize: 13, color: `${C.white}70`, marginBottom: 12 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${C.moss}25`, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: `${C.moss}40`,
  },
  roleBadgeAdmin: { backgroundColor: `${C.amber}20`, borderColor: `${C.amber}40` },
  roleBadgeText:      { fontSize: 12, fontWeight: '700', color: C.sage },
  roleBadgeTextAdmin: { color: C.amber },

  /* ── Error Box ── */
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: `${C.danger}08`, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: `${C.danger}25`,
  },
  errorText: { flex: 1, fontSize: 13, color: C.danger, lineHeight: 20 },

  /* ── Section ── */
  section: {
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: `${C.moss}15`, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.2 },

  /* ── Info Card ── */
  card: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: C.stone, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700', color: C.dark },
  cardDivider: { height: 1, backgroundColor: C.sand, marginHorizontal: 0 },
  inlineEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${C.moss}12`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: `${C.moss}25`,
  },
  inlineEditBtnText: { fontSize: 12, color: C.moss, fontWeight: '700' },

  /* ── Edit Card ── */
  editCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  editLabel: { fontSize: 11, color: C.stone, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.mist,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.dark, marginBottom: 8,
  },
  passwordInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.mist,
    borderRadius: 10, paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.dark },
  eyeBtn: { padding: 4 },

  /* ── Buttons ── */
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn:         { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel:   { backgroundColor: C.sand, borderWidth: 1, borderColor: C.mist },
  btnSave:     { backgroundColor: C.moss },
  btnCancelText: { fontSize: 14, fontWeight: '700', color: C.stone },
  btnSaveText:   { fontSize: 14, fontWeight: '700', color: C.white },

  /* ── Security Row ── */
  securityRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  securityTitle:    { fontSize: 14, fontWeight: '700', color: C.dark, marginBottom: 3 },
  securitySubtitle: { fontSize: 12, color: C.stone },

  /* ── Danger Zone ── */
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: `${C.danger}20`,
    shadowColor: C.danger, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  dangerBtnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: C.danger },

  /* ── Footer ── */
  footer: { alignItems: 'center', paddingVertical: 24, paddingTop: 32 },
  footerText: { fontSize: 12, color: C.stone },
});