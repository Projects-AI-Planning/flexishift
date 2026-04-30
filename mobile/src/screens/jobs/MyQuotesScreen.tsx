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
import {colors, radius, spacing} from '../../theme';

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
    Alert.alert('Withdraw Bid', 'Are you sure you want to withdraw this bid?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => onWithdrawQuote(quoteId),
      },
    ]);
  };

  const renderQuoteItem = ({item}: {item: any}) => (
    <Card
      title={item.jobReference || 'Job Bid'}
      subtitle={`Submitted on ${item.createdAt || 'Recently'}`}
      rightLabel={String(item.status || 'PENDING').toUpperCase()}
      variant={item.status === 'accepted' ? 'accent' : 'default'}>
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

      {item.status === 'pending' ? (
        <View style={styles.actionRow}>
          <Pressable onPress={() => onEditQuote(item)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Bid</Text>
          </Pressable>
          <Pressable onPress={() => handleWithdraw(item.quoteId)} style={styles.withdrawBtn}>
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </Pressable>
        </View>
      ) : null}
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
            <Text style={styles.emptyIcon}>{'\u270D'}</Text>
            <Text style={styles.emptyTitle}>No Active Bids</Text>
            <Text style={styles.emptySubtitle}>
              Go to the Find Loads tab to place your first bid.
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
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 21,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  quoteInfo: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  amountBox: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.navy,
  },
  infoDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  notesText: {
    fontSize: 13,
    color: colors.inkSoft,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editBtn: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  editBtnText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  withdrawBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  withdrawBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
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

export default MyQuotesScreen;
