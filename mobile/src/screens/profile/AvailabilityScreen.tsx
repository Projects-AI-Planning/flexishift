import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

interface AvailabilityScreenProps {
  availabilityForm: {
    availableDays: string[];
    endTime: string;
    isAvailable: boolean;
    reason: string;
    startTime: string;
    timezone: string;
  };
  onToggleDay: (day: string) => void;
  onChangeForm: (patch: Partial<AvailabilityScreenProps['availabilityForm']>) => void;
  onSave: () => void;
  onToggleAvailability: () => void;
  onBack?: () => void;
  loading: boolean;
}

const dayCards = [
  {key: 'monday',    short: 'MON'},
  {key: 'tuesday',   short: 'TUE'},
  {key: 'wednesday', short: 'WED'},
  {key: 'thursday',  short: 'THU'},
  {key: 'friday',    short: 'FRI'},
  {key: 'saturday',  short: 'SAT'},
  {key: 'sunday',    short: 'SUN'},
];

const shiftCards = [
  {key: 'morning',   icon: '☀',  title: 'Morning',   startTime: '06:00', endTime: '14:00', display: '06:00 – 14:00'},
  {key: 'afternoon', icon: '⛅', title: 'Afternoon', startTime: '14:00', endTime: '22:00', display: '14:00 – 22:00'},
  {key: 'night',     icon: '🌙', title: 'Night',     startTime: '22:00', endTime: '06:00', display: '22:00 – 06:00'},
];

