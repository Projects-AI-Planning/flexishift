import React from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView} from 'react-native';
import Card from '../../components/common/Card';
import {colors, spacing} from '../../theme';

interface SupportScreenProps {
  mode: 'faq' | 'contact';
}

const SupportScreen: React.FC<SupportScreenProps> = ({mode}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {mode === 'faq'
              ? 'Common questions and workflow guidance'
              : 'Reach the support team directly'}
          </Text>
        </View>

        <Card title="Getting Started" variant="accent">
          <Text style={styles.body}>
            Use the Jobs tab to find loads, the Compliance flow to verify your trip, and Notifications to stay updated.
          </Text>
        </Card>

        <Card title="Account" variant="default">
          <Text style={styles.body}>
            Update profile, password, document status, and availability from the drawer menu.
          </Text>
        </Card>

        <Card title="Need Direct Help?" variant="dark">
          <Text style={styles.contactTitle}>support@flexishift.com</Text>
          <Text style={styles.contactBody}>
            Typical response time is within one business day.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  contactTitle: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  contactBody: {
    color: '#C8D4E3',
    fontSize: 15,
    lineHeight: 22,
  },
});

export default SupportScreen;
