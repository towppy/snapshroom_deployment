import { View, ScrollView, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '../themed-text';
import { COLORS } from '@/constants/designTokens';

interface MushroomType {
  id: number;
  name: string;
  description: string;
  examples: string[];
  color: string;
  icon: string;
  safety: string;
  emoji: string;
}

export const TypesTab = ({ styles }: { styles: any }) => {
  const [mushroomTypes] = useState<MushroomType[]>([
    {
      id: 1,
      name: 'Edible',
      description: 'Safe for human consumption',
      examples: ['Button', 'Portobello', 'Shiitake', 'Oyster'],
      color: COLORS.success,
      icon: 'restaurant',
      safety: 'Verified Safe',
      emoji: '🍽️',
    },
    {
      id: 2,
      name: 'Medicinal',
      description: 'Used in traditional medicine',
      examples: ['Reishi', 'Turkey Tail', "Lion's Mane", 'Cordyceps'],
      color: COLORS.moss,
      icon: 'medical',
      safety: 'Therapeutic',
      emoji: '⚕️',
    },
    {
      id: 3,
      name: 'Psychoactive',
      description: 'Contain psychoactive compounds',
      examples: ['Psilocybe', 'Amanita Muscaria', 'Liberty Cap'],
      color: COLORS.forest,
      icon: 'eye',
      safety: 'Controlled Use',
      emoji: '🔬',
    },
    {
      id: 4,
      name: 'Poisonous',
      description: 'Toxic or deadly if consumed',
      examples: ['Death Cap', 'Destroying Angel', 'False Morel'],
      color: COLORS.danger,
      icon: 'skull',
      safety: 'Dangerous',
      emoji: '☠️',
    },
    {
      id: 5,
      name: 'Saprotrophic',
      description: 'Decompose dead organic matter',
      examples: ['Shaggy Mane', 'Ink Cap', 'Parasol'],
      color: COLORS.olive,
      icon: 'reload-circle',
      safety: 'Ecosystem Role',
      emoji: '♻️',
    },
    {
      id: 6,
      name: 'Mycorrhizal',
      description: 'Symbiotic with plant roots',
      examples: ['Chanterelle', 'Porcini', 'Truffle', 'Morel'],
      color: COLORS.terracotta,
      icon: 'git-branch',
      safety: 'Symbiotic',
      emoji: '🤝',
    },
  ]);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.typesScrollContainer}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.typesGrid}>
          {mushroomTypes.map((type) => (
            <View key={type.id} style={styles.typeCard}>
              <View style={[styles.typeCardHeader, { backgroundColor: `${type.color}15` }]}>
                <ThemedText style={styles.typeEmoji}>{type.emoji}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.typeName, { color: type.color }]}>{type.name}</ThemedText>
                  <ThemedText style={[styles.typeSafety, { color: COLORS.stone }]}>{type.safety}</ThemedText>
                </View>
              </View>

              <View style={styles.typeCardBody}>
                <ThemedText style={styles.typeDescription}>{type.description}</ThemedText>

                <View style={styles.examplesContainer}>
                  <ThemedText style={styles.examplesTitle}>Common Examples:</ThemedText>
                  <View style={styles.examplesGrid}>
                    {type.examples.map((example, idx) => (
                      <View key={idx} style={[styles.exampleBadge, { backgroundColor: `${type.color}10` }]}>
                        <ThemedText style={[styles.exampleText, { color: type.color }]}>
                          {example}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
};
