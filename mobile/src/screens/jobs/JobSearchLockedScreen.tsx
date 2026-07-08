import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon from '../../components/common/Icon';

export interface ProfileCheck {
  label: string;
  done: boolean;
}

export interface DocCheck {
  label: string;
  status: 'approved' | 'pending' | 'rejected' | 'missing';
}

export interface AvailabilityGateInfo {
  availabilityMode: string;
  modeLabel: string;
  profileChecks: ProfileCheck[];
  docChecks: DocCheck[];
  esignatureCheck?: {done: boolean};
  nextAction: 'set_availability' | 'complete_profile' | 'upload_docs' | 'wait_approval' | 'wait_reupload_approval' | 'doc_expired' | 'add_esignature';
  expiredDocName?: string;
}

interface JobSearchLockedScreenProps {
  gateInfo: AvailabilityGateInfo;
  onGoToProfile: () => void;
  onGoToDocuments: () => void;
  onGoToAvailability: () => void;
  context?: 'jobs' | 'shifts';
}

const CONFIG = {
  set_availability: {
    icon: 'settings' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Set Your Availability Type',
    subtitle: 'Choose Driver Only, Truck Only, or Driver with Truck to unlock this section.',
    btnLabel: 'Set Availability →',
    btnColor: '#1066B1',
  },
  complete_profile: {
    icon: 'user' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Complete Your Profile',
    subtitle: 'Fill in the required profile fields to unlock this section.',
    btnLabel: 'Go to Profile →',
    btnColor: '#1066B1',
  },
  upload_docs: {
    icon: 'file' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Documents Not Uploaded',
    subtitle: 'Upload the required documents for your availability mode to unlock this section.',
    btnLabel: 'Upload Documents →',
    btnColor: '#1066B1',
  },
  wait_approval: {
    icon: 'clock' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Documents Under Verification',
    subtitle: 'Your documents have been submitted and are being reviewed by the admin. You will be notified once approved.',
    btnLabel: null,
    btnColor: null,
  },
  wait_reupload_approval: {
    icon: 'clock' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Reuploaded Doc Under Verification',
    subtitle: 'Your re-uploaded documents have been submitted and are being reviewed by the admin. You will be notified once approved.',
    btnLabel: null,
    btnColor: null,
  },
  doc_expired: {
    icon: 'file' as const,
    iconBg: colors.accentSoft,
    iconBorder: colors.accent,
    title: 'Document Expired',
    subtitle: '',
    btnLabel: 'Re-upload Document →',
    btnColor: colors.accent,
  },
  add_esignature: {
    icon: 'pen' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'E-Signature Required',
    subtitle: 'Please add your e-signature in your profile before you can view and apply for jobs.',
    btnLabel: 'Add E-Signature →',
    btnColor: '#1066B1',
  },
};

// ── Checklist helpers ─────────────────────────────────────────────────────────

const DOC_STATUS_COLOR: Record<string, string> = {
  approved: '#16A34A',
  pending:  '#D97706',
  rejected: '#DC2626',
  missing:  '#9CA3AF',
};

const DOC_STATUS_ICON: Record<string, string> = {
  approved: '✓',
  pending:  '⏳',
  rejected: '✗',
  missing:  '○',
};

function ChecklistItem({label, done}: {label: string; done: boolean}) {
  return (
    <View style={cl.row}>
      <View style={[cl.dot, {backgroundColor: done ? '#16A34A' : '#9CA3AF'}]}>
        <Text style={cl.dotText}>{done ? '✓' : '○'}</Text>
      </View>
      <Text style={[cl.rowLabel, {color: done ? '#111827' : '#6B7280'}]}>{label}</Text>
    </View>
  );
}

