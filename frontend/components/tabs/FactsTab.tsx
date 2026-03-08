import { View, ScrollView, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { ThemedText } from './themed-text';
import { COLORS } from '@/constants/designTokens';

interface FactData {
  id: number;
  icon: string;
  title: string;
  description: string;
  color: string;
  stat: string;
  subtext: string;
  emoji: string;
}

export const FactsTab = ({ styles }: { styles: any }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const facts: FactData[] = [
    {
      id: 1,
      icon: 'leaf',
      title: '5.1M+ Species',
      description: 'Estimated fungal species on Earth',
      color: COLORS.sage,
      stat: '91%',
      subtext: 'Undiscovered',
      emoji: '🌍',
    },
    {
      id: 2,
      icon: 'git-network',
      title: 'Underground Network',
      description: 'Mycelium can span thousands of acres',
      color: COLORS.moss,
      stat: '2,385',
      subtext: 'Acres in Oregon',
      emoji: '🕸️',
    },
    {
      id: 3,
      icon: 'time',
      title: 'Ancient Organisms',
      description: 'Fungi predate plants by millions of years',
      color: COLORS.forest,
      stat: '1.3B',
      subtext: 'Years old',
      emoji: '⏳',
    },
    {
      id: 4,
      icon: 'medical',
      title: 'Medical Marvels',
      description: 'Medicines derived from fungi',
      color: COLORS.olive,
      stat: '40+',
      subtext: 'Pharmaceuticals',
      emoji: '💊',
    },
    {
      id: 5,
      icon: 'flashlight',
      title: "Nature's Nightlights",
      description: 'Bioluminescent mushroom species',
      color: COLORS.terracotta,
      stat: '80+',
      subtext: 'Glowing species',
      emoji: '✨',
    },
    {
      id: 6,
      icon: 'pulse',
      title: 'Fungal Intelligence',
      description: 'Can solve mazes and make decisions',
      color: COLORS.coral,
      stat: '50',
      subtext: 'Neuron-like signals',
      emoji: '🧠',
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.factsScrollContainer}
    >
      <View style={styles.factsGrid}>
        {facts.map((fact, index) => (
          <Animated.View
            key={fact.id}
            style={[
              styles.factCard,
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, index % 2 === 0 ? -5 : 5],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.factCardInner, { backgroundColor: COLORS.white }]}>
              <View style={[styles.factEmojiContainer, { backgroundColor: `${fact.color}15` }]}>
                <ThemedText style={styles.factEmoji}>{fact.emoji}</ThemedText>
              </View>
              <View style={styles.factStats}>
                <ThemedText style={[styles.factStat, { color: fact.color }]}>{fact.stat}</ThemedText>
                <ThemedText style={[styles.factSubtext, { color: COLORS.stone }]}>{fact.subtext}</ThemedText>
              </View>
              <ThemedText style={styles.factCardTitle}>{fact.title}</ThemedText>
              <ThemedText style={styles.factCardDescription}>{fact.description}</ThemedText>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};
