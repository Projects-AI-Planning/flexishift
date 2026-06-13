import React, {useEffect, useRef} from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import ActiveJobMap from '../../components/map/ActiveJobMap';
import {colors, radius, spacing} from '../../theme';
import {driverApi} from '../../api/driverApi';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShiftTrackingScreenProps {
  shiftId:        string;
  shiftRef:       string;
  dayNumber:      number;
  totalDays:      number;
  daysCompleted:  number;
  pickupAddress:  string;
  dropAddress:    string;
  pickupLat?:     number | null;
  pickupLng?:     number | null;
  dropLat?:       number | null;
  dropLng?:       number | null;
  onEndDay:       () => void;  // navigate to end-of-day proof screen
  onBack:         () => void;  // back to My Shifts (without ending day)
}

// Push driver GPS to backend every N ms
const LOCATION_PUSH_INTERVAL_MS = 3_000;  // live location every 3s while on the tracking screen

// ── Component ──────────────────────────────────────────────────────────────────

const ShiftTrackingScreen: React.FC<ShiftTrackingScreenProps> = ({
  shiftId,
  shiftRef,
  dayNumber,
  totalDays,
  daysCompleted,
  pickupAddress,
  dropAddress,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  onEndDay,
  onBack,
}) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start periodic GPS push as soon as screen mounts
  useEffect(() => {
    const pushLocation = () => {
      Geolocation.getCurrentPosition(
        pos => {
          driverApi.shifts
            .updateLocation(shiftId, pos.coords.latitude, pos.coords.longitude)
            .catch(() => {/* silent */});
        },
        () => {/* permission denied / unavailable — ignore */},
        {enableHighAccuracy: true, timeout: 8000, maximumAge: 2000},  // fresh fix each 3s push
      );
    };

    // Push immediately, then on interval
    pushLocation();
    intervalRef.current = setInterval(pushLocation, LOCATION_PUSH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {clearInterval(intervalRef.current);}
    };
  }, [shiftId]);

  const pickupCoords =
    pickupLat != null && pickupLng != null
      ? {latitude: pickupLat, longitude: pickupLng}
      : null;

  const dropCoords =
    dropLat != null && dropLng != null
      ? {latitude: dropLat, longitude: dropLng}
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{shiftRef}</Text>
          <Text style={styles.headerSub}>
            Shift in progress
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Info row ─────────────────────────────────────────────────────────── */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Reporting Location</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{pickupAddress || '—'}</Text>
        </View>
        <Text style={styles.infoArrow}>→</Text>
        <View style={[styles.infoItem, {alignItems: 'flex-end'}]}>
          <Text style={styles.infoLabel}>To</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{dropAddress || '—'}</Text>
        </View>
      </View>

      {/* ── Live pulse indicator ─────────────────────────────────────────────── */}
      <View style={styles.liveBanner}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>
          Sharing your location with the haulier · every 10 s
        </Text>
      </View>

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        <ActiveJobMap
          pickupLocation={pickupAddress}
          dropLocation={dropAddress}
          pickupCoords={pickupCoords}
          dropCoords={dropCoords}
          liveMode
          onLocationUpdate={coords => {
            driverApi.shifts
              .updateLocation(shiftId, coords.latitude, coords.longitude)
              .catch(() => {});
          }}
        />
      </View>

      {/* ── Bottom card ──────────────────────────────────────────────────────── */}
      <View style={styles.bottomCard}>
        <Text style={styles.bottomNote}>
          Your route is shown above. Haulier can see your live position.
        </Text>
        {/* Primary action: end the work day and submit proof */}
        <Pressable onPress={onEndDay} style={styles.endDayBtn}>
          <Text style={styles.endDayBtnText}>✓  End Shift — Submit Proof</Text>
        </Pressable>
        {/* Secondary: go back without ending the day */}
        <Pressable onPress={onBack} style={styles.backLink} hitSlop={8}>
          <Text style={styles.backLinkText}>← Back to My Shifts (keep day active)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:     {width: 40, alignItems: 'flex-start', justifyContent: 'center'},
  backIcon:    {fontSize: 22, color: colors.ink, fontWeight: '700'},
  headerCenter:{flex: 1, alignItems: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '900', color: colors.navy ?? colors.ink},
  headerSub:   {fontSize: 12, fontWeight: '600', color: colors.inkSoft, marginTop: 2},

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 8,
  },
  infoItem:  {flex: 1},
  infoLabel: {fontSize: 10, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4},
  infoValue: {fontSize: 13, fontWeight: '800', color: colors.navy ?? colors.ink, marginTop: 2},
  infoArrow: {fontSize: 18, color: colors.inkSoft, fontWeight: '700'},

  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF8FF',
    paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent,
  },
  liveText: {fontSize: 12, color: colors.accent, fontWeight: '700'},

  mapWrap: {flex: 1},

  bottomCard: {
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.lg, gap: 10,
  },
  bottomNote: {
    fontSize: 12, color: colors.inkSoft, fontWeight: '600',
    textAlign: 'center', lineHeight: 18,
  },
  endDayBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endDayBtnText: {color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.2},
  backLink: {alignItems: 'center', paddingVertical: 6},
  backLinkText: {color: colors.inkSoft, fontSize: 12, fontWeight: '700'},
});

export default ShiftTrackingScreen;