function DocCheckItem({label, status}: {label: string; status: DocCheck['status']}) {
  const color = DOC_STATUS_COLOR[status] ?? '#9CA3AF';
  const icon  = DOC_STATUS_ICON[status]  ?? '○';
  const statusLabel = status === 'approved' ? 'Approved' : status === 'pending' ? 'Under Review' : status === 'rejected' ? 'Rejected' : 'Not Uploaded';
  return (
    <View style={cl.row}>
      <View style={[cl.dot, {backgroundColor: color}]}>
        <Text style={cl.dotText}>{icon}</Text>
      </View>
      <Text style={[cl.rowLabel, {color: status === 'approved' ? '#111827' : '#6B7280', flex: 1}]}>{label}</Text>
      <Text style={[cl.statusTag, {color}]}>{statusLabel}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const JobSearchLockedScreen: React.FC<JobSearchLockedScreenProps> = ({
  gateInfo,
  onGoToProfile,
  onGoToDocuments,
  onGoToAvailability,
}) => {
  const {nextAction, expiredDocName, profileChecks, docChecks, esignatureCheck} = gateInfo;
  const cfg = CONFIG[nextAction];

  const subtitle = nextAction === 'doc_expired' && expiredDocName
    ? `Your document "${expiredDocName}" has expired. Please re-upload it and wait for admin re-verification to continue.`
    : cfg.subtitle;

  const onPress =
    nextAction === 'set_availability' ? onGoToAvailability :
    nextAction === 'complete_profile' ? onGoToProfile :
    nextAction === 'add_esignature'   ? onGoToProfile :
                                        onGoToDocuments;

  // Build checklist: profile fields + esignature + docs
  const hasChecklist = profileChecks.length > 0 || docChecks.length > 0;

  // Overall section statuses for the section headers
  const profileAllDone  = profileChecks.every(c => c.done);
  const esigDone        = esignatureCheck?.done ?? false;
  const docsAllApproved = docChecks.every(c => c.status === 'approved');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Blocker card ── */}
      <View style={styles.blockerCard}>
        <View style={[styles.iconCircle, {backgroundColor: cfg.iconBg, borderColor: cfg.iconBorder}]}>
          <Icon name={cfg.icon} size={32} color="#000000" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>{cfg.title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {cfg.btnLabel && cfg.btnColor ? (
          <Pressable style={[styles.btn, {backgroundColor: cfg.btnColor}]} onPress={onPress}>
            <Text style={styles.btnText}>{cfg.btnLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Remaining checklist ── */}
      {hasChecklist && (
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Setup Checklist</Text>

          {/* Profile fields */}
          {profileChecks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Profile</Text>
                <Text style={[styles.sectionStatus, {color: profileAllDone ? '#16A34A' : '#D97706'}]}>
                  {profileAllDone ? 'Complete' : 'Incomplete'}
                </Text>
              </View>
              {profileChecks.map((c, i) => (
                <ChecklistItem key={i} label={c.label} done={c.done} />
              ))}
            </View>
          )}

          {/* E-Signature */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>E-Signature</Text>
              <Text style={[styles.sectionStatus, {color: esigDone ? '#16A34A' : '#DC2626'}]}>
                {esigDone ? 'Added' : 'Required'}
              </Text>
            </View>
            <ChecklistItem label="Digital E-Signature" done={esigDone} />
          </View>

          {/* Documents */}
          {docChecks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Documents</Text>
                <Text style={[styles.sectionStatus, {color: docsAllApproved ? '#16A34A' : '#D97706'}]}>
                  {docsAllApproved ? 'All Approved' : `${docChecks.filter(c => c.status === 'approved').length}/${docChecks.length} Approved`}
                </Text>
              </View>
              {docChecks.map((c, i) => (
                <DocCheckItem key={i} label={c.label} status={c.status} />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// ── Checklist item styles ─────────────────────────────────────────────────────

const cl = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7,
  },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  dotText: {fontSize: 11, color: '#FFFFFF', fontWeight: '900'},
  rowLabel: {fontSize: 13, fontWeight: '600', flex: 1},
  statusTag: {fontSize: 11, fontWeight: '800'},
});

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {flex: 1, backgroundColor: colors.bg},
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 16,
  },
  blockerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: '900', color: '#111827',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, color: '#6B7280',
    textAlign: 'center', lineHeight: 20, maxWidth: 280, marginBottom: 20,
  },
  btn: {
    paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: radius.lg, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  btnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '900'},

  checklistCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checklistTitle: {
    fontSize: 13, fontWeight: '900', color: '#111827',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5},
  sectionStatus: {fontSize: 11, fontWeight: '800'},
});

export default JobSearchLockedScreen;
