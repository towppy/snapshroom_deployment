import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Linking,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ─── DESIGN TOKENS (matching LandingPage) ────────────────────────────────────
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
};
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40, xxxl: 64 };

// ─── DATA ─────────────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { id: 1, name: 'Famini, Cristel Kate M.', role: 'Developer', image: require('@/assets/images/cristel.png'),  bio: 'cristelkate.famini@tup.edu.ph' },
  { id: 2, name: 'Garcia, Aia A.',           role: 'Developer', image: require('@/assets/images/aia.jpg'),      bio: 'aia.garcia@tup.edu.ph' },
  { id: 3, name: 'Rosario, Jerome Steven S.',role: 'Developer', image: require('@/assets/images/jerome.png'),   bio: 'jeromesteven.rosario@tup.edu.ph' },
  { id: 4, name: 'Tolin, Ernesto III M.',    role: 'Developer', image: require('@/assets/images/ernesto.png'),  bio: 'ernestoiii.tolin@tup.edu.ph' },
];

const ADVISER = {
  name: 'Madriaga, Pops V.',
  role: 'Adviser',
  image: require('@/assets/images/adviser.png'),
  bio: 'pops_madriaga@tup.edu.ph',
  accent: C.amber,
};

const TECHNICAL_ADVISER = {
  name: 'Motol, Ian Jasper',
  role: 'Technical Adviser',
  image: null,
  bio: 'ianjasper.motol@tup.edu.ph',
  accent: '#4DA6FF',
};

const FEATURES = [
  { icon: 'camera',      title: 'ML Recognition', desc: 'Snap a picture and get instant species identification using advanced machine learning algorithms trained on thousands of mushroom images.',       accent: C.moss   },
  { icon: 'flask',       title: 'Toxicity Info',  desc: 'Comprehensive edibility and toxicity data for every identified species so you can make safe, informed decisions in the field.',                  accent: C.coral  },
  { icon: 'map',         title: 'Habitat Data',   desc: 'Insights into natural habitats, regions, and environmental conditions — supporting ecological understanding and foraging safety.',              accent: '#7B6FD4' },
  { icon: 'bar-chart',   title: 'Risk Analysis',  desc: 'Combines species data and toxicity levels to evaluate potential risks, guiding safe practices for enthusiasts and foragers alike.',             accent: C.amber  },
];

const TECH = [
  { name: 'React Native', icon: 'logo-react' },
  { name: 'Python Flask', icon: 'logo-python' },
  { name: 'ML / YOLO',    icon: 'hardware-chip' },
  { name: 'PyTorch',      icon: 'flash' },
  { name: 'MongoDB',      icon: 'server' },
];

// ─── FLOATING MUSHROOM DECORATION ────────────────────────────────────────────
const FloatingMushroom = ({ size = 40, delay = 0, capColor = C.coral }: { size?: number; delay?: number; capColor?: string }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(floatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: floatAnim.interpolate({ inputRange: [0,1], outputRange: [0,-10] }) }] }}>
      <View style={{ width: size * 0.85, height: size * 0.55, backgroundColor: capColor, borderRadius: size * 0.5, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, overflow: 'hidden' }}>
        <LinearGradient colors={['rgba(255,255,255,0.3)','transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', borderRadius: size * 0.5 }} />
        {[{t:'20%',l:'18%',s:0.12},{t:'35%',r:'22%',s:0.09},{t:'10%',r:'38%',s:0.08}].map((sp,i)=>(
          <View key={i} style={{ position:'absolute', width: size*sp.s, height: size*sp.s, borderRadius: 999, backgroundColor:'rgba(255,255,255,0.55)', top: sp.t as any, left: (sp as any).l, right: (sp as any).r }} />
        ))}
      </View>
      <View style={{ width: size * 0.32, height: size * 0.55, backgroundColor: '#E8D5B0', borderRadius: size * 0.18, marginTop: -4 }} />
    </Animated.View>
  );
};

