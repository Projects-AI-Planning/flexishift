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

interface QuoteStatusScreenProps {
  type: 'accepted' | 'rejected';
  quote: Record<string, unknown>;
  recommendedJobs?: Array<Record<string, unknown>>;
  onViewJob: () => void;
  onFindJobs: () => void;
  onDismiss: () => void;
}

function addr(val: unknown): string {
  if (!val) {return '';}
  if (typeof val === 'string') {return val;}
  if (typeof val === 'object' && val !== null && 'address' in val) {
    return String((val as {address?: string}).address ?? '');
  }
  return String(val);
}

const QuoteStatusScreen: React.FC<QuoteStatusScreenProps> = ({
  type,
  quote,
  recommendedJobs = [],
  onViewJob,
  onFindJobs,
  onDismiss,
}) => {
  const isAccepted = type === 'accepted';
  const jobRef = String(quote.jobReference ?? quote.jobId ?? '');
  const pickup = addr(quote.pickupLocation);
  const drop = addr(quote.dropLocation);
  const goodsType = String(quote.goodsType ?? '—');
  const weight = String(quote.weight ?? '—');

  if (isAccepted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Checkmark */}
          <View style={styles.iconWrap}>
            <View style={[styles.iconRing, styles.iconRingBlue]}>
              <View style={[styles.iconCircle, styles.iconCircleBlue]}>
                <Text style={styles.iconMark}>✓</Text>
              </View>
            </View>
          </View>

          <Text style={styles.headingAccepted}>Quote Accepted</Text>
          <Text style={styles.subAccepted}>
            Haulier has confirmed your bid for shipment{' '}
            <Text style={styles.jobRefText}>{jobRef}</Text>.
          </Text>

          {/* Shipment Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SHIPMENT SUMMARY</Text>
            <View style={styles.divider} />

            {pickup ? (
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.dotPickup]} />
                <View>
                  <Text style={styles.routeTag}>PICKUP</Text>
                  <Text style={styles.routeValue}>{pickup}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.routeConnector} />

            {drop ? (
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.dotDrop]}>
                  <Text style={styles.routeDotIcon}>🚚</Text>
                </View>
                <View>
                  <Text style={styles.routeTag}>DESTINATION</Text>
                  <Text style={styles.routeValue}>{drop}</Text>
                </View>
              </View>
            ) : null}

            {(goodsType !== '—' || weight !== '—') ? (
              <>
                <View style={styles.divider} />
                <View style={styles.specRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>CARGO TYPE</Text>
                    <Text style={styles.specValue}>{goodsType}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>WEIGHT</Text>
                    <Text style={styles.specValue}>{weight}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Escrow notice */}
          <View style={styles.escrowBox}>
            <Text style={styles.escrowIcon}>🔒</Text>
            <Text style={styles.escrowText}>
              Payment has been secured in escrow and will be released upon delivery confirmation.
            </Text>
          </View>

          <Pressable onPress={onViewJob} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Continue to Booking →</Text>
          </Pressable>
          <Text style={styles.flowHint}>
            This will open the booking step, then load code verification and handover.
          </Text>

          <Pressable onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Rejected state
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* X icon */}
        <View style={styles.iconWrap}>
          <View style={[styles.iconRing, styles.iconRingGrey]}>
            <View style={[styles.iconCircle, styles.iconCircleGrey]}>
              <Text style={styles.iconMarkRej}>✕</Text>
            </View>
          </View>
        </View>

        <Text style={styles.headingRejected}>Quote Not Selected</Text>
        <Text style={styles.subRejected}>
          The haulier has moved forward with another quote for{' '}
          <Text style={styles.jobRefText}>{jobRef}</Text>.
          {' '}Don't worry, there are plenty of other opportunities waiting for you.
        </Text>

        <Pressable onPress={onFindJobs} style={styles.findJobsBtn}>
          <Text style={styles.findJobsBtnText}>🔍 Browse Available Jobs</Text>
        </Pressable>

        {/* Recommended Jobs */}
        {recommendedJobs.length > 0 ? (
          <>
            <View style={styles.recHeader}>
              <Text style={styles.recTitle}>Recommended Jobs</Text>
              <Text style={styles.recSubtitle}>BASED ON YOUR ACTIVITY</Text>
            </View>
            {recommendedJobs.slice(0, 3).map((job, idx) => {
              const jRef = String(job.jobReference ?? job.jobId ?? `JOB-${idx}`);
              const jPickup = addr(job.pickupLocation);
              const jDrop = addr(job.dropLocation);
              const jAmount = job.agreedAmount ?? job.amount ?? null;
              return (
                <View key={jRef} style={styles.recCard}>
                  <View style={styles.recCardTop}>
                    <Text style={styles.recRef}>{jRef}</Text>
                    {jAmount ? (
                      <Text style={styles.recAmount}>
                        ₹{Number(jAmount).toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                  {jPickup ? (
                    <View style={styles.recRoute}>
                      <Text style={styles.recRouteIcon}>📍</Text>
                      <Text style={styles.recRouteText}>From: {jPickup}</Text>
                    </View>
                  ) : null}
                  {jDrop ? (
                    <View style={styles.recRoute}>
                      <Text style={styles.recRouteIcon}>🏁</Text>
                      <Text style={styles.recRouteText}>To: {jDrop}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      onDismiss();
                      onFindJobs();
                    }}
                    style={styles.quoteNowBtn}>
                    <Text style={styles.quoteNowText}>Quote Now →</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Tip box */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Want to improve your quote acceptance?</Text>
          <Text style={styles.tipDesc}>
            Complete your driver profile and upload recent safety certifications to stand out to hauliers.
          </Text>
          <Pressable onPress={onDismiss} style={styles.tipBtn}>
            <Text style={styles.tipBtnText}>Update Profile</Text>
          </Pressable>
        </View>

        <Pressable onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissBtnText}>Back to My Bids</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 48, alignItems: 'stretch'},

  // Icon
  iconWrap: {alignItems: 'center', marginTop: 24, marginBottom: 20},
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  iconRingBlue: {backgroundColor: '#D9EAF9'},
  iconRingGrey: {backgroundColor: '#EAECEF'},
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  iconCircleBlue: {backgroundColor: colors.accent},
  iconCircleGrey: {backgroundColor: '#B0BAC4'},
  iconMark: {color: '#fff', fontSize: 30, fontWeight: '900'},
  iconMarkRej: {color: '#fff', fontSize: 28, fontWeight: '900'},

  // Accepted
  headingAccepted: {
    color: colors.ink, fontSize: 28, fontWeight: '900',
    textAlign: 'center', marginBottom: 10,
  },
  subAccepted: {
    color: colors.inkSoft, fontSize: 15, lineHeight: 22,
    textAlign: 'center', marginBottom: 24,
  },
  flowHint: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  jobRefText: {color: colors.accent, fontWeight: '800'},

  // Summary card
  summaryCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, marginBottom: 16,
  },
  summaryLabel: {
    color: colors.inkSoft, fontSize: 11, fontWeight: '900',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
  },
  divider: {height: 1, backgroundColor: colors.border, marginVertical: 14},
  routeRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 14},
  routeDot: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  dotPickup: {backgroundColor: '#EAF3FD'},
  dotDrop: {backgroundColor: '#D9F3E8'},
  routeDotIcon: {fontSize: 14},
  routeConnector: {
    width: 2, height: 16, backgroundColor: colors.border, marginLeft: 15,
  },
  routeTag: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  routeValue: {color: colors.navy, fontSize: 16, fontWeight: '800', marginTop: 2},
  specRow: {flexDirection: 'row', gap: 24},
  specItem: {flex: 1},
  specLabel: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
  },
  specValue: {color: colors.ink, fontSize: 15, fontWeight: '700'},

  // Escrow
  escrowBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F0FBF4', borderRadius: radius.md,
    padding: spacing.lg, marginBottom: 24,
    borderWidth: 1, borderColor: '#C3EDD0',
  },
  escrowIcon: {fontSize: 18, flexShrink: 0},
  escrowText: {flex: 1, color: '#16613A', fontSize: 13, lineHeight: 20},

  // Rejected
  headingRejected: {
    color: colors.ink, fontSize: 26, fontWeight: '900',
    textAlign: 'center', marginBottom: 10,
  },
  subRejected: {
    color: colors.inkSoft, fontSize: 15, lineHeight: 22,
    textAlign: 'center', marginBottom: 24,
  },
  findJobsBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  findJobsBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},

  // Recommended
  recHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  recTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  recSubtitle: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.5},
  recCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: 12,
  },
  recCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  recRef: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  recAmount: {color: colors.success, fontSize: 15, fontWeight: '900'},
  recRoute: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  recRouteIcon: {fontSize: 13},
  recRouteText: {color: colors.inkSoft, fontSize: 13},
  quoteNowBtn: {
    borderWidth: 1, borderColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 10, alignItems: 'center', marginTop: 10,
  },
  quoteNowText: {color: colors.accent, fontSize: 14, fontWeight: '800'},

  // Tip
  tipBox: {
    backgroundColor: colors.navy, borderRadius: radius.lg,
    padding: spacing.xl, marginTop: 8, marginBottom: 24,
  },
  tipTitle: {color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 8},
  tipDesc: {color: '#C4CDD6', fontSize: 13, lineHeight: 19, marginBottom: 16},
  tipBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  tipBtnText: {color: '#fff', fontSize: 14, fontWeight: '800'},

  // Shared
  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 58, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
  dismissBtn: {alignItems: 'center', paddingVertical: 14},
  dismissBtnText: {color: colors.inkSoft, fontSize: 15, fontWeight: '700'},
});

export default QuoteStatusScreen;
