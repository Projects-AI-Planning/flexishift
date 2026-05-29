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

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShiftDayCompleteScreenProps {
  shiftRef:   string;
  dayNumber:  number;
  totalDays:  number;
  isLastDay:  boolean;
  onRate:     () => void;   // only shown on last day
  onDone:     () => void;   // back to My Shifts
}

// ── Component ──────────────────────────────────────────────────────────────────

const ShiftDayCompleteScreen: React.FC<ShiftDayCompleteScreenProps> = ({
  shiftRef,
  dayNumber,
  totalDays,
  isLastDay,
  onRate,
  onDone,
}) => {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Success animation area ─────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <View style={styles.heroCircle}>
            <Text style={styles.heroIcon}>✓</Text>
          </View>
          <Text style={styles.heroTitle}>
            {isLastDay ? 'Shift Complete!' : `Day ${dayNumber} Done!`}
          </Text>
          <Text style={styles.heroSub}>
            {isLastDay
              ? `You've completed all ${totalDays} day${totalDays !== 1 ? 's' : ''} of shift ${shiftRef}.`
              : `Day ${dayNumber} of ${totalDays} submitted. Great work!`}
          </Text>
        </View>

        {/* ── Summary card ──────────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shift</Text>
            <Text style={styles.summaryValue}>{shiftRef}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Day Submitted</Text>
            <Text style={styles.summaryValue}>{dayNumber} of {totalDays}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {isLastDay ? 'FINAL DAY SUBMITTED' : 'DAY COMPLETE'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── What happens next ─────────────────────────────────────────────── */}
        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>WHAT HAPPENS NEXT</Text>
          {isLastDay ? (
            <>
              <Text style={styles.nextTitle}>Haulier processes final payment</Text>
              <Text style={styles.nextText}>
                The haulier will review your end-of-day proof and release your final payment. You'll receive a notification when it's processed.{'\n\n'}
                You can also leave a rating for your experience working with this haulier.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.nextTitle}>Haulier pays for Day {dayNumber + 1}</Text>
              <Text style={styles.nextText}>
                The haulier will process payment for Day {dayNumber + 1}. Once the payment is confirmed, you'll be able to start your next day.{'\n\n'}
                Come back tomorrow and tap "Start Day {dayNumber + 1}" when the payment is secured.
              </Text>
            </>
          )}
        </View>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${(dayNumber / totalDays) * 100}%`}]} />
          </View>
          <Text style={styles.progressLabel}>
            {dayNumber} / {totalDays} days {isLastDay ? 'complete' : 'done'}
          </Text>
        </View>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        {isLastDay && (
          <Pressable onPress={onRate} style={styles.rateBtn}>
            <Text style={styles.rateBtnIcon}>⭐</Text>
            <Text style={styles.rateBtnText}>Rate Your Haulier</Text>
          </Pressable>
        )}

        <Pressable onPress={onDone} style={[styles.doneBtn, isLastDay && styles.doneBtnOutlined]}>
          <Text style={[styles.doneBtnText, isLastDay && styles.doneBtnOutlinedText]}>
            {isLastDay ? 'Back to My Shifts' : '← My Shifts — See you tomorrow!'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 48, alignItems: 'center'},

  heroWrap: {alignItems: 'center', paddingVertical: spacing.xl * 1.5, gap: spacing.md},
  heroCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.accent, shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroIcon:  {fontSize: 48, color: '#FFFFFF', fontWeight: '900'},
  heroTitle: {fontSize: 28, fontWeight: '900', color: colors.navy ?? colors.ink, textAlign: 'center'},
  heroSub:   {fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20},

  summaryCard: {
    width: '100%', backgroundColor: colors.card,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm,
  },
  summaryRow:    {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  summaryDivider:{height: 1, backgroundColor: colors.border},
  summaryLabel:  {fontSize: 13, color: colors.inkSoft, fontWeight: '600'},
  summaryValue:  {fontSize: 14, color: colors.navy ?? colors.ink, fontWeight: '800'},
  statusBadge:   {backgroundColor: '#DCFCE7', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  statusBadgeText:{fontSize: 10, fontWeight: '900', color: '#15803D'},

  nextCard: {
    width: '100%', backgroundColor: '#EFF6FF',
    borderRadius: radius.xl, borderWidth: 1, borderColor: '#BFDBFE',
    padding: spacing.xl, marginBottom: spacing.lg, gap: 6,
  },
  nextLabel: {fontSize: 10, fontWeight: '900', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.8},
  nextTitle: {fontSize: 16, fontWeight: '800', color: colors.navy ?? colors.ink},
  nextText:  {fontSize: 13, color: colors.inkSoft, lineHeight: 20},

  progressWrap: {width: '100%', gap: 6, marginBottom: spacing.xl},
  progressTrack:{
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: '#E5E9F0', overflow: 'hidden',
  },
  progressFill: {height: '100%', backgroundColor: colors.accent, borderRadius: 4},
  progressLabel:{fontSize: 12, fontWeight: '700', color: colors.inkSoft, textAlign: 'right'},

  rateBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, marginBottom: spacing.md,
  },
  rateBtnIcon: {fontSize: 20},
  rateBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},

  doneBtn: {
    width: '100%', backgroundColor: colors.accent,
    borderRadius: radius.lg, minHeight: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2, borderColor: colors.accent,
  },
  doneBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '900'},
  doneBtnOutlinedText: {color: colors.accent},
});

export default ShiftDayCompleteScreen;