// ─── SECTION BADGE ────────────────────────────────────────────────────────────
const SectionBadge = ({ icon, label }: { icon: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: `${C.moss}18`, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: 999, alignSelf: 'flex-start', marginBottom: SP.md }}>
    <Ionicons name={icon as any} size={14} color={C.moss} />
    <Text style={{ color: C.moss, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</Text>
  </View>
);

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, accent, isWide }: { icon: string; title: string; desc: string; accent: string; isWide: boolean }) => (
  <View style={{
    flex: 1, minWidth: isWide ? 220 : '100%',
    backgroundColor: C.white, borderRadius: 20, padding: SP.xl,
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  }}>
    <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
      <Ionicons name={icon as any} size={26} color={accent} />
    </View>
    <Text style={{ fontSize: 16, fontWeight: '800', color: C.dark, marginBottom: SP.sm }}>{title}</Text>
    <Text style={{ fontSize: 14, color: C.stone, lineHeight: 22 }}>{desc}</Text>
  </View>
);

// ─── VM CARD ──────────────────────────────────────────────────────────────────
const VMCard = ({ icon, title, desc, accent, isWide }: { icon: string; title: string; desc: string; accent: string; isWide: boolean }) => (
  <View style={{
    flex: 1, minWidth: isWide ? 280 : '100%',
    backgroundColor: C.white, borderRadius: 20, padding: SP.xl,
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.lg }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={26} color={accent} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '900', color: C.dark, letterSpacing: -0.5 }}>{title}</Text>
    </View>
    <Text style={{ fontSize: 14, color: C.stone, lineHeight: 24 }}>{desc}</Text>
  </View>
);

