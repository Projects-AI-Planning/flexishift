import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Switch,
  TextInput,
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
  loading: boolean;
}

const dayCards = [
  {key: 'monday', short: 'MON', num: '23'},
  {key: 'tuesday', short: 'TUE', num: '24'},
  {key: 'wednesday', short: 'WED', num: '25'},
  {key: 'thursday', short: 'THU', num: '26'},
  {key: 'friday', short: 'FRI', num: '27'},
  {key: 'saturday', short: 'SAT', num: '28'},
  {key: 'sunday', short: 'SUN', num: '29'},
];

const shiftCards = [
  {key: 'morning', icon: '\u2600', title: 'Morning Shift', time: '06:00 - 14:00'},
  {key: 'afternoon', icon: '\u26C5', title: 'Afternoon Shift', time: '14:00 - 22:00'},
  {key: 'night', icon: '\u263D', title: 'Night Shift', time: '22:00 - 06:00'},
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.backText}>{'\u2190'}</Text>
          <Text style={styles.title}>Availability</Text>
          <Pressable onPress={onSave}>
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>

        <Card title="Current Status" variant="default">
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>CURRENT STATUS</Text>
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

        <View style={styles.weekRow}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <Text style={styles.sectionMuted}>October 2023</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {dayCards.map(day => {
            const active = availabilityForm.availableDays.includes(day.key);
            return (
              <Pressable
                key={day.key}
                onPress={() => onToggleDay(day.key)}
                style={[styles.dayCard, active && styles.dayCardActive]}>
                <Text style={[styles.dayShort, active && styles.dayTextActive]}>{day.short}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>{day.num}</Text>
                {active ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Available Shifts</Text>
        {shiftCards.map(shift => {
          const active = shift.key === 'afternoon';
          return (
            <Card key={shift.key} title={shift.title} variant="default">
              <View style={[styles.shiftRow, active && styles.shiftRowActive]}>
                <View style={styles.shiftIconBox}>
                  <Text style={styles.shiftIcon}>{shift.icon}</Text>
                </View>
                <View style={styles.shiftCopy}>
                  <Text style={styles.shiftTitle}>{shift.title}</Text>
                  <Text style={styles.shiftTime}>{shift.time}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
              </View>
            </Card>
          );
        })}

        <View style={styles.customHours}>
          <Text style={styles.customHoursText}>{'\u002B'} Set Custom Hours</Text>
        </View>

        <Card title="Pro Tip" variant="dark">
          <Text style={styles.proTipText}>
            Consistent availability increases your dispatch priority by up to 25% for high-value freight.
          </Text>
        </Card>

        <Card title="Adjust Hours" variant="default">
          <TextInput
            style={styles.input}
            placeholder="Start time"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.startTime}
            onChangeText={startTime => onChangeForm({startTime})}
          />
          <TextInput
            style={styles.input}
            placeholder="End time"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.endTime}
            onChangeText={endTime => onChangeForm({endTime})}
          />
          <TextInput
            style={styles.input}
            placeholder="Timezone"
            placeholderTextColor="#98A2B3"
            value={availabilityForm.timezone}
            onChangeText={timezone => onChangeForm({timezone})}
          />
          {!availabilityForm.isAvailable ? (
            <TextInput
              style={styles.input}
              placeholder="Reason"
              placeholderTextColor="#98A2B3"
              value={availabilityForm.reason}
              onChangeText={reason => onChangeForm({reason})}
            />
          ) : null}
        </Card>

        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Schedule'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backText: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    width: 44,
  },
  title: {
    flex: 1,
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
  saveText: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#4B5563',
    fontSize: 28,
    letterSpacing: 1,
  },
  statusValue: {
    color: colors.navy,
    fontSize: 20,
    marginTop: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  sectionMuted: {
    color: '#525966',
    fontSize: 20,
  },
  daysRow: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  dayCard: {
    width: 120,
    height: 160,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dayShort: {
    color: '#4B5563',
    fontSize: 20,
    fontWeight: '700',
  },
  dayNum: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  dayTextActive: {
    color: colors.card,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFA84D',
    marginTop: spacing.md,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shiftRowActive: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 20,
    padding: spacing.md,
  },
  shiftIconBox: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#CBE0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftIcon: {
    fontSize: 42,
  },
  shiftCopy: {
    flex: 1,
  },
  shiftTitle: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  shiftTime: {
    color: '#525966',
    fontSize: 22,
    marginTop: 4,
  },
  radio: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#707781',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  customHours: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  customHoursText: {
    color: '#4B5563',
    fontSize: 20,
    fontWeight: '800',
  },
  proTipText: {
    color: colors.card,
    fontSize: 20,
    lineHeight: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    color: colors.ink,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
  },
});

export default AvailabilityScreen;
