import React from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface DocumentStatusScreenProps {
  documents: any[];
  verificationStatus: any;
  refreshing: boolean;
  onRefresh: () => void;
  onUploadNew: () => void;
}

const DOC_ICONS: Record<string, string> = {
  driving_license: '🪪',
  vehicle_insurance: '🛡️',
  aadhaar_card: '🪪',
  pan_card: '📄',
  vehicle_registration: '🚗',
  background_check: '🔍',
};

const DOC_LABELS: Record<string, string> = {
  driving_license: 'Driving License',
  vehicle_insurance: 'Vehicle Insurance',
  aadhaar_card: 'Aadhaar Card',
  pan_card: 'PAN Card',
  vehicle_registration: 'Vehicle Registration',
  background_check: 'Background Check',
};

const STATUS_CONFIG: Record<string, {label: string; bg: string; text: string; border: string}> = {
  approved: {label: 'VERIFIED', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC'},
  verified: {label: 'VERIFIED', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC'},
  pending: {label: 'PENDING REVIEW', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047'},
  under_review: {label: 'PENDING REVIEW', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047'},
  rejected: {label: 'REJECTED', bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5'},
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.pending;
}

function formatDocType(type: string): string {
  return DOC_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const DocumentStatusScreen: React.FC<DocumentStatusScreenProps> = ({
  documents,
  verificationStatus,
  refreshing,
  onRefresh,
  onUploadNew,
}) => {
  const isFullyVerified = verificationStatus?.isVerified === true ||
    (documents.length > 0 && documents.every(d => ['approved', 'verified'].includes(d.status?.toLowerCase())));

  const pendingCount = documents.filter(d =>
    ['pending', 'under_review'].includes(d.status?.toLowerCase()),
  ).length;

  const rejectedCount = documents.filter(d =>
    d.status?.toLowerCase() === 'rejected',
  ).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Document Verification</Text>
        </View>

        {/* Job-lock info banner */}
        {!isFullyVerified && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Job requests are restricted until all documents are approved by the admin.
            </Text>
          </View>
        )}

        {/* Verification Protocol card */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolTitleRow}>
            <Text style={styles.protocolCheck}>☑</Text>
            <Text style={styles.protocolTitle}>Verification Protocol</Text>
          </View>
          <View style={styles.protocolList}>
            {[
              'Ensure all text is legible and edges are visible',
              'Accepted formats: JPG, PNG, or PDF',
              'Max file size: 10MB per document',
            ].map((rule, i) => (
              <View key={i} style={styles.protocolRow}>
                <View style={styles.protocolBullet} />
                <Text style={styles.protocolText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Background Check card */}
        <View style={styles.bgCheckCard}>
          <View style={styles.bgCheckTop}>
            <Text style={styles.bgCheckTitle}>BACKGROUND CHECK{'\n'}REQUIRED</Text>
            <Text style={styles.bgCheckShield}>🛡️</Text>
          </View>
          <Text style={styles.bgCheckSub}>
            Mandatory safety screening for all active haulers.
          </Text>
          <Pressable style={styles.bgCheckBtn}>
            <Text style={styles.bgCheckBtnText}>▶  START SCREENING</Text>
          </Pressable>
        </View>

        {/* Document List */}
        <View style={styles.section}>
          {documents.length > 0 ? (
            documents.map((doc, idx) => {
              const sc = getStatusConfig(doc.status);
              const isRejected = doc.status?.toLowerCase() === 'rejected';
              return (
                <View
                  key={doc.documentId ?? idx}
                  style={[styles.docCard, isRejected && styles.docCardRejected]}>
                  <View style={styles.docCardTop}>
                    <View style={styles.docIconWrap}>
                      <Text style={styles.docIcon}>
                        {DOC_ICONS[doc.documentType] ?? '📄'}
                      </Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle}>{formatDocType(doc.documentType)}</Text>
                      <Text style={styles.docSub} numberOfLines={1}>
                        {doc.description ?? doc.expiryDate
                          ? `Expires: ${doc.expiryDate ?? 'N/A'}`
                          : 'Uploaded'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: sc.bg, borderColor: sc.border}]}>
                      <Text style={[styles.statusText, {color: sc.text}]}>{sc.label}</Text>
                    </View>
                  </View>

                  {/* Rejection warning */}
                  {isRejected && doc.rejectionReason ? (
                    <View style={styles.rejectionWrap}>
                      <Text style={styles.rejectionIcon}>⚠️</Text>
                      <Text style={styles.rejectionReason} numberOfLines={2}>
                        {doc.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action row */}
                  <View style={styles.docActions}>
                    <Pressable
                      onPress={onUploadNew}
                      style={styles.replaceBtn}>
                      <Text style={styles.replaceBtnText}>
                        {isRejected ? 'Re-upload' : 'Replace'}
                      </Text>
                    </Pressable>
                    {doc.fileUrl ? (
                      <Pressable
                        onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
                        style={styles.viewBtn}>
                        <Text style={styles.viewBtnText}>View</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No Documents Yet</Text>
              <Text style={styles.emptySub}>
                Upload your Driving License and Vehicle Insurance to start receiving jobs.
              </Text>
            </View>
          )}
        </View>

        {/* Upload New button */}
        <View style={styles.uploadNewWrap}>
          <Pressable onPress={onUploadNew} style={styles.uploadNewBtn}>
            <Text style={styles.uploadNewText}>＋  Upload New</Text>
          </Pressable>
        </View>

        {/* Summary row */}
        {documents.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{documents.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, {color: '#15803D'}]}>
                {documents.filter(d => ['approved', 'verified'].includes(d.status?.toLowerCase())).length}
              </Text>
              <Text style={styles.summaryLabel}>Verified</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, {color: '#854D0E'}]}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, {color: '#B91C1C'}]}>{rejectedCount}</Text>
              <Text style={styles.summaryLabel}>Rejected</Text>
            </View>
          </View>
        )}

        {/* Support section */}
        <View style={styles.supportCard}>
          <View style={styles.supportTextWrap}>
            <Text style={styles.supportTitle}>Need help with verification?</Text>
            <Text style={styles.supportSub}>
              Our compliance team is available 24/7 to assist with document issues.
            </Text>
          </View>
          <Pressable style={styles.supportBtn}>
            <Text style={styles.supportBtnText}>Contact{'\n'}Compliance</Text>
          </Pressable>
        </View>

        {/* Submit button */}
        <View style={styles.submitWrap}>
          <Pressable
            onPress={onUploadNew}
            style={[styles.submitBtn, documents.length === 0 && styles.submitBtnDisabled]}
            disabled={documents.length === 0}>
            <Text style={styles.submitIcon}>▶</Text>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F4F7FB'},

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  headerTitle: {
    color: colors.navy, fontSize: 20, fontWeight: '900',
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EAF3FD', marginHorizontal: spacing.xl, marginTop: spacing.lg,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoIcon: {fontSize: 15, flexShrink: 0},
  infoText: {flex: 1, color: '#1E40AF', fontSize: 13, lineHeight: 19, fontWeight: '600'},

  // Protocol card
  protocolCard: {
    backgroundColor: colors.navy,
    marginHorizontal: spacing.xl, marginTop: spacing.lg,
    borderRadius: radius.lg, padding: spacing.xl,
  },
  protocolTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14},
  protocolCheck: {color: '#60A5FA', fontSize: 18},
  protocolTitle: {color: '#fff', fontSize: 15, fontWeight: '900'},
  protocolList: {gap: 10},
  protocolRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  protocolBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#93C5FD', marginTop: 6, flexShrink: 0,
  },
  protocolText: {flex: 1, color: '#CBD5E1', fontSize: 13, lineHeight: 19},

  // Background check card
  bgCheckCard: {
    backgroundColor: '#1C3150',
    marginHorizontal: spacing.xl, marginTop: spacing.md,
    borderRadius: radius.lg, padding: spacing.xl,
  },
  bgCheckTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8},
  bgCheckTitle: {color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 24, flex: 1},
  bgCheckShield: {fontSize: 24, marginLeft: 10},
  bgCheckSub: {color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 16},
  bgCheckBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  bgCheckBtnText: {color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5},

  // Section
  section: {
    paddingHorizontal: spacing.xl, marginTop: spacing.lg, gap: spacing.md,
  },

  // Document card
  docCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.lg, gap: 10,
  },
  docCardRejected: {borderColor: '#FCA5A5', borderWidth: 1.5},
  docCardTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  docIconWrap: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  docIcon: {fontSize: 20},
  docInfo: {flex: 1},
  docTitle: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 2},
  docSub: {color: colors.inkSoft, fontSize: 12},
  statusBadge: {
    borderRadius: radius.pill, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: {fontSize: 9, fontWeight: '900', letterSpacing: 0.5},

  // Rejection
  rejectionWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: radius.sm,
    padding: spacing.sm, borderLeftWidth: 3, borderLeftColor: '#F87171',
  },
  rejectionIcon: {fontSize: 13, flexShrink: 0},
  rejectionReason: {flex: 1, color: '#B91C1C', fontSize: 12, lineHeight: 17},

  // Doc actions
  docActions: {flexDirection: 'row', gap: 10, paddingTop: 4},
  replaceBtn: {
    flex: 1, borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center',
  },
  replaceBtnText: {color: colors.navy, fontSize: 13, fontWeight: '800'},
  viewBtn: {
    paddingHorizontal: 16, borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center',
  },
  viewBtnText: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},

  // Empty
  emptyBox: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.xxl, alignItems: 'center', gap: 10,
  },
  emptyIcon: {fontSize: 48},
  emptyTitle: {color: colors.navy, fontSize: 18, fontWeight: '900'},
  emptySub: {color: colors.inkSoft, fontSize: 14, textAlign: 'center', lineHeight: 20},

  // Upload New
  uploadNewWrap: {paddingHorizontal: spacing.xl, marginTop: spacing.lg},
  uploadNewBtn: {
    borderWidth: 1.5, borderColor: colors.navy, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#fff',
  },
  uploadNewText: {color: colors.navy, fontSize: 15, fontWeight: '900'},

  // Summary
  summaryRow: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: spacing.xl,
    marginTop: spacing.md, borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.lg,
  },
  summaryItem: {flex: 1, alignItems: 'center'},
  summaryCount: {fontSize: 22, fontWeight: '900', color: colors.navy, marginBottom: 2},
  summaryLabel: {fontSize: 11, color: colors.inkSoft, fontWeight: '700'},
  summaryDivider: {width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 4},

  // Support
  supportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', marginHorizontal: spacing.xl,
    marginTop: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.lg,
  },
  supportTextWrap: {flex: 1},
  supportTitle: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 4},
  supportSub: {color: colors.inkSoft, fontSize: 12, lineHeight: 17},
  supportBtn: {
    backgroundColor: '#EAF3FD', borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', flexShrink: 0,
  },
  supportBtnText: {color: colors.accent, fontSize: 12, fontWeight: '900', textAlign: 'center'},

  // Submit
  submitWrap: {
    paddingHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: 32,
  },
  submitBtn: {
    backgroundColor: colors.navy, borderRadius: radius.lg,
    minHeight: 58, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  submitBtnDisabled: {opacity: 0.4},
  submitIcon: {color: '#60A5FA', fontSize: 18},
  submitText: {color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5},
});

export default DocumentStatusScreen;