// ─── TEAM CARD ────────────────────────────────────────────────────────────────
const TeamCard = ({ member, accent = C.moss, isWide }: { member: any; accent?: string; isWide: boolean }) => (
  <View style={{
    flex: 1, minWidth: isWide ? 260 : '100%',
    backgroundColor: C.white, borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1, borderColor: C.mist,
    shadowColor: C.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  }}>
    {/* Top accent bar */}
    <View style={{ height: 4, backgroundColor: accent }} />
    <View style={{ padding: SP.xl, flexDirection: 'row', alignItems: 'center', gap: SP.lg }}>
      {/* Avatar */}
      <View style={{ width: isWide ? 72 : 60, height: isWide ? 72 : 60, borderRadius: isWide ? 36 : 30, overflow: 'hidden', borderWidth: 3, borderColor: `${accent}40`, flexShrink: 0 }}>
        {member.image ? (
          <Image source={member.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, backgroundColor: C.mist, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={isWide ? 36 : 28} color={C.stone} />
          </View>
        )}
      </View>
      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isWide ? 15 : 14, fontWeight: '800', color: C.dark, marginBottom: 4, lineHeight: 20 }}>{member.name}</Text>
        <Text style={{ fontSize: 12, color: C.sage, fontWeight: '600', marginBottom: SP.sm, fontStyle: 'italic' }} numberOfLines={1} ellipsizeMode="tail">{member.bio}</Text>
        <View style={{ backgroundColor: `${accent}18`, paddingHorizontal: SP.md, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 11, color: accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>{member.role}</Text>
        </View>
      </View>
    </View>
  </View>
);

// ─── TECH CHIP ────────────────────────────────────────────────────────────────
const TechChip = ({ name, icon }: { name: string; icon: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.white, paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: 12, borderWidth: 1, borderColor: C.mist }}>
    <Ionicons name={icon as any} size={16} color={C.moss} />
    <Text style={{ fontSize: 13, color: C.forest, fontWeight: '700' }}>{name}</Text>
  </View>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AboutPage() {
  const isWide = isWeb && width >= 768;
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const headerBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(26,35,24,0)', 'rgba(26,35,24,0.97)'],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StatusBar barStyle="light-content" />

      {/* ── FLOATING NAVBAR ── */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: headerBg,
        paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'android' ? 32 : 20,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: isWide ? SP.xxxl : SP.xl, paddingVertical: SP.md,
        }}>
          <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'center' }}>
            <HamburgerMenu />
            <NotificationDropdown iconColor={C.sage} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="leaf" size={18} color={C.white} />
            </View>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>SnapShroom</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: C.dark, overflow: 'hidden', minHeight: isWide ? 380 : 320 }}>
          {/* Background pattern */}
          <LinearGradient
            colors={['rgba(74,124,71,0.25)', 'transparent', 'rgba(45,74,42,0.4)']}
            style={{ position: 'absolute', inset: 0 }}
          />
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: `${C.moss}18` }} />
          <View style={{ position: 'absolute', bottom: -40, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: `${C.sage}12` }} />

          <View style={{
            flexDirection: isWide ? 'row' : 'column',
            alignItems: 'center',
            paddingTop: isWide ? 100 : 110,
            paddingBottom: isWide ? SP.xxxl : SP.xxl,
            paddingHorizontal: isWide ? SP.xxxl : SP.xl,
            gap: isWide ? SP.xxxl : SP.xl,
          }}>
            {/* Left: text */}
            <Animated.View style={{
              flex: isWide ? 1 : undefined,
              opacity: headerAnim,
              transform: [{ translateX: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-30,0] }) }],
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.lg }}>
                <View style={{ width: 28, height: 2, backgroundColor: C.amber }} />
                <Text style={{ color: C.amber, fontSize: 12, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase' }}>
                  Meet the Team
                </Text>
              </View>
              <Text style={{ color: C.white, fontSize: isWide ? 52 : 36, fontWeight: '900', lineHeight: isWide ? 60 : 44, letterSpacing: -1.5, marginBottom: SP.lg }}>
                About{'\n'}<Text style={{ color: C.sage }}>SnapShroom</Text>
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: isWide ? 17 : 15, lineHeight: 26, maxWidth: 480 }}>
                Machine Learning-powered mushroom identification for enthusiasts, foragers, and professional mycologists.
              </Text>
            </Animated.View>

            {/* Right: mushroom cluster */}
            <Animated.View style={{
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
              flexDirection: 'row', alignItems: 'flex-end', gap: SP.md,
            }}>
              <FloatingMushroom size={isWide ? 70 : 55} delay={0} capColor={C.coral} />
              <FloatingMushroom size={isWide ? 90 : 72} delay={400} capColor="#E8A870" />
              <FloatingMushroom size={isWide ? 65 : 50} delay={800} capColor={C.sage} />
            </Animated.View>
          </View>

          {/* Curved bottom */}
          <View style={{ height: 50, backgroundColor: C.cream, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}>
            <LinearGradient colors={[C.dark, C.cream]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30 }} />
          </View>
        </View>

        {/* ══════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, paddingTop: SP.xl }}>
          <View style={{ maxWidth: isWide ? 1200 : undefined, alignSelf: isWide ? 'center' : undefined, width: '100%' }}>

            {/* ── ABOUT THE APP ── */}
            <View style={{ marginBottom: SP.xxxl }}>
              <SectionBadge icon="information-circle-outline" label="About the App" />
              <View style={{
                backgroundColor: C.white, borderRadius: 20, padding: SP.xl,
                borderWidth: 1, borderColor: C.mist,
                borderLeftWidth: 4, borderLeftColor: C.sage,
                shadowColor: C.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
              }}>
                <Text style={{ fontSize: isWide ? 16 : 15, color: C.stone, lineHeight: 28 }}>
                  SnapShroom is a smart, user-friendly app designed for mushroom enthusiasts, amateur foragers, and professional mycologists. Leveraging advanced machine learning and computer vision, the app can identify mushrooms from photos in real-time, providing accurate species information and assessing edibility and toxicity levels.
                </Text>
              </View>
            </View>

            {/* ── KEY FEATURES ── */}
            <View style={{ marginBottom: SP.xxxl }}>
              <SectionBadge icon="sparkles-outline" label="Key Features" />
              <Text style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: SP.xl }}>
                What SnapShroom Does
              </Text>
              <View style={{ flexDirection: isWide ? 'row' : 'column', flexWrap: isWide ? 'wrap' : 'nowrap', gap: SP.lg }}>
                {FEATURES.map((f, i) => <FeatureCard key={i} {...f} isWide={isWide} />)}
              </View>
            </View>

            {/* ── VISION & MISSION ── */}
            <View style={{ backgroundColor: C.sand, borderRadius: isWide ? 28 : 20, padding: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
              <SectionBadge icon="telescope-outline" label="Vision & Mission" />
              <Text style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: SP.xl }}>
                Our Purpose
              </Text>
              <View style={{ flexDirection: isWide ? 'row' : 'column', gap: SP.lg }}>
                <VMCard
                  icon="bulb-outline" title="Our Vision" accent={C.amber} isWide={isWide}
                  desc="To become the Philippines' most trusted platform for mycological knowledge, transforming how Filipinos interact with mushrooms in local forests, farms, and communities. We envision a future where advanced ML makes expert-level identification accessible to everyone — from professional mycologists to nature enthusiasts."
                />
                <VMCard
                  icon="flag-outline" title="Our Mission" accent="#4DA6FF" isWide={isWide}
                  desc="To empower individuals and communities with accurate, real-time mushroom identification and comprehensive safety assessment tools through machine learning. We are committed to continuously improving our algorithms to provide the most reliable mushroom identification system available."
                />
              </View>
            </View>

            {/* ── DEVELOPMENT TEAM ── */}
            <View style={{ marginBottom: SP.xxxl }}>
              <SectionBadge icon="people-outline" label="Development Team" />
              <Text style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: SP.xl }}>
                The People Behind SnapShroom
              </Text>
              <View style={{ flexDirection: isWide ? 'row' : 'column', flexWrap: isWide ? 'wrap' : 'nowrap', gap: SP.lg, marginBottom: SP.xxl }}>
                {TEAM_MEMBERS.map(m => <TeamCard key={m.id} member={m} isWide={isWide} />)}
              </View>

              {/* Advisers */}
              <View style={{
                backgroundColor: C.sand, borderRadius: isWide ? 24 : 18,
                padding: isWide ? SP.xxl : SP.xl,
              }}>
                <SectionBadge icon="school-outline" label="Project Advisers" />
                <View style={{ flexDirection: isWide ? 'row' : 'column', gap: SP.lg }}>
                  <TeamCard member={ADVISER} accent={C.amber} isWide={isWide} />
                  <TeamCard member={TECHNICAL_ADVISER} accent="#4DA6FF" isWide={isWide} />
                </View>
              </View>
            </View>

            {/* ── TECH STACK ── */}
            <View style={{ marginBottom: SP.xxxl }}>
              <SectionBadge icon="code-slash-outline" label="Technology" />
              <Text style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, marginBottom: SP.xl }}>
                Technology Stack
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
                {TECH.map((t, i) => <TechChip key={i} name={t.name} icon={t.icon} />)}
              </View>
            </View>

            {/* ── SAFETY + CONTACT ── */}
            <View style={{ flexDirection: isWide ? 'row' : 'column', gap: SP.lg, marginBottom: SP.xxxl }}>
              {/* Safety disclaimer */}
              <View style={{
                flex: 1,
                backgroundColor: '#FEF9EE', borderRadius: 20, padding: SP.xl,
                flexDirection: 'row', gap: SP.lg, alignItems: 'flex-start',
                borderWidth: 1, borderColor: '#F5E4A8',
              }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF3CD', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ionicons name="warning-outline" size={24} color="#92400E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#92400E', fontSize: 15, fontWeight: '800', marginBottom: SP.xs }}>Safety First</Text>
                  <Text style={{ color: '#78350F', fontSize: 14, lineHeight: 22 }}>
                    Educational tool only. Always consult expert mycologists before consuming wild mushrooms. Never rely solely on app identification.
                  </Text>
                </View>
              </View>

              {/* Contact */}
              <TouchableOpacity
                onPress={() => Linking.openURL('mailto:support@snapshroom.app')}
                style={{
                  flex: isWide ? 0.6 : 1,
                  backgroundColor: C.white, borderRadius: 20, padding: SP.xl,
                  flexDirection: 'row', alignItems: 'center', gap: SP.md,
                  borderWidth: 1, borderColor: C.mist,
                  shadowColor: C.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
                }}
                activeOpacity={0.8}
              >
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${C.sage}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="mail-outline" size={22} color={C.moss} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: C.stone, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Contact Us</Text>
                  <Text style={{ fontSize: 14, color: C.forest, fontWeight: '700' }}>support@snapshroom.app</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={C.stone} />
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={{ backgroundColor: C.dark, paddingVertical: SP.xxl, paddingHorizontal: isWide ? SP.xxxl : SP.xl }}>
          <View style={{ alignItems: 'center', gap: SP.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="leaf" size={22} color={C.white} />
              </View>
              <Text style={{ color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 }}>SnapShroom</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>© 2026 SnapShroom · Safe Mushroom Identification 🍄</Text>
          </View>
        </View>

      </Animated.ScrollView>
    </View>
  );
}