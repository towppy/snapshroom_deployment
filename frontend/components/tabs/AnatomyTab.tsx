import { View, ScrollView } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '../themed-text';
import { CartoonMushroom } from '../CartoonMushroom';
import { COLORS, BREAKPOINTS } from '@/constants/designTokens';

interface AnatomyPart {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  emoji: string;
  features: string[];
}

export const AnatomyTab = ({ styles }: { styles: any }) => {
  const [parts] = useState<AnatomyPart[]>([
    {
      id: 1,
      name: 'Cap (Pileus)',
      description: 'The umbrella-shaped top that protects gills',
      icon: 'ellipse',
      color: COLORS.sage,
      emoji: '🎩',
      features: ['Protects spores', 'Various shapes', 'Color indicates species'],
    },
    {
      id: 2,
      name: 'Gills (Lamellae)',
      description: 'Thin structures under cap producing spores',
      icon: 'menu',
      color: COLORS.moss,
      emoji: '📊',
      features: ['Spore production', 'Radial pattern', 'Color varies'],
    },
    {
      id: 3,
      name: 'Stem (Stipe)',
      description: 'Supports the cap and transports nutrients',
      icon: 'ellipsis-vertical',
      color: COLORS.forest,
      emoji: '🏛️',
      features: ['Structural support', 'Nutrient transport', 'May have ring'],
    },
    {
      id: 4,
      name: 'Mycelium',
      description: 'Underground network of thread-like cells',
      icon: 'git-network',
      color: COLORS.olive,
      emoji: '🕸️',
      features: ['Absorbs nutrients', 'Massive networks', 'Main organism'],
    },
    {
      id: 5,
      name: 'Volva',
      description: 'Cup-like structure at base of some mushrooms',
      icon: 'ellipsis-horizontal',
      color: COLORS.terracotta,
      emoji: '🏺',
      features: ['Protective cup', 'Found in Amanitas', 'Important ID feature'],
    },
    {
      id: 6,
      name: 'Spores',
      description: 'Microscopic reproductive units',
      icon: 'water',
      color: COLORS.coral,
      emoji: '✨',
      features: ['Billions produced', 'Wind-dispersed', 'Species identification'],
    },
  ]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.anatomyScrollContainer}
    >
      <View style={styles.anatomyContainer}>
        {/* Large decorative mushroom */}
        <View style={styles.diagramContainer}>
          <CartoonMushroom 
            size={BREAKPOINTS.isSmall ? 80 : 120} 
            capColor={COLORS.coral} 
            color={COLORS.sage} 
          />
          <ThemedText style={styles.diagramLabel}>Mushroom Anatomy</ThemedText>
        </View>

        <View style={styles.partsGrid}>
          {parts.map((part) => (
            <View key={part.id} style={styles.partCard}>
              <View style={[styles.partEmojiContainer, { backgroundColor: `${part.color}15` }]}>
                <ThemedText style={styles.partEmoji}>{part.emoji}</ThemedText>
              </View>
              <ThemedText style={styles.partName}>{part.name}</ThemedText>
              <ThemedText style={styles.partDescription}>{part.description}</ThemedText>
              <View style={styles.featuresContainer}>
                {part.features.map((feature, idx) => (
                  <View key={idx} style={[styles.featureBadge, { backgroundColor: `${part.color}10` }]}>
                    <ThemedText style={[styles.featureText, { color: part.color }]}>• {feature}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
