import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

interface LiveTrackingScreenProps {
  activeJob: any;
  trackingEta: any;
  complianceStatus: any;
  onUpdateLocation: (location: any) => void;
  onStopTracking: () => void;
  onGoToLoadCode: () => void;
  onGoToHandover: () => void;
  onGoToDelivery: () => void;
  onReportIncident: () => void;
}

type ComplianceStep = 'load_code' | 'handover' | 'in_transit' | 'delivery' | 'done';

function resolveStep(complianceStatus: any, activeJob: any): ComplianceStep {
  const status = (complianceStatus?.currentStep ?? activeJob?.currentComplianceStep ?? '').toLowerCase();
  if (!status || status === 'load_code') {return 'load_code';}
  if (status === 'handover' || status === 'vehicle_handover') {return 'handover';}
  if (status === 'in_transit') {return 'in_transit';}
  if (status === 'delivery' || status === 'deliver') {return 'delivery';}
  if (status === 'completed' || status === 'done') {return 'done';}
  const jobStatus = (activeJob?.status ?? '').toLowerCase();
  if (jobStatus === 'in_transit') {return 'in_transit';}
  return 'load_code';
}

const STEPS = [
  {id: 'load_code', label: 'Load Code'},
  {id: 'handover', label: 'Handover'},
  {id: 'in_transit', label: 'In Transit'},
  {id: 'delivery', label: 'Delivery'},
];

