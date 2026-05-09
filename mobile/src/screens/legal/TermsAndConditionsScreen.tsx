import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface TermsAndConditionsScreenProps {
  onBack?: () => void;
}

const TermsAndConditionsScreen: React.FC<TermsAndConditionsScreenProps> = ({onBack}) => {
  return (
    <SafeAreaView style={styles.container}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.subtitle}>
          Mobile driver access and usage guidelines
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Account Use</Text>
          <Text style={styles.body}>
            Use your account only for authorized FreightFlex operations. Keep
            your login credentials private.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Trip Compliance</Text>
          <Text style={styles.body}>
            Verify load codes, complete handover steps, and submit delivery
            proof only when the trip is genuine and assigned to you.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Documents and Media</Text>
          <Text style={styles.body}>
            Uploaded photos and documents must be clear, accurate, and relevant
            to the job or compliance step.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Support and Conduct</Text>
          <Text style={styles.body}>
            Report incidents, delays, and disputes through the app or support
            channels provided by FreightFlex.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  backBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  backArrow: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  content: {padding: spacing.xl, paddingBottom: 48},
  title: {color: colors.navy, fontSize: 32, fontWeight: '900'},
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 3,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {color: colors.ink, fontSize: 14, lineHeight: 21},
});

export default TermsAndConditionsScreen;
