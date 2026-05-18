import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({onBack}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>How FlexiShift collects, uses, and protects your data</Text>
        <Text style={styles.updated}>Last updated: January 2025</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly to us, such as your name, email address, phone number, and account credentials when you register. We also collect location data, trip details, and documents you upload during normal use of the platform.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your information is used to operate and improve the FlexiShift platform, facilitate logistics operations, process payments, send notifications, verify your identity and compliance, and provide customer support. We do not sell your personal data to third parties.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. Location Data</Text>
        <Text style={styles.body}>
          With your permission, we collect real-time GPS location data during active trips to enable live tracking features. Location collection stops when you are not on an active job. You may disable location access in your device settings, though this will limit platform functionality.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.body}>
          We share your information with freight operators and clients only as necessary to complete jobs assigned to you. We may share data with trusted service providers (e.g., payment processors, cloud hosting) who are bound by confidentiality obligations.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.body}>
          We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting our support team. Certain records may be retained to meet legal or regulatory obligations.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>6. Security</Text>
        <Text style={styles.body}>
          We use industry-standard encryption and security practices to protect your personal information. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password and keep your login credentials confidential.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal data. You may also withdraw consent for certain data processing activities. To exercise these rights, contact us through the support section of the app.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy or how your data is handled, please reach out to our support team via the Help & Support section in the app. Full contact details will be provided upon request.
        </Text>
      </View>

      <Text style={styles.notice}>
        This is a placeholder policy. The final Privacy Policy will be provided by the FlexiShift legal team and will supersede this document.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 48},
  backBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingBottom: spacing.sm,
    paddingTop: spacing.lg,
  },
  backArrow: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  header: {
    marginBottom: spacing.xl,
  },
  title: {color: colors.navy, fontSize: 30, fontWeight: '900', marginBottom: 4},
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    marginTop: 4,
  },
  updated: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xl,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 3,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {color: colors.ink, fontSize: 14, lineHeight: 22},
  notice: {
    borderColor: '#E8D5A3',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 8,
    padding: spacing.lg,
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;