const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  activeJob,
  trackingEta,
  complianceStatus,
  onUpdateLocation,
  onStopTracking,
  onGoToLoadCode,
  onGoToHandover,
  onGoToDelivery,
  onReportIncident,
}) => {
  const [progress, setProgress] = useState(12);
  const currentStep = resolveStep(complianceStatus, activeJob);
  const isInTransit = currentStep === 'in_transit';

  useEffect(() => {
    if (!isInTransit) {return;}
    const interval = setInterval(() => {
      setProgress(prev => (prev < 92 ? prev + 1 : 92));
    }, 1500);
    return () => clearInterval(interval);
  }, [isInTransit]);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noJobWrap}>
          <Text style={styles.noJobIcon}>🚚</Text>
          <Text style={styles.noJobTitle}>No Active Trip</Text>
          <Text style={styles.noJobSub}>
            Accept a job and proceed through compliance to start live tracking.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Compliance Step Progress Bar */}
      <View style={styles.stepBar}>
        {STEPS.map((step, idx) => {
          const isDone = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isCurrent && styles.stepDotCurrent,
                ]}>
                  <Text style={[styles.stepDotText, (isDone || isCurrent) && styles.stepDotTextActive]}>
                    {isDone ? '✓' : String(idx + 1)}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>
                  {step.label}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, idx < stepIndex && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderTitle}>{activeJob?.jobReference || 'Active Trip'}</Text>
          <Text style={styles.mapHeaderSubtitle}>
            ETA {trackingEta?.estimatedArrival || '—'}
          </Text>
        </View>
        <View style={styles.mapMock}>
          <View style={styles.routeLine} />
          <View style={styles.routeLineSecondary} />
          <View style={[styles.marker, styles.markerStart]} />
          {isInTransit && (
            <View style={[styles.marker, styles.markerTruck, {left: `${progress}%`}]} />
          )}
          <View style={[styles.marker, styles.markerEnd]} />
          <Text style={styles.remainingText}>
            {trackingEta?.distanceRemaining || '— km remaining'}
          </Text>
        </View>
        <View style={styles.zoomStack}>
          <Pressable style={styles.zoomBtn}>
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn}>
            <Text style={styles.zoomText}>−</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{trackingEta?.estimatedArrival || '—'}</Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{trackingEta?.distanceRemaining || '—'}</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{trackingEta?.estimatedDuration || '—'}</Text>
            <Text style={styles.metricLabel}>Time Left</Text>
          </View>
        </View>

        <View style={styles.journeyCard}>
          <Text style={styles.journeyLabel}>Journey actions</Text>
          <Text style={styles.journeyTitle}>Move to the next job step</Text>
          <View style={styles.journeyButtonRow}>
            <Pressable onPress={onGoToLoadCode} style={[styles.journeyBtn, currentStep === 'load_code' && styles.journeyBtnActive]}>
              <Text style={styles.journeyBtnText}>Load Code</Text>
            </Pressable>
            <Pressable onPress={onGoToHandover} style={[styles.journeyBtn, currentStep === 'handover' && styles.journeyBtnActive]}>
              <Text style={styles.journeyBtnText}>Handover</Text>
            </Pressable>
            <Pressable onPress={onGoToDelivery} style={[styles.journeyBtn, currentStep === 'delivery' && styles.journeyBtnActive]}>
              <Text style={styles.journeyBtnText}>Delivery</Text>
            </Pressable>
          </View>
          <Text style={styles.journeyHint}>
            Use these buttons to move through the compliance flow without leaving this screen.
          </Text>
        </View>

        {/* Compliance Action CTA */}
        {currentStep === 'load_code' && (
          <Pressable onPress={onGoToLoadCode} style={styles.complianceCta}>
            <Text style={styles.complianceCtaIcon}>🔑</Text>
            <View style={styles.complianceCtaText}>
              <Text style={styles.complianceCtaTitle}>Enter Load Code</Text>
              <Text style={styles.complianceCtaSub}>Verify pickup at warehouse — Step 1 of 3</Text>
            </View>
            <Text style={styles.complianceCtaArrow}>→</Text>
          </Pressable>
        )}

        {currentStep === 'handover' && (
          <Pressable onPress={onGoToHandover} style={[styles.complianceCta, styles.complianceCtaBlue]}>
            <Text style={styles.complianceCtaIcon}>📋</Text>
            <View style={styles.complianceCtaText}>
              <Text style={styles.complianceCtaTitle}>Vehicle Handover Check</Text>
              <Text style={styles.complianceCtaSub}>Upload photos & sign handover — Step 2 of 3</Text>
            </View>
            <Text style={styles.complianceCtaArrow}>→</Text>
          </Pressable>
        )}

        {currentStep === 'delivery' && (
          <Pressable onPress={onGoToDelivery} style={[styles.complianceCta, styles.complianceCtaGreen]}>
            <Text style={styles.complianceCtaIcon}>📦</Text>
            <View style={styles.complianceCtaText}>
              <Text style={styles.complianceCtaTitle}>Submit Delivery Proof</Text>
              <Text style={styles.complianceCtaSub}>Upload proof & get signature — Step 3 of 3</Text>
            </View>
            <Text style={styles.complianceCtaArrow}>→</Text>
          </Pressable>
        )}

        {isInTransit && (
          <Card
            title={activeJob?.jobReference || 'Active Trip'}
            subtitle={`${activeJob?.pickupLocation || '—'} → ${activeJob?.dropLocation || '—'}`}
            variant="dark"
            rightLabel="LIVE">
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${progress}%`}]} />
            </View>
            <View style={styles.actionRow}>
              <Pressable onPress={onReportIncident} style={styles.incidentBtn}>
                <Text style={styles.incidentBtnText}>⚠️ Report Issue</Text>
              </Pressable>
              <Pressable onPress={onStopTracking} style={styles.stopBtn}>
                <Text style={styles.stopBtnText}>Finish Trip</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Quick incident button always visible during transit */}
        {!isInTransit && (
          <Pressable onPress={onReportIncident} style={styles.incidentFullBtn}>
            <Text style={styles.incidentFullBtnText}>⚠️ Report Incident to Haulier</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  noJobWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  noJobIcon: {fontSize: 60},
  noJobTitle: {color: colors.navy, fontSize: 24, fontWeight: '900'},
  noJobSub: {
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {alignItems: 'center', gap: 4},
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {backgroundColor: colors.success},
  stepDotCurrent: {backgroundColor: colors.navy},
  stepDotText: {color: '#94A3B8', fontSize: 11, fontWeight: '900'},
  stepDotTextActive: {color: colors.card},
  stepLabel: {color: '#94A3B8', fontSize: 9, fontWeight: '800', textTransform: 'uppercase'},
  stepLabelCurrent: {color: colors.navy},
  stepLine: {flex: 1, height: 2, backgroundColor: '#E2E8F0', marginBottom: 16},
  stepLineDone: {backgroundColor: colors.success},
  mapContainer: {flex: 1, backgroundColor: '#DCE7F2'},
  mapHeader: {position: 'absolute', top: spacing.xl, left: spacing.xl, zIndex: 2},
  mapHeaderTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  mapHeaderSubtitle: {color: colors.inkSoft, fontSize: 14, marginTop: 4},
  mapMock: {flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'},
  routeLine: {
    position: 'absolute',
    left: '10%',
    right: '14%',
    top: '50%',
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  routeLineSecondary: {
    position: 'absolute',
    left: '14%',
    right: '10%',
    top: '58%',
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
    opacity: 0.45,
  },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    top: '48%',
  },
  markerStart: {left: '10%', backgroundColor: colors.navy},
  markerTruck: {backgroundColor: '#2563EB'},
  markerEnd: {right: '10%', backgroundColor: colors.success},
  remainingText: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.xl,
    color: colors.card,
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  zoomStack: {
    position: 'absolute',
    right: spacing.md,
    top: 60,
    gap: spacing.sm,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  zoomText: {color: colors.navy, fontSize: 22, fontWeight: '900'},
  sheet: {backgroundColor: colors.card, maxHeight: 340},
  sheetContent: {padding: spacing.xl, gap: spacing.lg},
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D6DCE5',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  metricsRow: {flexDirection: 'row', alignItems: 'center'},
  metric: {flex: 1, alignItems: 'center'},
  metricValue: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  metricLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  journeyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 10,
  },
  journeyLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  journeyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  journeyButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  journeyBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F8FAFD',
  },
  journeyBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  journeyBtnText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
  },
  journeyHint: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  metricDivider: {width: 1, height: 30, backgroundColor: colors.border},
  complianceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  complianceCtaBlue: {backgroundColor: '#EFF6FF', borderColor: '#BFDBFE'},
  complianceCtaGreen: {backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'},
  complianceCtaIcon: {fontSize: 28},
  complianceCtaText: {flex: 1},
  complianceCtaTitle: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  complianceCtaSub: {color: colors.inkSoft, fontSize: 11, marginTop: 2},
  complianceCtaArrow: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
  actionRow: {flexDirection: 'row', gap: spacing.md},
  incidentBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  incidentBtnText: {color: colors.danger, fontSize: 13, fontWeight: '800'},
  stopBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  stopBtnText: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  incidentFullBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  incidentFullBtnText: {color: colors.danger, fontSize: 14, fontWeight: '800'},
});

export default LiveTrackingScreen;
