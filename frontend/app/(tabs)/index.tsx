import { Image as ExpoImage } from 'expo-image';
import {
  TouchableOpacity,
  Alert,
  ScrollView,
  View,
  Dimensions,
  Animated,
  Linking,
  Platform,
  Image as RNImage,
  StatusBar,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { testConnection } from '@/utils/api';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  dark:       '#1A2318',   // near-black green
  forest:     '#2D4A2A',   // deep forest
  moss:       '#4A7C47',   // mid green
  sage:       '#7FAB6E',   // soft sage
  cream:      '#F8F5EE',   // warm off-white
  sand:       '#EFE8D8',   // sandy tan
  amber:      '#C8873A',   // warm amber accent
  coral:      '#D96B4E',   // coral mushroom
  white:      '#FFFFFF',
  stone:      '#8A9288',
  mist:       '#E4EAE1',
};

const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40, xxxl: 64 };

// ─── HERO SLIDES ──────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { uri: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Copelandia_cyanescens.jpg' },
  { uri: 'https://images.unsplash.com/photo-1528518290605-1fcc8dcca204?q=80&w=1200&auto=format&fit=crop' },
  { uri: 'https://picturemushroom.com/wiki-image/1080/154052496900227108.jpeg' },
  { uri: 'https://picturemushroom.com/wiki-image/1080/153988458937843728.jpeg' },
];

// ─── MUSHROOM HERO PRODUCT VISUAL ─────────────────────────────────────────────
const MushroomHeroVisual = ({ overrideSize }: { overrideSize?: number } = {}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const heroSize = overrideSize ?? (isWeb ? Math.min(width * 0.38, 480) : width * 0.72);

  return (
    <Animated.View
      style={{
        width: heroSize,
        height: heroSize * 1.15,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
      }}
    >
      {/* Glow halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: heroSize * 0.75,
          height: heroSize * 0.75,
          borderRadius: heroSize * 0.375,
          backgroundColor: C.sage,
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
          transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }],
        }}
      />
      {/* Mushroom cap */}
      <View
        style={{
          width: heroSize * 0.72,
          height: heroSize * 0.48,
          backgroundColor: C.coral,
          borderRadius: heroSize * 0.5,
          borderBottomLeftRadius: heroSize * 0.25,
          borderBottomRightRadius: heroSize * 0.25,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: SP.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.3,
          shadowRadius: 30,
          elevation: 12,
          overflow: 'hidden',
        }}
      >
        {/* Sheen overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0.25)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderRadius: heroSize * 0.5 }}
        />
        {/* Spots */}
        {[
          { top: '18%', left: '18%', size: 0.1 },
          { top: '32%', right: '20%', size: 0.08 },
          { top: '12%', right: '38%', size: 0.07 },
          { top: '45%', left: '32%', size: 0.06 },
        ].map((spot, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: heroSize * spot.size,
              height: heroSize * spot.size,
              borderRadius: heroSize * spot.size * 0.5,
              backgroundColor: 'rgba(255,255,255,0.5)',
              top: spot.top as any,
              left: (spot as any).left,
              right: (spot as any).right,
            }}
          />
        ))}
        {/* Face */}
        <View style={{ flexDirection: 'row', gap: heroSize * 0.08, marginBottom: SP.sm }}>
          {[0, 1].map(i => (
            <View key={i} style={{ width: heroSize * 0.055, height: heroSize * 0.06, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' }} />
          ))}
        </View>
        <View
          style={{
            width: heroSize * 0.14,
            height: heroSize * 0.05,
            borderBottomLeftRadius: 99,
            borderBottomRightRadius: 99,
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.45)',
            borderTopWidth: 0,
          }}
        />
      </View>
      {/* Stem */}
      <View
        style={{
          width: heroSize * 0.28,
          height: heroSize * 0.52,
          backgroundColor: '#E8D5B0',
          borderRadius: heroSize * 0.16,
          marginTop: -SP.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 6,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', borderRadius: 99 }}
        />
      </View>
      {/* Shadow puddle */}
      <View
        style={{
          width: heroSize * 0.55,
          height: heroSize * 0.06,
          backgroundColor: 'rgba(0,0,0,0.25)',
          borderRadius: 999,
          marginTop: -SP.xs,
          transform: [{ scaleY: 0.35 }],
        }}
      />
    </Animated.View>
  );
};

// ─── FLOATING SPORES ──────────────────────────────────────────────────────────
const Spore = ({ x, delay, duration }: { x: number; delay: number; duration: number }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(animY, { toValue: -height * 0.8, duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: duration * 0.15, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.85, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(animY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        bottom: '15%',
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.sage,
        opacity,
        transform: [{ translateY: animY }],
      }}
    />
  );
};

const FloatingSpores = () => {
  const spores = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: (width / 10) * i + Math.random() * 30,
    delay: i * 400,
    duration: 4000 + Math.random() * 2000,
  }));
  return (
    <View style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' } as any}>
      {spores.map(s => <Spore key={s.id} x={s.x} delay={s.delay} duration={s.duration} />)}
    </View>
  );
};

