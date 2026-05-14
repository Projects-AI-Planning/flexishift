import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface InvoiceDetailScreenProps {
  invoice: any;
  loading?: boolean;
  onBack: () => void;
  onDownload?: () => void;
}

const Row = ({label, value}: {label: string; value: string}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({
  invoice,
  loading,
  onBack,
  onDownload,
}) => {
  const ref =
    invoice?.jobRef ??
    invoice?.reference ??
    invoice?.invoiceNumber ??
    'Invoice';
  const amount = invoice?.amount != null ? `Rs ${invoice.amount}` : '—';
  const currency = invoice?.currency ?? 'INR';
  const status = String(invoice?.status ?? 'issued').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.subtitle}>
            View and download the generated invoice PDF.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.ref}>{ref}</Text>
          <Text style={styles.status}>{status}</Text>
          <View style={styles.divider} />
          <Row label="Amount" value={amount} />
          <Row label="Currency" value={currency} />
          <Row
            label="Job Reference"
            value={String(invoice?.jobRef ?? invoice?.jobReference ?? '—')}
          />
          <Row
            label="Invoice URL"
            value={String(invoice?.invoiceUrl ?? 'Not available')}
          />
        </View>

        <Pressable
          onPress={onDownload}
          style={styles.primaryBtn}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.nav} />
          ) : (
            <Text style={styles.primaryBtnText}>Download Invoice</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 40},
  backBtn: {alignSelf: 'flex-start', marginBottom: spacing.lg},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  hero: {marginBottom: spacing.xl},
  title: {color: colors.navy, fontSize: 32, fontWeight: '900'},
  subtitle: {color: colors.inkSoft, fontSize: 15, marginTop: 4},
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  ref: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  status: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rowValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryBtnText: {color: colors.nav, fontSize: 16, fontWeight: '900'},
});

export default InvoiceDetailScreen;
