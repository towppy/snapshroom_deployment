import { View, ScrollView, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '../themed-text';
import { COLORS } from '@/constants/designTokens';

interface SafetyRule {
  id: number;
  rule: string;
  description: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  emoji: string;
  tips: string[];
}

export const SafetyTab = ({ styles }: { styles: any }) => {
  const [safetyRules] = useState<SafetyRule[]>([
    {
      id: 1,
      rule: 'Never Eat Raw',
      description: 'Many edible mushrooms are toxic when raw',
      icon: 'ban',
      severity: 'high',
      emoji: '🚫',
      tips: ['Always cook thoroughly', 'Destroys toxins', 'Improves digestion'],
    },
    {
      id: 2,
      rule: 'Positive ID',
      description: '100% certainty before consumption',
      icon: 'checkmark-circle',
      severity: 'critical',
      emoji: '✅',
      tips: ['Use multiple sources', 'Check all features', 'Compare with look-alikes'],
    },
    {
      id: 3,
      rule: 'Start Small',
      description: 'Test tolerance with small amounts first',
      icon: 'thermometer',
      severity: 'medium',
      emoji: '🧪',
      tips: ['¼ portion first', 'Wait 24 hours', 'Watch for reactions'],
    },
    {
      id: 4,
      rule: 'Avoid Alcohol',
      description: 'Never mix with alcohol consumption',
      icon: 'wine',
      severity: 'high',
      emoji: '🍷',
      tips: ['48-hour gap', 'Inhibits digestion', 'Increases toxicity'],
    },
    {
      id: 5,
      rule: 'Know Look-alikes',
      description: 'Study poisonous species in your area',
      icon: 'eye',
      severity: 'critical',
      emoji: '👁️',
      tips: ['Learn deadly species', 'Note differences', 'When in doubt, throw out'],
    },
    {
      id: 6,
      rule: 'Document Findings',
      description: 'Take photos and notes for expert review',
      icon: 'camera',
      severity: 'medium',
      emoji: '📸',
      tips: ['Multiple angles', 'Include habitat', 'Note spore print'],
    },
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return COLORS.danger;
      case 'high':
        return COLORS.terracotta;
      case 'medium':
        return COLORS.warning;
      default:
        return COLORS.moss;
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.safetyScrollContainer}
    >
      <View style={styles.tabContent}>
        {/* Warning Banner */}
        <Animated.View style={[styles.warningBanner, { transform: [{ scale: pulseAnim }] }]}>
          <ThemedText style={styles.warningEmoji}>⚠️</ThemedText>
          <View style={styles.warningContent}>
            <ThemedText style={styles.warningTitle}>FOR EDUCATIONAL PURPOSES ONLY</ThemedText>
            <ThemedText style={styles.warningText}>
              Never consume wild mushrooms without expert verification
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.safetyGrid}>
          {safetyRules.map((rule) => {
            const severityColor = getSeverityColor(rule.severity);
            return (
              <View key={rule.id} style={styles.safetyCard}>
                <View style={styles.safetyCardHeader}>
                  <View style={[styles.ruleEmojiContainer, { backgroundColor: `${severityColor}15` }]}>
                    <ThemedText style={styles.ruleEmoji}>{rule.emoji}</ThemedText>
                  </View>
                  <View style={styles.ruleInfo}>
                    <ThemedText style={styles.ruleName}>{rule.rule}</ThemedText>
                    <View style={[styles.severityBadge, { backgroundColor: `${severityColor}15` }]}>
                      <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
                      <ThemedText style={[styles.severityText, { color: severityColor }]}>
                        {rule.severity.toUpperCase()} PRIORITY
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <ThemedText style={styles.ruleDescription}>{rule.description}</ThemedText>

                <View style={styles.tipsContainer}>
                  <ThemedText style={styles.tipsTitle}>Key Tips:</ThemedText>
                  {rule.tips.map((tip, idx) => (
                    <View key={idx} style={styles.tipItem}>
                      <View style={[styles.tipDot, { backgroundColor: severityColor }]} />
                      <ThemedText style={styles.tipText}>{tip}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Emergency Info */}
        <View style={styles.emergencyContainer}>
          <ThemedText style={styles.emergencyTitle}>🚨 In Case of Poisoning:</ThemedText>
          <View style={styles.emergencySteps}>
            <View style={styles.emergencyStep}>
              <View style={styles.emergencyNumber}>
                <ThemedText style={styles.stepNumberText}>1</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>Call Poison Control Immediately</ThemedText>
            </View>
            <View style={styles.emergencyStep}>
              <View style={styles.emergencyNumber}>
                <ThemedText style={styles.stepNumberText}>2</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>Save Mushroom Sample</ThemedText>
            </View>
            <View style={styles.emergencyStep}>
              <View style={styles.emergencyNumber}>
                <ThemedText style={styles.stepNumberText}>3</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>Go to Emergency Room</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
