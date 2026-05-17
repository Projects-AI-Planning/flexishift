import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Card from '../../components/common/Card';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing} from '../../theme';

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
  loading: boolean;
}

const dayCards = [
  {key: 'monday', short: 'MON'},
  {key: 'tuesday', short: 'TUE'},
  {key: 'wednesday', short: 'WED'},
  {key: 'thursday', short: 'THU'},
  {key: 'friday', short: 'FRI'},
  {key: 'saturday', short: 'SAT'},
  {key: 'sunday', short: 'SUN'},
];

const shiftCards = [
  {key: 'morning', title: 'Morning', startTime: '06:00', endTime: '14:00', display: '06:00 - 14:00'},
  {key: 'afternoon', title: 'Afternoon', startTime: '14:00', endTime: '22:00', display: '14:00 - 22:00'},
  {key: 'night', title: 'Night', startTime: '22:00', endTime: '06:00', display: '22:00 - 06:00'},
];

const AvailabilityScreen: React.FC<AvailabilityScreenProps> = ({
  availabilityForm,
  onToggleDay,
  onChangeForm,
  onSave,
  onToggleAvailability,
  loading,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Availability</Text>
        <Text style={styles.subtitle}>Manage when you want to receive dispatches</Text>
      </View>

      <Card title="Current Status" variant="default">
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusLabel}>STATUS</Text>
            <Text style={styles.statusValue}>
              {availabilityForm.isAvailable ? 'Available for dispatch' : 'Currently unavailable'}
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

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Working Days</Text>
      </View>
      <View style={styles.daysRow}>
        {dayCards.map(day => {
          const active = availabilityForm.availableDays.includes(day.key);
          return (
            <Pressable
              key={day.key}
              onPress={() => onToggleDay(day.key)}
              style={[styles.dayCard, active && styles.dayCardActive]}>
              <Text style={[styles.dayShort, active && styles.dayTextActive]}>{day.short}</Text>
              {active ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>

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
              <View style={styles.shiftCopy}>
                <Text style={[styles.shiftTitle, active && styles.shiftTitleActive]}>{shift.title}</Text>
                <Text style={styles.shiftTime}>{shift.display}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card title="Adjust Hours" variant="default">
        <AppInput
          placeholder="Start time (e.g. 08:00)"
          value={availabilityForm.startTime}
          onChangeText={startTime => onChangeForm({startTime})}
        />
        <AppInput
          placeholder="End time (e.g. 18:00)"
          value={availabilityForm.endTime}
          onChangeText={endTime => onChangeForm({endTime})}
        />
        <AppInput
          placeholder="Timezone (e.g. Asia/Kolkata)"
          value={availabilityForm.timezone}
          onChangeText={timezone => onChangeForm({timezone})}
        />
        {!availabilityForm.isAvailable ? (
          <AppInput
            placeholder="Reason for unavailability"
            value={availabilityForm.reason}
            onChangeText={reason => onChangeForm({reason})}
            containerStyle={{marginBottom: 0}}
          />
        ) : null}
      </Card>

      <Card title="Pro Tip" variant="dark">
        <Text style={styles.proTipText}>
          Consistent availability increases your dispatch priority by up to 25% for high-value freight.
        </Text>
      </Card>

      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Schedule'}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  statusLeft: {flex: 1},
  statusLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusValue: {color: colors.navy, fontSize: 14, fontWeight: '700', marginTop: 3},
  sectionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayCard: {
    flex: 1,
    marginHorizontal: 2,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D6DCE5',
    backgroundColor: '#F8FAFD',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayCardActive: {backgroundColor: '#1066B1', borderColor: '#1066B1'},
  dayShort: {color: '#6B7280', fontSize: 11, fontWeight: '800'},
  dayTextActive: {color: '#fff'},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  shiftList: {gap: spacing.xs, marginBottom: spacing.xs},
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shiftCardActive: {borderColor: colors.accent, borderWidth: 1.5, backgroundColor: '#FFFBEB'},
  shiftCardPressed: {backgroundColor: '#F8FAFC'},
  shiftCopy: {flex: 1},
  shiftTitle: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  shiftTitleActive: {color: '#9A3412'},
  shiftTime: {color: colors.inkSoft, fontSize: 13, marginTop: 2},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {borderColor: colors.accent},
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    color: colors.ink,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  proTipText: {color: '#F8FAFC', fontSize: 13, lineHeight: 20},
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default AvailabilityScreen;