// ─── STAT PILL ────────────────────────────────────────────────────────────────
const StatPill = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 999,
      paddingVertical: SP.sm,
      paddingHorizontal: SP.lg,
      gap: SP.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    }}
  >
    <Ionicons name={icon as any} size={18} color={C.sage} />
    <View>
      <ThemedText style={{ color: C.white, fontSize: 15, fontWeight: '700' }}>{value}</ThemedText>
      <ThemedText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{label}</ThemedText>
    </View>
  </View>
);

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
const FeatureCard = ({
  icon, title, desc, accent,
}: { icon: string; title: string; desc: string; accent: string }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()}
      style={{ flex: 1, minWidth: isWeb ? 200 : '100%' }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          backgroundColor: C.white,
          borderRadius: 20,
          padding: SP.xl,
          shadowColor: C.dark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 4,
          borderWidth: 1,
          borderColor: C.mist,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: `${accent}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SP.md,
          }}
        >
          <Ionicons name={icon as any} size={26} color={accent} />
        </View>
        <ThemedText style={{ fontSize: 17, fontWeight: '700', color: C.dark, marginBottom: SP.sm }}>
          {title}
        </ThemedText>
        <ThemedText style={{ fontSize: 14, color: C.stone, lineHeight: 21 }}>{desc}</ThemedText>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── STEP ROW ─────────────────────────────────────────────────────────────────
const StepRow = ({ number, icon, title, desc }: { number: string; icon: string; title: string; desc: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SP.lg, marginBottom: SP.xl }}>
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: C.forest,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <ThemedText style={{ color: C.sage, fontSize: 20, fontWeight: '800' }}>{number}</ThemedText>
    </View>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs }}>
        <Ionicons name={icon as any} size={18} color={C.moss} />
        <ThemedText style={{ fontSize: 17, fontWeight: '700', color: C.dark }}>{title}</ThemedText>
      </View>
      <ThemedText style={{ fontSize: 14, color: C.stone, lineHeight: 22 }}>{desc}</ThemedText>
    </View>
  </View>
);

// ─── RESOURCE CARD ────────────────────────────────────────────────────────────
const ResourceCard = ({ icon, color, bg, title, desc, url }: any) => (
  <TouchableOpacity
    onPress={() => Linking.openURL(url)}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: SP.md,
      backgroundColor: C.white,
      borderRadius: 14,
      padding: SP.lg,
      borderWidth: 1,
      borderColor: C.mist,
      flex: 1,
      minWidth: isWeb ? 260 : '100%',
    }}
    activeOpacity={0.8}
  >
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <ThemedText style={{ fontSize: 15, fontWeight: '700', color: C.dark }}>{title}</ThemedText>
      <ThemedText style={{ fontSize: 12, color: C.stone, marginTop: 2 }}>{desc}</ThemedText>
    </View>
    <Ionicons name="arrow-forward" size={16} color={C.stone} />
  </TouchableOpacity>
);

// ─── MUSHROOM INFOGRAPHICS ────────────────────────────────────────────────────

const FactsTab = ({ isWide }: { isWide: boolean }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const facts = [
    { id: 1, icon: 'globe-outline',       title: '5.1M+ Species',       stat: '91%',   subtext: 'Undiscovered',       color: '#7FAB6E', desc: 'Estimated fungal species on Earth' },
    { id: 2, icon: 'git-network-outline', title: 'Underground Network',  stat: '2,385', subtext: 'Acres in Oregon',    color: '#4A7C47', desc: 'Mycelium can span thousands of acres' },
    { id: 3, icon: 'time-outline',        title: 'Ancient Organisms',    stat: '1.3B',  subtext: 'Years old',          color: '#2D4A2A', desc: 'Fungi predate plants by millions of years' },
    { id: 4, icon: 'medical-outline',     title: 'Medical Marvels',      stat: '40+',   subtext: 'Pharmaceuticals',    color: '#5A7A52', desc: 'Medicines derived from fungi' },
    { id: 5, icon: 'flashlight-outline',  title: "Nature's Nightlights", stat: '80+',   subtext: 'Glowing species',    color: '#C8873A', desc: 'Bioluminescent mushroom species' },
    { id: 6, icon: 'pulse-outline',       title: 'Fungal Intelligence',  stat: '50',    subtext: 'Neuron-like signals', color: '#D96B4E', desc: 'Can solve mazes and make decisions' },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
      {facts.map((fact, index) => (
        <Animated.View
          key={fact.id}
          style={{
            flex: 1,
            minWidth: isWide ? 160 : '45%',
            transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 === 0 ? -6 : 6] }) }],
          }}
        >
          <View style={{
            backgroundColor: C.white,
            borderRadius: 16,
            padding: SP.lg,
            borderWidth: 1,
            borderColor: C.mist,
            shadowColor: C.dark,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${fact.color}18`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={fact.icon as any} size={20} color={fact.color} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={{ fontSize: 22, fontWeight: '900', color: fact.color, lineHeight: 26 }}>{fact.stat}</ThemedText>
                <ThemedText style={{ fontSize: 10, color: C.stone, fontWeight: '600' }}>{fact.subtext}</ThemedText>
              </View>
            </View>
            <ThemedText style={{ fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 2 }}>{fact.title}</ThemedText>
            <ThemedText style={{ fontSize: 11, color: C.stone, lineHeight: 16 }}>{fact.desc}</ThemedText>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const AnatomyTab = ({ isWide }: { isWide: boolean }) => {
  const parts = [
    { id: 1, name: 'Cap (Pileus)',    desc: 'Umbrella-shaped top protecting gills',       icon: 'umbrella-outline',      color: '#7FAB6E', features: ['Protects spores', 'Various shapes', 'Color = species'] },
    { id: 2, name: 'Gills (Lamellae)',desc: 'Thin structures under cap producing spores', icon: 'reorder-four-outline',  color: '#4A7C47', features: ['Spore production', 'Radial pattern', 'Color varies'] },
    { id: 3, name: 'Stem (Stipe)',    desc: 'Supports cap and transports nutrients',      icon: 'remove-outline',        color: '#2D4A2A', features: ['Structural support', 'Nutrient transport', 'May have ring'] },
    { id: 4, name: 'Mycelium',        desc: 'Underground network of thread-like cells',   icon: 'git-network-outline',   color: '#5A7A52', features: ['Absorbs nutrients', 'Massive networks', 'Main organism'] },
    { id: 5, name: 'Volva',           desc: 'Cup-like structure at base of some species', icon: 'wine-outline',          color: '#C8873A', features: ['Protective cup', 'Found in Amanitas', 'Key ID feature'] },
    { id: 6, name: 'Spores',          desc: 'Microscopic reproductive units',             icon: 'water-outline',         color: '#D96B4E', features: ['Billions produced', 'Wind-dispersed', 'ID tool'] },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
      {parts.map(part => (
        <View key={part.id} style={{
          flex: 1,
          minWidth: isWide ? 200 : '46%',
          backgroundColor: C.white,
          borderRadius: 16,
          padding: SP.lg,
          borderWidth: 1,
          borderColor: C.mist,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${part.color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
            <Ionicons name={part.icon as any} size={22} color={part.color} />
          </View>
          <ThemedText style={{ fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 4 }}>{part.name}</ThemedText>
          <ThemedText style={{ fontSize: 11, color: C.stone, lineHeight: 16, marginBottom: SP.sm }}>{part.desc}</ThemedText>
          <View style={{ gap: 4 }}>
            {part.features.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: part.color }} />
                <ThemedText style={{ fontSize: 11, color: part.color, fontWeight: '600' }}>{f}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const TypesTab = ({ isWide }: { isWide: boolean }) => {
  const types = [
    { id: 1, name: 'Edible',     desc: 'Safe for human consumption',         examples: ['Button', 'Portobello', 'Shiitake', 'Oyster'], color: '#4CAF50', icon: 'restaurant-outline', safety: 'Verified Safe' },
    { id: 2, name: 'Medicinal',  desc: 'Used in traditional medicine',        examples: ['Reishi', 'Turkey Tail', "Lion's Mane", 'Cordyceps'], color: '#4A7C47', icon: 'medical-outline',     safety: 'Therapeutic' },
    { id: 3, name: 'Narcotic',   desc: 'Contain psychoactive compounds',      examples: ['Psilocybe', 'Amanita Muscaria', 'Liberty Cap'], color: '#2D4A2A', icon: 'eye-outline',          safety: 'Controlled' },
    { id: 4, name: 'Poisonous',  desc: 'Toxic or deadly if consumed',         examples: ['Death Cap', 'Destroying Angel', 'False Morel'], color: '#E53935', icon: 'skull-outline',        safety: 'Dangerous' },
    { id: 5, name: 'Scavenging', desc: 'Decompose dead organic matter',       examples: ['Shaggy Mane', 'Ink Cap', 'Parasol'],          color: '#5A7A52', icon: 'reload-circle-outline', safety: 'Ecosystem Role' },
    { id: 6, name: 'Symbiotic',  desc: 'Live in harmony with plant roots',    examples: ['Chanterelle', 'Porcini', 'Truffle', 'Morel'], color: '#C8873A', icon: 'git-branch-outline',   safety: 'Symbiotic' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
      {types.map(t => (
        <View key={t.id} style={{
          flex: 1,
          minWidth: isWide ? 200 : '46%',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: `${t.color}30`,
        }}>
          <View style={{ backgroundColor: `${t.color}12`, padding: SP.md, flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${t.color}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon as any} size={20} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 14, fontWeight: '800', color: t.color }}>{t.name}</ThemedText>
              <ThemedText style={{ fontSize: 10, color: C.stone, fontWeight: '600' }}>{t.safety}</ThemedText>
            </View>
          </View>
          <View style={{ backgroundColor: C.white, padding: SP.md }}>
            <ThemedText style={{ fontSize: 11, color: C.stone, marginBottom: SP.sm, lineHeight: 16 }}>{t.desc}</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {t.examples.map((ex, i) => (
                <View key={i} style={{ backgroundColor: `${t.color}10`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <ThemedText style={{ fontSize: 10, color: t.color, fontWeight: '700' }}>{ex}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const SafetyTab = ({ isWide }: { isWide: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rules = [
    { id: 1, rule: 'Never Eat Raw',    desc: 'Many edible mushrooms are toxic when raw',    icon: 'ban-outline',              severity: 'high',     tips: ['Always cook thoroughly', 'Destroys toxins', 'Improves digestion'] },
    { id: 2, rule: 'Positive ID',      desc: '100% certainty required before consumption',  icon: 'checkmark-circle-outline', severity: 'critical', tips: ['Use multiple sources', 'Check all features', 'Compare look-alikes'] },
    { id: 3, rule: 'Start Small',      desc: 'Test tolerance with small amounts first',      icon: 'thermometer-outline',      severity: 'medium',   tips: ['¼ portion first', 'Wait 24 hours', 'Watch for reactions'] },
    { id: 4, rule: 'Avoid Alcohol',    desc: 'Never mix mushrooms with alcohol',             icon: 'wine-outline',             severity: 'high',     tips: ['48-hour gap', 'Inhibits digestion', 'Increases toxicity'] },
    { id: 5, rule: 'Know Look-alikes', desc: 'Study poisonous species in your area',         icon: 'eye-outline',              severity: 'critical', tips: ['Learn deadly species', 'Note differences', 'When in doubt, out'] },
    { id: 6, rule: 'Document Finds',   desc: 'Take photos and notes for expert review',      icon: 'camera-outline',           severity: 'medium',   tips: ['Multiple angles', 'Include habitat', 'Note spore print'] },
  ];

  const severityColor = (s: string) => s === 'critical' ? '#E53935' : s === 'high' ? '#D96B4E' : '#C8873A';

  return (
    <View>
      <Animated.View style={{
        transform: [{ scale: pulseAnim }],
        backgroundColor: '#FFF3F3',
        borderRadius: 14,
        padding: SP.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SP.md,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        marginBottom: SP.lg,
      }}>
        <Ionicons name="warning-outline" size={28} color="#E53935" />
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#C62828' }}>FOR EDUCATIONAL PURPOSES ONLY</ThemedText>
          <ThemedText style={{ fontSize: 11, color: '#E53935', marginTop: 2 }}>Never consume wild mushrooms without expert verification</ThemedText>
        </View>
      </Animated.View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
        {rules.map(rule => {
          const sc = severityColor(rule.severity);
          return (
            <View key={rule.id} style={{
              flex: 1,
              minWidth: isWide ? 200 : '46%',
              backgroundColor: C.white,
              borderRadius: 16,
              padding: SP.lg,
              borderWidth: 1,
              borderColor: `${sc}25`,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${sc}15`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={rule.icon as any} size={20} color={sc} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '800', color: C.dark }}>{rule.rule}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc }} />
                    <ThemedText style={{ fontSize: 9, color: sc, fontWeight: '700', letterSpacing: 0.5 }}>{rule.severity.toUpperCase()}</ThemedText>
                  </View>
                </View>
              </View>
              <ThemedText style={{ fontSize: 11, color: C.stone, lineHeight: 16, marginBottom: SP.sm }}>{rule.desc}</ThemedText>
              {rule.tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: sc }} />
                  <ThemedText style={{ fontSize: 11, color: C.dark, fontWeight: '600' }}>{tip}</ThemedText>
                </View>
              ))}
            </View>
          );
        })}
      </View>

      {/* Emergency box */}
      <View style={{
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        padding: SP.lg,
        marginTop: SP.lg,
        borderWidth: 1,
        borderColor: '#FFE082',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.md }}>
          <Ionicons name="alert-circle" size={22} color="#F57F17" />
          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: '#E65100' }}>In Case of Poisoning</ThemedText>
        </View>
        {['Call Poison Control Immediately', 'Save Mushroom Sample', 'Go to Emergency Room'].map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F57F17', alignItems: 'center', justifyContent: 'center' }}>
              <ThemedText style={{ color: C.white, fontSize: 13, fontWeight: '900' }}>{i + 1}</ThemedText>
            </View>
            <ThemedText style={{ fontSize: 13, fontWeight: '600', color: '#E65100' }}>{step}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
};

const MushroomInfographics = ({ isWide }: { isWide: boolean }) => {
  const [activeTab, setActiveTab] = useState('facts');

  const tabs = [
    { key: 'facts',   label: 'Fun Facts', icon: 'sparkles-outline' },
    { key: 'anatomy', label: 'Anatomy',   icon: 'fitness-outline' },
    { key: 'types',   label: 'Types',     icon: 'albums-outline' },
    { key: 'safety',  label: 'Safety',    icon: 'alert-circle-outline' },
  ];

  return (
    <View style={{
      marginHorizontal: isWide ? SP.xxxl : 0,
      marginBottom: SP.xxxl,
      backgroundColor: C.sand,
      borderRadius: isWide ? 28 : 0,
      padding: isWide ? SP.xxxl : SP.xl,
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <View style={{ alignItems: 'center', marginBottom: SP.xl }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SP.sm,
          backgroundColor: `${C.moss}18`, paddingHorizontal: SP.lg, paddingVertical: SP.sm,
          borderRadius: 999, marginBottom: SP.md,
        }}>
          <Ionicons name="book-outline" size={14} color={C.moss} />
          <ThemedText style={{ color: C.moss, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
            Mycology 101
          </ThemedText>
        </View>
        <ThemedText style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' }}>
          Mushroom Mastery
        </ThemedText>
        <ThemedText style={{ color: C.stone, fontSize: 15, textAlign: 'center', marginTop: SP.sm, maxWidth: 400 }}>
          Essential knowledge about the fascinating world of fungi
        </ThemedText>
      </View>

      {/* Tab bar */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: C.mist,
        borderRadius: 14,
        padding: 4,
        marginBottom: SP.xl,
        gap: 4,
      }}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SP.xs,
              paddingVertical: SP.sm,
              paddingHorizontal: SP.sm,
              borderRadius: 10,
              backgroundColor: activeTab === tab.key ? C.forest : 'transparent',
            }}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? C.white : C.stone} />
            <ThemedText style={{
              fontSize: 12,
              fontWeight: '700',
              color: activeTab === tab.key ? C.white : C.stone,
            }}>
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'facts'   && <FactsTab  isWide={isWide} />}
      {activeTab === 'anatomy' && <AnatomyTab isWide={isWide} />}
      {activeTab === 'types'   && <TypesTab  isWide={isWide} />}
      {activeTab === 'safety'  && <SafetyTab isWide={isWide} />}
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const { user, isLoading: authLoading, logout } = useAuth();
  const isLoggedIn = !!user;

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroTextAnim = useRef(new Animated.Value(0)).current;
  const heroVisualAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.stagger(200, [
      Animated.timing(heroTextAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroVisualAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    // Hero carousel
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const headerBg = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: ['rgba(26,35,24,0)', 'rgba(26,35,24,0.97)'],
    extrapolate: 'clamp',
  });

  const handleCameraPress = () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please log in to use the camera feature', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push('/(tabs)/camera');
  };

  const handleTestConnection = async () => {
    if (!isLoggedIn) return;
    setConnectionStatus('testing');
    setConnectionMessage('Testing connection...');
    try {
      const connected = await testConnection();
      setConnectionStatus(connected ? 'connected' : 'failed');
      setConnectionMessage(connected ? 'Backend connection successful' : 'Backend not responding');
    } catch (error: any) {
      setConnectionStatus('failed');
      setConnectionMessage(`Connection failed: ${error.message}`);
    }
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}>
        <MushroomHeroVisual />
        <ThemedText style={{ color: C.sage, fontSize: 18, marginTop: SP.xl, fontWeight: '600' }}>
          Loading SnapShroom...
        </ThemedText>
      </View>
    );
  }

  // Layout is responsive: on web/wide screens use side-by-side, on mobile stack
  const isWide = isWeb && width >= 768;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StatusBar barStyle="light-content" />
      <FloatingSpores />

      {/* ── FLOATING NAVBAR ── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: headerBg,
          paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'android' ? 32 : 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: isWide ? SP.xxxl : SP.xl,
            paddingVertical: SP.md,
          }}
        >
          {/* Left: hamburger or spacer */}
          {isLoggedIn ? (
            <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'center' }}>
              <HamburgerMenu />
              <NotificationDropdown iconColor={C.sage} />
            </View>
          ) : <View style={{ width: 40 }} />}

          {/* Center: logo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.moss, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="leaf" size={18} color={C.white} />
            </View>
            <ThemedText style={{ color: C.white, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
              SnapShroom
            </ThemedText>
          </View>

          {/* Right: auth */}
          {!isLoggedIn ? (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{
                backgroundColor: C.moss,
                paddingHorizontal: SP.lg,
                paddingVertical: SP.sm,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: SP.xs,
              }}
            >
              <Ionicons name="log-in-outline" size={16} color={C.white} />
              <ThemedText style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>Login</ThemedText>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════════════
            HERO SECTION — Dark forest background,
            text left / mushroom right (like café ref)
        ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: C.dark, minHeight: isWide ? height * 0.88 : height * 0.92, overflow: 'hidden' }}>
          {/* BG image */}
          <Animated.View style={{ position: 'absolute', inset: 0, opacity: fadeAnim }}>
            {isWeb ? (
              <RNImage
                source={HERO_SLIDES[currentSlide]}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <ExpoImage source={HERO_SLIDES[currentSlide]} style={{ flex: 1 }} contentFit="cover" />
            )}
            <LinearGradient
              colors={[
                'rgba(26,35,24,0.88)',
                'rgba(26,35,24,0.72)',
                'rgba(26,35,24,0.55)',
                'rgba(26,35,24,0.80)',
              ]}
              style={{ position: 'absolute', inset: 0 }}
            />
          </Animated.View>

          {/* Hero content row */}
          <View
            style={{
              flex: 1,
              flexDirection: isWide ? 'row' : 'column',
              alignItems: isWide ? 'center' : 'flex-start',
              justifyContent: isWide ? 'space-between' : 'flex-end',
              paddingTop: isWide ? 100 : 80,
              paddingHorizontal: isWide ? SP.xxxl : SP.xl,
              paddingBottom: isWide ? SP.xxxl : SP.xl,
              minHeight: isWide ? height * 0.88 : height * 0.72,
            }}
          >
            {/* Left text block */}
            <Animated.View
              style={{
                flex: isWide ? 1 : undefined,
                maxWidth: isWide ? 520 : '100%',
                opacity: heroTextAnim,
                transform: [{ translateX: heroTextAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
              }}
            >
              {/* Badge */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SP.sm,
                  marginBottom: SP.lg,
                }}
              >
                <View style={{ width: 28, height: 2, backgroundColor: C.amber }} />
                <ThemedText
                  style={{
                    color: C.amber,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 2.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {isLoggedIn
                    ? `Welcome back, ${user?.name || user?.username || 'Explorer'}`
                    : 'Machine Learning Powered'}
                </ThemedText>
              </View>

              {/* On mobile: title + mushroom side by side */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SP.md, marginBottom: SP.xl }}>
                <ThemedText
                  style={{
                    color: C.white,
                    fontSize: isWide ? 58 : 38,
                    fontWeight: '900',
                    lineHeight: isWide ? 66 : 46,
                    letterSpacing: -1.5,
                    flex: isWide ? undefined : 1,
                  }}
                >
                  Discover &{'\n'}Identify{'\n'}
                  <ThemedText style={{ color: C.sage }}>Mushrooms</ThemedText>
                </ThemedText>

                {/* Mushroom visual — beside title on mobile, separate column on web */}
                {!isWide && (
                  <Animated.View
                    style={{
                      opacity: heroVisualAnim,
                      transform: [{ translateY: heroVisualAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                      marginBottom: SP.sm,
                    }}
                  >
                    <MushroomHeroVisual overrideSize={width * 0.38} />
                  </Animated.View>
                )}
              </View>

              <ThemedText
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: isWide ? 17 : 15,
                  lineHeight: 26,
                  marginBottom: SP.xxl,
                  maxWidth: 420,
                }}
              >
                Point. Snap. Identify. Get detailed species info, safety warnings, and scientific data — instantly.
              </ThemedText>

              {/* CTA Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
                <TouchableOpacity
                  onPress={isLoggedIn ? handleCameraPress : () => router.push('/(auth)/login')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SP.sm,
                    backgroundColor: C.sage,
                    paddingHorizontal: SP.xl,
                    paddingVertical: SP.lg,
                    borderRadius: 14,
                  }}
                >
                  <Ionicons name={isLoggedIn ? 'camera' : 'person'} size={20} color={C.dark} />
                  <ThemedText style={{ color: C.dark, fontSize: 16, fontWeight: '800' }}>
                    {isLoggedIn ? 'Start Identifying' : 'Get Started Free'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/about')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SP.sm,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.3)',
                    paddingHorizontal: SP.xl,
                    paddingVertical: SP.lg,
                    borderRadius: 14,
                  }}
                >
                  <ThemedText style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>About Us</ThemedText>
                  <Ionicons name="arrow-forward" size={16} color={C.white} />
                </TouchableOpacity>
              </View>

              {/* Slide dots */}
              <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.xxl }}>
                {HERO_SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === currentSlide ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === currentSlide ? C.sage : 'rgba(255,255,255,0.25)',
                    }}
                  />
                ))}
              </View>
            </Animated.View>

            {/* Right: mushroom product visual — web only */}
            {isWide && (
              <Animated.View
                style={{
                  opacity: heroVisualAnim,
                  transform: [{ translateY: heroVisualAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                  alignItems: 'center',
                }}
              >
                <MushroomHeroVisual />
              </Animated.View>
            )}
          </View>

          {/* Brushstroke transition — SVG-shaped bottom mask */}
          <View
            style={{
              height: isWide ? 80 : 60,
              backgroundColor: C.cream,
              borderTopLeftRadius: isWide ? 60 : 40,
              borderTopRightRadius: isWide ? 60 : 40,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[C.dark, C.cream]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
            />
          </View>
        </View>

        {/* ══════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: C.forest,
            flexDirection: isWide ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginHorizontal: isWide ? SP.xxxl : SP.xl,
            borderRadius: 20,
            marginTop: -SP.xxl,
            marginBottom: SP.xxl,
            shadowColor: C.dark,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 8,
            overflow: 'hidden',
          }}
        >
          {[
            { icon: 'leaf-outline', value: '10 Species', label: 'In Database' },
            { icon: 'analytics-outline', value: 'ML-Powered', label: 'Identification' },
            { icon: 'shield-checkmark-outline', value: 'Safety First', label: 'Approach' },
            { icon: 'people-outline', value: 'Community', label: 'Verified Data' },
          ].map((stat, i, arr) => (
            <View
              key={i}
              style={{
                flex: isWide ? 1 : undefined,
                width: isWide ? undefined : '100%',
                paddingVertical: SP.xl,
                paddingHorizontal: SP.xl,
                alignItems: 'center',
                flexDirection: 'row',
                gap: SP.md,
                borderRightWidth: isWide && i < arr.length - 1 ? 1 : 0,
                borderBottomWidth: !isWide && i < arr.length - 1 ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: `${C.sage}25`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={stat.icon as any} size={22} color={C.sage} />
              </View>
              <View>
                <ThemedText style={{ color: C.white, fontSize: 16, fontWeight: '800' }}>{stat.value}</ThemedText>
                <ThemedText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{stat.label}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════
            SPLIT SECTION — like the café "telecast" section
            Video-placeholder left / copy right
        ══════════════════════════════════════════ */}
        <View
          style={{
            flexDirection: isWide ? 'row' : 'column',
            alignItems: 'stretch',
            gap: SP.xl,
            paddingHorizontal: isWide ? SP.xxxl : SP.xl,
            marginBottom: SP.xxxl,
          }}
        >
          {/* Left: image card */}
          <View
            style={{
              flex: isWide ? 1.1 : undefined,
              height: isWide ? 360 : 240,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: C.forest,
            }}
          >
            {isWeb ? (
              <RNImage
                source={{ uri: 'https://picturemushroom.com/wiki-image/1080/153988458937843728.jpeg' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <ExpoImage
                source={{ uri: 'https://picturemushroom.com/wiki-image/1080/153988458937843728.jpeg' }}
                style={{ flex: 1 }}
                contentFit="cover"
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(26,35,24,0.55)']}
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Play-button overlay */}
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  borderWidth: 2,
                  borderColor: C.amber,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera" size={28} color={C.amber} />
              </View>
            </View>
          </View>

          {/* Right: copy */}
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: isWide ? 0 : SP.lg }}>
            <ThemedText
              style={{ color: C.amber, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: SP.md }}
            >
              ML-Powered Recognition
            </ThemedText>
            <ThemedText style={{ color: C.dark, fontSize: isWide ? 38 : 28, fontWeight: '900', lineHeight: isWide ? 46 : 36, marginBottom: SP.lg, letterSpacing: -1 }}>
              Identify Any{'\n'}Mushroom Instantly
            </ThemedText>
            <ThemedText style={{ color: C.stone, fontSize: 15, lineHeight: 24, marginBottom: SP.xl }}>
              Our machine learning model has been trained on thousands of species photographs, giving you accurate, real-time identification with safety information you can trust.
            </ThemedText>

            <TouchableOpacity
              onPress={isLoggedIn ? handleCameraPress : () => router.push('/(auth)/login')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SP.sm,
                alignSelf: 'flex-start',
                backgroundColor: C.forest,
                paddingHorizontal: SP.xl,
                paddingVertical: SP.md,
                borderRadius: 12,
              }}
            >
              <Ionicons name="camera-outline" size={18} color={C.white} />
              <ThemedText style={{ color: C.white, fontSize: 15, fontWeight: '700' }}>
                {isLoggedIn ? 'Open Camera' : 'Try It Free'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            MUSHROOM INFOGRAPHICS
        ══════════════════════════════════════════ */}
        <MushroomInfographics isWide={isWide} />

        {/* ══════════════════════════════════════════
            FEATURES GRID
        ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
          {/* Section header */}
          <View style={{ alignItems: 'center', marginBottom: SP.xxl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SP.sm,
                backgroundColor: `${C.moss}15`,
                paddingHorizontal: SP.lg,
                paddingVertical: SP.sm,
                borderRadius: 999,
                marginBottom: SP.md,
              }}
            >
              <Ionicons name="star-outline" size={14} color={C.moss} />
              <ThemedText style={{ color: C.moss, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                Features
              </ThemedText>
            </View>
            <ThemedText style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' }}>
              Why Choose SnapShroom
            </ThemedText>
            <ThemedText style={{ color: C.stone, fontSize: 15, textAlign: 'center', marginTop: SP.sm, maxWidth: 400 }}>
              Advanced ML meets comprehensive mushroom knowledge
            </ThemedText>
          </View>

          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              gap: SP.lg,
              flexWrap: isWide ? 'wrap' : 'nowrap',
            }}
          >
            <FeatureCard
              icon="analytics"
              title="ML Recognition"
              desc="Instantly identifies mushroom species using advanced machine learning algorithms trained on thousands of images."
              accent={C.moss}
            />
            <FeatureCard
              icon="shield-checkmark"
              title="Safety First"
              desc="Comprehensive safety warnings, toxicity levels, and expert-verified information for every identified species."
              accent={C.forest}
            />
            <FeatureCard
              icon="library"
              title="10+ Species"
              desc="Detailed profiles with scientific classifications, habitat info, and culinary or medicinal uses."
              accent={C.amber}
            />
          </View>
        </View>

        {/* ══════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: C.sand,
            marginHorizontal: isWide ? SP.xxxl : 0,
            borderRadius: isWide ? 28 : 0,
            padding: isWide ? SP.xxxl : SP.xl,
            marginBottom: SP.xxxl,
          }}
        >
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              gap: SP.xxxl,
              alignItems: isWide ? 'flex-start' : 'stretch',
            }}
          >
            {/* Section title */}
            <View style={{ flex: isWide ? 0.4 : undefined }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SP.sm,
                  backgroundColor: `${C.moss}18`,
                  paddingHorizontal: SP.md,
                  paddingVertical: SP.xs,
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  marginBottom: SP.md,
                }}
              >
                <Ionicons name="bulb-outline" size={14} color={C.moss} />
                <ThemedText style={{ color: C.moss, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                  How It Works
                </ThemedText>
              </View>
              <ThemedText style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, lineHeight: isWide ? 44 : 34, marginBottom: SP.lg }}>
                Three Simple{'\n'}Steps
              </ThemedText>
              <ThemedText style={{ color: C.stone, fontSize: 15, lineHeight: 24 }}>
                From mushroom to identification in under 10 seconds. No expertise needed.
              </ThemedText>
            </View>

            {/* Steps */}
            <View style={{ flex: 1 }}>
              <StepRow
                number="1"
                icon="camera-outline"
                title="Take a Photo"
                desc="Capture clear images of the mushroom from multiple angles for best accuracy."
              />
              <StepRow
                number="2"
                icon="analytics-outline"
                title="ML Analysis"
                desc="Our algorithm instantly analyses morphology, color patterns, and habitat context."
              />
              <StepRow
                number="3"
                icon="book-outline"
                title="Learn & Explore"
                desc="Get detailed species info, safety ratings, and related educational content."
              />
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            RESOURCES SECTION
        ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
          <View style={{ alignItems: 'center', marginBottom: SP.xxl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SP.sm,
                backgroundColor: `${C.amber}15`,
                paddingHorizontal: SP.lg,
                paddingVertical: SP.sm,
                borderRadius: 999,
                marginBottom: SP.md,
              }}
            >
              <Ionicons name="library-outline" size={14} color={C.amber} />
              <ThemedText style={{ color: C.amber, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                Resources
              </ThemedText>
            </View>
            <ThemedText style={{ color: C.dark, fontSize: isWide ? 36 : 26, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' }}>
              Learn More
            </ThemedText>
          </View>

          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              flexWrap: isWide ? 'wrap' : 'nowrap',
              gap: SP.md,
            }}
          >
            <ResourceCard icon="book" color="#4CAF50" bg="#E8F5E9" title="MushroomExpert" desc="Comprehensive identification guides" url="https://www.mushroomexpert.com/" />
            <ResourceCard icon="globe" color="#FF9800" bg="#FFF3E0" title="iNaturalist Fungi" desc="Community-powered observations" url="https://www.inaturalist.org/taxa/47170-Fungi" />
            <ResourceCard icon="camera" color="#2196F3" bg="#E3F2FD" title="MykoWeb" desc="California fungi photo gallery" url="https://www.mykoweb.com/" />
            <ResourceCard icon="leaf" color="#9C27B0" bg="#F3E5F5" title="First Nature" desc="UK & European fungi ID" url="https://www.first-nature.com/fungi/" />
            <ResourceCard icon="people" color="#607D8B" bg="#ECEFF1" title="Shroomery" desc="Active mycology community" url="https://www.shroomery.org/" />
            <ResourceCard icon="school" color="#388E3C" bg="#E8F5E9" title="NAMA" desc="North American Mycological Assoc." url="https://namyco.org/" />
          </View>
        </View>

        {/* ══════════════════════════════════════════
            CTA — Only for logged-out users
        ══════════════════════════════════════════ */}
        {!isLoggedIn && (
          <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
            <View
              style={{
                backgroundColor: C.forest,
                borderRadius: 28,
                padding: isWide ? SP.xxxl : SP.xxl,
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[`${C.moss}40`, 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }}
              />
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: `${C.sage}25`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: SP.lg,
                }}
              >
                <Ionicons name="rocket-outline" size={36} color={C.sage} />
              </View>
              <ThemedText
                style={{
                  color: C.white,
                  fontSize: isWide ? 36 : 24,
                  fontWeight: '900',
                  textAlign: 'center',
                  letterSpacing: -0.8,
                  marginBottom: SP.md,
                  maxWidth: 400,
                }}
              >
                Ready to Start Your Mushroom Journey?
              </ThemedText>
              <ThemedText
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 24,
                  marginBottom: SP.xxl,
                  maxWidth: 380,
                }}
              >
                Join thousands of foragers who use SnapShroom to safely identify and learn about fungi.
              </ThemedText>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SP.sm,
                  backgroundColor: C.sage,
                  paddingHorizontal: SP.xxl,
                  paddingVertical: SP.lg,
                  borderRadius: 14,
                }}
              >
                <Ionicons name="rocket" size={20} color={C.dark} />
                <ThemedText style={{ color: C.dark, fontSize: 16, fontWeight: '800' }}>Create Free Account</ThemedText>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.lg }}>
                <Ionicons name="checkmark-circle" size={16} color={`${C.sage}99`} />
                <ThemedText style={{ color: `${C.sage}99`, fontSize: 13 }}>No credit card required • Free forever</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            SAFETY NOTICE
        ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
          <View
            style={{
              backgroundColor: '#FEF9EE',
              borderRadius: 20,
              padding: SP.xl,
              flexDirection: 'row',
              gap: SP.lg,
              alignItems: 'flex-start',
              borderWidth: 1,
              borderColor: '#F5E4A8',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: '#FFF3CD',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Ionicons name="warning-outline" size={24} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: '#92400E', fontSize: 15, fontWeight: '800', marginBottom: SP.xs }}>
                Safety First
              </ThemedText>
              <ThemedText style={{ color: '#78350F', fontSize: 14, lineHeight: 22 }}>
                Never consume any mushroom based solely on app identification. Always consult multiple sources and experts before consuming wild mushrooms. This app is for educational purposes only.
              </ThemedText>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            SYSTEM STATUS (logged-in only)
        ══════════════════════════════════════════ */}
        {isLoggedIn && (
          <View style={{ paddingHorizontal: isWide ? SP.xxxl : SP.xl, marginBottom: SP.xxxl }}>
            <View
              style={{
                backgroundColor: C.white,
                borderRadius: 20,
                padding: SP.xl,
                borderWidth: 1,
                borderColor: C.mist,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
                  <Ionicons name="hardware-chip-outline" size={22} color={C.forest} />
                  <ThemedText style={{ color: C.dark, fontSize: 16, fontWeight: '700' }}>System Status</ThemedText>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SP.xs,
                    paddingHorizontal: SP.md,
                    paddingVertical: SP.xs,
                    borderRadius: 999,
                    backgroundColor:
                      connectionStatus === 'connected' ? '#E8F5E9' :
                      connectionStatus === 'failed' ? '#FFEBEE' : C.mist,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        connectionStatus === 'connected' ? '#4CAF50' :
                        connectionStatus === 'failed' ? '#F44336' : C.stone,
                    }}
                  />
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        connectionStatus === 'connected' ? '#2E7D32' :
                        connectionStatus === 'failed' ? '#C62828' : C.stone,
                    }}
                  >
                    {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'failed' ? 'Offline' : 'Ready'}
                  </ThemedText>
                </View>
              </View>

              {connectionMessage ? (
                <ThemedText style={{ color: C.stone, fontSize: 13, marginBottom: SP.md }}>{connectionMessage}</ThemedText>
              ) : null}

              <TouchableOpacity
                onPress={handleTestConnection}
                disabled={connectionStatus === 'testing'}
                style={{
                  backgroundColor: C.forest,
                  paddingVertical: SP.md,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: C.dark, paddingVertical: SP.xxxl, paddingHorizontal: isWide ? SP.xxxl : SP.xl }}>
          <View style={{ alignItems: 'center', marginBottom: SP.xxl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: C.moss,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="leaf" size={26} color={C.white} />
              </View>
              <ThemedText style={{ color: C.white, fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>
                SnapShroom
              </ThemedText>
            </View>
            <ThemedText style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', maxWidth: 340 }}>
              Machine Learning-Powered Mushroom Identification
            </ThemedText>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: SP.xl }} />

          <ThemedText style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
            © 2026 SnapShroom. All rights reserved.
          </ThemedText>
        </View>

      </Animated.ScrollView>
    </View>
  );
}