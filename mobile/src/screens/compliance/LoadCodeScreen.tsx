import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, radius} from '../../theme';
import {driverApi} from '../../api/driverApi';

interface LoadCodeScreenProps {
  jobId: string;
  jobReference: string;
  onVerify: (code: string) => Promise<void>;
  onOpenScanner: () => void;
  loading: boolean;
  error: string | null;
}

const LoadCodeScreen: React.FC<LoadCodeScreenProps> = ({
  jobId,
  jobReference,
  onVerify,
  onOpenScanner,
  loading,
  error,
}) => {
  const [code, setCode] = useState('');
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [jobLoading, setJobLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {return;}
    setJobLoading(true);
    driverApi.jobs.getDetails(jobId)
      .then(data => setJob(data as Record<string, unknown>))
      .catch(() => setJob(null))
      .finally(() => setJobLoading(false));
  }, [jobId]);

  const pickup   = String(job?.pickupLocation  ?? job?.pickupAddress  ?? '—');
  const drop     = String(job?.dropLocation    ?? job?.dropAddress    ?? '—');
  const cargo    = String(job?.goodsType       ?? job?.cargoType      ?? '—');
  const vehicle  = String(job?.vehicleTypeRequired ?? job?.vehicleType ?? '—');
  const jobDate  = String(job?.jobDate         ?? '—');
  const weight   = job?.weightKg ? `${job.weightKg} kg` : '—';
  const ref      = String(job?.jobReference    ?? job?.jobRef ?? jobReference ?? jobId);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <Text style={styles.stepTitle}>Step 1 of 3</Text>
        </View>
        <Text style={styles.mainTitle}>Load Code Confirmation</Text>
        <Text style={styles.subtitle}>
          Enter the 8-character code provided by the warehouse or shipper at pickup.
        </Text>

        {/* Job info card */}
        {jobLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Loading job details…</Text>
          </View>
        ) : (
          <View style={styles.jobCard}>
            <View style={styles.jobCardHeader}>
              <Text style={styles.jobRef}>{ref}</Text>
              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>PICKUP</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.dotGreen]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeValue}>{pickup}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.dotAmber]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>DROP-OFF</Text>
                  <Text style={styles.routeValue}>{drop}</Text>
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>CARGO</Text>
                <Text style={styles.metaValue}>{cargo}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>VEHICLE</Text>
                <Text style={styles.metaValue}>{vehicle}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DATE</Text>
                <Text style={styles.metaValue}>{jobDate}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>WEIGHT</Text>
                <Text style={styles.metaValue}>{weight}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Code input */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Enter Load Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="XXXXXXXX"
            placeholderTextColor="#9AA4B2"
            keyboardType="default"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={code}
            onChangeText={text => setCode(text.toUpperCase())}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.hintText}>
            This code ensures the right vehicle is picking up the correct cargo.
          </Text>
        </View>

        <Pressable
          onPress={() => onVerify(code)}
          disabled={loading || code.length < 8}
          style={[styles.primaryButton, (loading || code.length < 8) && styles.disabledButton]}>
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.primaryButtonText}>Confirm & Proceed →</Text>
          )}
        </Pressable>

        <Pressable onPress={onOpenScanner} style={styles.scannerButton}>
          <Text style={styles.scannerButtonText}>Can't find code? Open Scanner</Text>
        </Pressable>

        <Text style={styles.nextStepText}>
          After verification, continue to the handover checklist.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1, padding: spacing.xl},

  stepRow: {alignItems: 'flex-end', marginBottom: spacing.sm},
  stepTitle: {fontSize: 13, fontWeight: '800', color: colors.accent, textTransform: 'uppercase'},

  mainTitle: {fontSize: 28, fontWeight: '900', color: colors.navy, marginBottom: spacing.sm},
  subtitle: {fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.lg},

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFD', borderRadius: radius.lg,
    padding: spacing.xl, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  loadingText: {color: colors.inkSoft, fontSize: 14},

  jobCard: {
    backgroundColor: colors.navy, borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.lg, gap: spacing.md,
  },
  jobCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  jobRef: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},
  openBadge: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  openBadgeText: {color: colors.navy, fontSize: 10, fontWeight: '900'},

  routeRow: {gap: spacing.sm},
  routePoint: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
  dot: {width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0},
  dotGreen: {backgroundColor: '#34D399'},
  dotAmber: {backgroundColor: colors.accent},
  routeLine: {width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 4},
  routeInfo: {flex: 1},
  routeLabel: {color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  routeValue: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 1},

  metaRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm,
  },
  metaItem: {flex: 1, alignItems: 'center'},
  metaDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4},
  metaLabel: {color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2},
  metaValue: {color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center'},

  codeCard: {
    backgroundColor: '#F8FAFD', borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  codeLabel: {
    fontSize: 13, fontWeight: '900', color: colors.navy,
    textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  codeInput: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg,
    paddingVertical: 16, fontSize: 26, fontWeight: '900',
    color: colors.navy, textAlign: 'center', letterSpacing: 10,
    borderWidth: 2, borderColor: colors.border,
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center'},
  hintText: {fontSize: 12, color: colors.inkSoft, textAlign: 'center', lineHeight: 17},

  primaryButton: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  disabledButton: {opacity: 0.45},
  primaryButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},

  scannerButton: {
    alignItems: 'center', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, marginBottom: spacing.md,
  },
  scannerButtonText: {color: colors.ink, fontSize: 14, fontWeight: '800'},

  nextStepText: {
    color: colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center',
  },
});

export default LoadCodeScreen;