const AvailabilityScreen: React.FC<AvailabilityScreenProps> = ({
  availabilityForm,
  onToggleDay,
  onChangeForm,
  onSave,
  onToggleAvailability,
  onBack,
  loading,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Status toggle */}
        <Card title="Current Status" variant="default">
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusLabel}>STATUS</Text>
              <Text style={styles.statusValue}>
                {availabilityForm.isAvailable
                  ? 'Available for dispatch'
                  : 'Currently unavailable'}
              </Text>
            </View>
            <Switch
              value={availabilityForm.isAvailable}
              onValueChange={onToggleAvailability}
              trackColor={{false: '#CBD5E1', true: colors.accent}}
              thumbColor={colors.card}
            />
          </View>
        </Card>

        {/* Week days */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Working Days</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}>
          {dayCards.map(day => {
            const active = availabilityForm.availableDays.includes(day.key);
            return (
              <Pressable
                key={day.key}
                onPress={() => onToggleDay(day.key)}
                style={[styles.dayCard, active && styles.dayCardActive]}>
                <Text style={[styles.dayShort, active && styles.dayTextActive]}>
                  {day.short}
                </Text>
                {active && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Shifts */}
        <Text style={styles.sectionTitle}>Available Shifts</Text>
        <View style={styles.shiftList}>
          {shiftCards.map(shift => {
            const active = availabilityForm.startTime === shift.startTime;
            return (
              <Pressable
                key={shift.key}
                onPress={() => onChangeForm({startTime: shift.startTime, endTime: shift.endTime})}
                style={({pressed}) => [
                  styles.shiftCard,
                  active && styles.shiftCardActive,
                  pressed && styles.shiftCardPressed,
                ]}>
                <View style={[styles.shiftIconBox, active && styles.shiftIconBoxActive]}>
                  <Text style={styles.shiftIcon}>{shift.icon}</Text>
                </View>
                <View style={styles.shiftCopy}>
                  <Text style={[styles.shiftTitle, active && styles.shiftTitleActive]}>
                    {shift.title}
                  </Text>
                  <Text style={styles.shiftTime}>{shift.display}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Custom hours */}
        <Card title="Adjust Hours" variant="default">
          <TextInput
            style={styles.input}
            placeholder="Start time (e.g. 08:00)"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.startTime}
            onChangeText={startTime => onChangeForm({startTime})}
          />
          <TextInput
            style={styles.input}
            placeholder="End time (e.g. 18:00)"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.endTime}
            onChangeText={endTime => onChangeForm({endTime})}
          />
          <TextInput
            style={styles.input}
            placeholder="Timezone (e.g. Asia/Kolkata)"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.timezone}
            onChangeText={timezone => onChangeForm({timezone})}
          />
          {!availabilityForm.isAvailable && (
            <TextInput
              style={styles.input}
              placeholder="Reason for unavailability"
              placeholderTextColor="#98A2B3"
              value={availabilityForm.reason}
              onChangeText={reason => onChangeForm({reason})}
            />
          )}
        </Card>

        {/* Pro tip */}
        <Card title="Pro Tip" variant="dark">
          <Text style={styles.proTipText}>
            Consistent availability increases your dispatch priority by up to 25% for high-value freight.
          </Text>
        </Card>

        {/* Save */}
        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving…' : 'Save Schedule'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8EDF3',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  backArrow: {fontSize: 18, color: colors.navy, fontWeight: '700'},
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '900', color: colors.navy,
  },
  headerSpacer: {width: 36},

  // ── Content ───────────────────────────────────────────────────────────────
  content: {padding: spacing.lg, paddingBottom: 48, gap: spacing.md},

  // ── Status card ───────────────────────────────────────────────────────────
  statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  statusLeft: {flex: 1},
  statusLabel: {
    color: '#6B7280', fontSize: 11, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  statusValue: {color: colors.navy, fontSize: 15, fontWeight: '700', marginTop: 4},

  // ── Days ──────────────────────────────────────────────────────────────────
  sectionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {
    color: colors.navy, fontSize: 15, fontWeight: '900', marginBottom: spacing.sm,
  },
  daysRow: {gap: spacing.sm, paddingBottom: spacing.md},
  dayCard: {
    width: 52, height: 68, borderRadius: radius.md,
    borderWidth: 1, borderColor: '#D6DCE5',
    backgroundColor: '#F8FAFD', alignItems: 'center',
    justifyContent: 'center', gap: 4,
  },
  dayCardActive: {backgroundColor: colors.navy, borderColor: colors.navy},
  dayShort: {color: '#6B7280', fontSize: 11, fontWeight: '800'},
  dayTextActive: {color: '#fff'},
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent,
  },

  // ── Shifts ────────────────────────────────────────────────────────────────
  shiftList: {gap: spacing.sm, marginBottom: spacing.sm},
  shiftCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.md,
  },
  shiftCardActive: {borderColor: colors.accent, borderWidth: 1.5, backgroundColor: '#FFFBEB'},
  shiftCardPressed: {backgroundColor: '#F8FAFC'},
  shiftIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  shiftIconBoxActive: {backgroundColor: '#FEF3C7'},
  shiftIcon: {fontSize: 20},
  shiftCopy: {flex: 1},
  shiftTitle: {color: colors.navy, fontSize: 14, fontWeight: '800'},
  shiftTitleActive: {color: colors.accent},
  shiftTime: {color: '#6B7280', fontSize: 12, marginTop: 2},
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#9CA3AF',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  radioActive: {borderColor: colors.accent},
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.accent,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: radius.md, backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.lg, minHeight: 48,
    color: colors.ink, fontSize: 15, marginBottom: spacing.sm,
  },

  // ── Pro tip ───────────────────────────────────────────────────────────────
  proTipText: {color: '#fff', fontSize: 13, lineHeight: 20},

  // ── Save button ───────────────────────────────────────────────────────────
  saveButton: {
    backgroundColor: colors.navy, borderRadius: radius.lg,
    minHeight: 54, alignItems: 'center', justifyContent: 'center',
    shadowColor: shadow.color, shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity, shadowRadius: shadow.radius,
    elevation: 4,
  },
  saveButtonText: {color: '#fff', fontSize: 16, fontWeight: '900'},
});

export default AvailabilityScreen;
