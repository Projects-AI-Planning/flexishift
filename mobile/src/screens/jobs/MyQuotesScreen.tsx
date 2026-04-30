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
} from 'react-native';
import Card from '../../components/common/Card';

interface MyQuotesScreenProps {
  quotes: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onEditQuote: (quote: any) => void;
  onWithdrawQuote: (quoteId: string) => Promise<void>;
}

const MyQuotesScreen: React.FC<MyQuotesScreenProps> = ({
  quotes,
  refreshing,
  onRefresh,
  onEditQuote,
  onWithdrawQuote,
}) => {
  const handleWithdraw = (quoteId: string) => {
    Alert.alert(
      'Withdraw Bid',
      'Are you sure you want to withdraw your bid for this job?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => onWithdrawQuote(quoteId),
        },
      ],
    );
  };

  const renderQuoteItem = ({item}: {item: any}) => (
    <Card
      title={item.jobReference || 'Job Bid'}
      subtitle={`Submitted on ${item.createdAt || 'Recently'}`}
      rightLabel={item.status.toUpperCase()}
      variant={item.status === 'accepted' ? 'accent' : 'default'}
    >
      <View style={styles.quoteInfo}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Your Bid</Text>
          <Text style={styles.amountValue}>Rs {item.quoteAmount}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Job Date</Text>
          <Text style={styles.amountValue}>{item.jobDate || 'N/A'}</Text>
        </View>
      </View>

      {item.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>
          "{item.notes}"
        </Text>
      ) : null}

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <Pressable 
            onPress={() => onEditQuote(item)}
            style={styles.editBtn}
          >
            <Text style={styles.editBtnText}>Edit Bid</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleWithdraw(item.quoteId)}
            style={styles.withdrawBtn}
          >
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Active Bids</Text>
        <Text style={styles.subtitle}>
          Track and manage your submitted quotes for available loads.
        </Text>
      </View>

      <FlatList
        data={quotes}
        renderItem={renderQuoteItem}
        keyExtractor={item => item.quoteId || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Active Bids</Text>
            <Text style={styles.emptySubtitle}>
              You haven't placed any bids yet. Go to the "Find Loads" tab to get started.
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DED0',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5B6671',
    lineHeight: 21,
  },
  listContent: {
    padding: 20,
  },
  quoteInfo: {
    flexDirection: 'row',
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  amountBox: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A94A0',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102235',
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#E4DED0',
    marginHorizontal: 12,
  },
  notesText: {
    fontSize: 13,
    color: '#5B6671',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#102235',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  withdrawBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#A53A32',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: '#A53A32',
    fontSize: 13,
    fontWeight: '800',
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

export default MyQuotesScreen;
