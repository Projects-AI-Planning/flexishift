import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface EarningsHistoryScreenProps {
  payments: any[];
  totalEarnings: number;
  refreshing: boolean;
  onRefresh: () => void;
  onViewInvoice: (invoiceId: string) => Promise<string | void>;
}

const EarningsHistoryScreen: React.FC<EarningsHistoryScreenProps> = ({
  payments,
  totalEarnings,
  refreshing,
  onRefresh,
  onViewInvoice,
}) => {
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const url = await onViewInvoice(invoiceId);
      if (url) {
        Alert.alert('Download Started', 'Your invoice download has started.', [
          {text: 'View in Browser', onPress: () => Linking.openURL(url)},
          {text: 'OK', style: 'cancel'},
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to retrieve invoice link.');
    }
  };

  const renderPaymentItem = ({item}: {item: any}) => (
    <Card
      title={item.jobReference || 'Payment Received'}
      subtitle={item.paymentDate || 'Recently'}
      rightLabel={`+ Rs ${item.amount}`}
      variant="accent">
      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>
            {item.paymentMethod || 'Bank Transfer'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, styles.successText]}>
            {item.status || 'Paid'}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => handleDownloadInvoice(item.invoiceId || 'mock-id')}
        style={styles.invoiceBtn}>
        <Text style={styles.invoiceBtnText}>Download Invoice</Text>
      </Pressable>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>All Time Total</Text>
          <Text style={styles.totalValue}>Rs {totalEarnings.toLocaleString()}</Text>
        </View>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={item => item.paymentId || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDCB0'}</Text>
            <Text style={styles.emptyTitle}>No Payments Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first job to start seeing your earnings history here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.card,
    marginBottom: spacing.lg,
  },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C8D4E3',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#8BC0EE',
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  paymentDetails: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  successText: {
    color: colors.success,
  },
  invoiceBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  invoiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default EarningsHistoryScreen;
