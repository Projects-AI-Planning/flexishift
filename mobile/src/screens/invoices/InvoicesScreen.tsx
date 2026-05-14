import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface InvoicesScreenProps {
  invoices: any[];
  onViewInvoice: (invoice: any) => void;
  onRefreshInvoices?: () => void;
}

const InvoicesScreen: React.FC<InvoicesScreenProps> = ({
  invoices,
  onViewInvoice,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Track every completed trip invoice
          </Text>
        </View>

        <Card title="Invoice Summary" variant="accent">
          <Text style={styles.summaryValue}>{invoices.length}</Text>
          <Text style={styles.summaryLabel}>
            Available invoices in your account
          </Text>
        </Card>

        {invoices.length > 0 ? (
          invoices.map(invoice => (
            <Card
              key={invoice.invoiceId || invoice.id || String(Math.random())}
              title={invoice.invoiceNumber || invoice.reference || 'Invoice'}
              subtitle={invoice.createdAt || invoice.date || 'Recently'}
              rightLabel={String(invoice.status || 'ISSUED').toUpperCase()}>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>Rs {invoice.amount ?? '0'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Trip</Text>
                <Text style={styles.value}>
                  {invoice.jobReference || 'N/A'}
                </Text>
              </View>
              <Pressable
                onPress={() => onViewInvoice(invoice)}
                style={styles.button}>
                <Text style={styles.buttonText}>View Invoice</Text>
              </Pressable>
            </Card>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83E\uDDFE'}</Text>
            <Text style={styles.emptyTitle}>No invoices available</Text>
            <Text style={styles.emptyText}>
              Completed jobs will appear here once billing is generated.
            </Text>
          </View>
        )}
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
    marginTop: 4,
    color: colors.inkSoft,
    fontSize: 15,
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 44,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: spacing.xs,
    color: colors.inkSoft,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default InvoicesScreen;
