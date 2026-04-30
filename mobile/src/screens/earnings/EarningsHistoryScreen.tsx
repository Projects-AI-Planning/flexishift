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
        Alert.alert(
          'Download Started',
          'Your invoice download has started. You can also view it in your browser.',
          [
            {text: 'View in Browser', onPress: () => Linking.openURL(url)},
            {text: 'OK', style: 'cancel'},
          ],
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve invoice link.');
    }
  };

  const renderPaymentItem = ({item}: {item: any}) => (
    <Card
      title={item.jobReference || 'Payment Received'}
      subtitle={item.paymentDate || 'Recently'}
      rightLabel={`+ Rs ${item.amount}`}
      variant="default"
    >
      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>{item.paymentMethod || 'Bank Transfer'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, {color: '#18794E'}]}>{item.status || 'Paid'}</Text>
        </View>
      </View>
      <Pressable 
        onPress={() => handleDownloadInvoice(item.invoiceId || 'mock-id')}
        style={styles.invoiceBtn}
      >
        <Text style={styles.invoiceBtnText}>Download Invoice</Text>
      </Pressable>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings History</Text>
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
            <Text style={styles.emptyIcon}>💰</Text>
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
    backgroundColor: '#F4F1E8',
  },
  header: {
    padding: 24,
    backgroundColor: '#102235',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4CDD6',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DFA622',
  },
  listContent: {
    padding: 24,
    paddingTop: 32,
  },
  paymentDetails: {
    marginTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#8A94A0',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18232F',
  },
  invoiceBtn: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4DED0',
    borderRadius: 12,
  },
  invoiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102235',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#5B6671',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default EarningsHistoryScreen;
