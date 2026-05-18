import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface PaymentReleasedScreenProps {
  jobReference: string;
  amount: number;
  currency: string;
  completionDate?: string;
  onViewInvoice: () => void;
  onRate: () => void;
  onDone: () => void;
}

function formatDate(iso?: string) {
  if (!iso) {return new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});}
  return new Date(iso).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
}

const PaymentReleasedScreen: React.FC<PaymentReleasedScreenProps> = ({
  jobReference,
  amount,
  currency,
  completionDate,
  onViewInvoice,
  onRate,
  onDone,
}) => {
  const now = new Date();
  const approvedDate = completionDate ? new Date(completionDate) : new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const invoiceDate = new Date(approvedDate.getTime() - 3 * 60 * 60 * 1000);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onDone} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Success icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Payment Released</Text>
        <Text style={styles.subheading}>
          Your payment for Job{' '}
          <Text style={styles.jobRef}>{jobReference}</Text>
          {' '}has been approved and released to your account.
        </Text>

        {/* Invoice Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🧾</Text>
            <Text style={styles.cardTitle}>Invoice Summary</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>JOB REFERENCE</Text>
            <Text style={styles.summaryValue}>{jobReference}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>COMPLETION DATE</Text>
            <Text style={styles.summaryValue}>{formatDate(completionDate)}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.dotGreen]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Funds Released</Text>
              <Text style={styles.timelineTime}>
                {now.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}, {now.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </View>
          </View>
          <View style={styles.timelineConnector} />
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.dotBlue]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Job Approved</Text>
              <Text style={styles.timelineTime}>
                {approvedDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}, {approvedDate.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </View>
          </View>
          <View style={styles.timelineConnector} />
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.dotGrey]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Invoice Submitted</Text>
              <Text style={styles.timelineTime}>
                {invoiceDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}, {invoiceDate.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Breakdown */}
        <View style={styles.card}>
          <Text style={styles.breakdownTitle}>Financial Breakdown</Text>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>
              {currency} {amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <Pressable onPress={onViewInvoice} style={styles.invoiceBtn}>
          <Text style={styles.invoiceBtnIcon}>⬇</Text>
          <Text style={styles.invoiceBtnText}>VIEW INVOICE</Text>
        </Pressable>

        <Pressable onPress={onRate} style={styles.rateBtn}>
          <Text style={styles.rateBtnText}>⭐  Rate Your Haulier</Text>
        </Pressable>

        <Pressable onPress={onDone} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {width: 60},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  topTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  content: {padding: spacing.xl, paddingBottom: 48},

  // Success icon
  iconWrap: {alignItems: 'center', marginTop: 24, marginBottom: 20},
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E6F9EF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#34C776',
  },
  iconText: {color: '#18794E', fontSize: 36, fontWeight: '900'},

  // Text
  heading: {color: colors.ink, fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 10},
  subheading: {color: colors.inkSoft, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 28},
  jobRef: {color: colors.accent, fontWeight: '800'},

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, marginBottom: 14,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14},
  cardIcon: {fontSize: 18},
  cardTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  divider: {height: 1, backgroundColor: colors.border, marginBottom: 14},
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.5},
  summaryValue: {color: colors.navy, fontSize: 14, fontWeight: '800'},

  // Timeline
  timelineItem: {flexDirection: 'row', alignItems: 'center', gap: 14},
  timelineDot: {width: 12, height: 12, borderRadius: 6, flexShrink: 0},
  dotGreen: {backgroundColor: '#18794E'},
  dotBlue: {backgroundColor: colors.accent},
  dotGrey: {backgroundColor: '#C9D0DB'},
  timelineConnector: {
    width: 2, height: 20, backgroundColor: colors.border,
    marginLeft: 5, marginVertical: 2,
  },
  timelineContent: {flex: 1},
  timelineTitle: {color: colors.ink, fontSize: 14, fontWeight: '800'},
  timelineTime: {color: colors.inkSoft, fontSize: 12, marginTop: 1},

  // Amount
  breakdownTitle: {color: colors.navy, fontSize: 15, fontWeight: '900', marginBottom: 14},
  amountRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  amountLabel: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
  amountValue: {color: colors.navy, fontSize: 22, fontWeight: '900'},

  // Buttons
  invoiceBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 58, marginBottom: 12,
  },
  invoiceBtnIcon: {color: '#fff', fontSize: 18},
  invoiceBtnText: {color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1},
  rateBtn: {
    borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.lg,
    minHeight: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  rateBtnText: {color: colors.accent, fontSize: 16, fontWeight: '800'},
  doneBtn: {alignItems: 'center', paddingVertical: 14},
  doneBtnText: {color: colors.inkSoft, fontSize: 15, fontWeight: '700'},
});

export default PaymentReleasedScreen;
