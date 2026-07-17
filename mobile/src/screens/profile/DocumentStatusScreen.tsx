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
  vehicle_registration: '🚛',
  background_check: '🔍',
};

const DOC_LABELS: Record<string, string> = {
  driving_license: 'Driving License',
  vehicle_insurance: 'Insurance Policy',
  aadhaar_card: 'Aadhaar Card',
  pan_card: 'PAN Card',
  vehicle_registration: 'Vehicle Registration',
  background_check: 'Background Check',
};

const DOC_SUBTITLES: Record<string, string> = {
  driving_license: 'Standard Texas Class A CDL',
  vehicle_insurance: 'General Liability Coverage',
  vehicle_registration: 'Freightliner Cascadia 2022',
  aadhaar_card: 'Government Photo ID',
  pan_card: 'Tax Identity Document',
};

const STATUS_CONFIG: Record<string, {label: string; bg: string; text: string; border: string}> = {
  approved:     {label: 'VERIFIED',       bg: '#DBEAFE', text: '#1066B1', border: '#93C5FD'},
  verified:     {label: 'VERIFIED',       bg: '#DBEAFE', text: '#1066B1', border: '#93C5FD'},
  pending:      {label: 'PENDING REVIEW', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047'},
  under_review: {label: 'PENDING REVIEW', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047'},
  rejected:     {label: 'REJECTED',       bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5'},
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.pending;
}

function formatDocType(type: string): string {
  return DOC_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getDocSubtitle(doc: any): string {
  return doc.description ?? DOC_SUBTITLES[doc.documentType] ?? 'Uploaded document';
}

const DocumentStatusScreen: React.FC<DocumentStatusScreenProps> = ({
  documents,
  verificationStatus,
  refreshing,
  onRefresh,
  onUploadNew,
}) => {
  const isFullyVerified =
    verificationStatus?.isVerified === true ||
    (documents.length > 0 &&
      documents.every(d => ['approved', 'verified'].includes(d.status?.toLowerCase())));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.menuBtn} hitSlop={8}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </View>

        {/* Info banner */}
        {!isFullyVerified && (
          <View style={styles.infoBanner}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconGlyph}>ℹ</Text>
            </View>
            <Text style={styles.infoText}>
              Job requests are restricted until all documents are approved by the admin.
            </Text>
          </View>
        )}

        {/* Verification Protocol */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolHeader}>
            <View style={styles.protocolIconBox}>
              <Text style={styles.protocolIconGlyph}>☑</Text>
            </View>
            <Text style={styles.protocolTitle}>Verification Protocol</Text>
          </View>
          {[
            'Ensure all text is legible and edges are visible',
            'Accepted formats: JPG, PNG, or PDF',
            'Max file size: 10MB per document',
          ].map((rule, i) => (
            <View key={i} style={styles.protocolRow}>
              <Text style={styles.protocolCheckGlyph}>⊙</Text>
              <Text style={styles.protocolText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Background Check */}
        <View style={styles.bgCard}>
          <View style={styles.bgCardTop}>
            <Text style={styles.bgCardTitle}>BACKGROUND CHECK{'\n'}REQUIRED</Text>
            <View style={styles.bgShieldCircle}>
              <Text style={styles.bgShieldGlyph}>🛡</Text>
            </View>
          </View>
          <Text style={styles.bgCardSub}>
            Mandatory safety screening for all active haulers.
          </Text>
          <Pressable style={styles.bgCardBtn}>
            <Text style={styles.bgCardBtnText}>START SCREENING</Text>
          </Pressable>
        </View>

        {/* Document Cards */}
        <View style={styles.docList}>
          {documents.length > 0 ? (
            documents.map((doc, idx) => {
              const sc = getStatusConfig(doc.status);
              const status = doc.status?.toLowerCase();
              const isRejected = status === 'rejected';
              const isVerified = status === 'approved' || status === 'verified';
              const isPending = !isVerified && !isRejected;

              return (
                <View
                  key={doc.documentId ?? idx}
                  style={[styles.docCard, isRejected && styles.docCardRejected]}>

                  <View style={styles.docTop}>
                    <View style={styles.docIconBox}>
                      <Text style={styles.docIcon}>{DOC_ICONS[doc.documentType] ?? '📄'}</Text>
                    </View>
                    <View style={styles.docMeta}>
                      <Text style={styles.docName}>{formatDocType(doc.documentType)}</Text>
                      <Text style={styles.docDesc} numberOfLines={1}>{getDocSubtitle(doc)}</Text>
                    </View>
                    <View style={[styles.badge, {backgroundColor: sc.bg, borderColor: sc.border}]}>
                      <Text style={[styles.badgeText, {color: sc.text}]}>{sc.label}</Text>
                    </View>
                  </View>

                  {isRejected && (
                    <View style={styles.rejectionRow}>
                      <Text style={styles.rejectionWarnIcon}>⚠</Text>
                      <View style={{flex: 1}}>
                        <Text style={styles.rejectionLabel}>Rejection Reason</Text>
                        <Text style={styles.rejectionText}>
                          {doc.rejectionReason?.trim()
                            ? doc.rejectionReason
                            : 'Document was rejected by the admin. Please upload a clearer, legible copy and resubmit.'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {isVerified && (
                    <Pressable onPress={onUploadNew} style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>Replace</Text>
                    </Pressable>
                  )}
                  {isPending && (
                    <Pressable
                      onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
                      style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>View</Text>
                    </Pressable>
                  )}
                  {isRejected && (
                    <Pressable onPress={onUploadNew} style={styles.uploadNewBtn}>
                      <Text style={styles.uploadNewBtnText}>Upload New</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No Documents Yet</Text>
              <Text style={styles.emptySub}>
                Upload your Driving License and Vehicle Insurance to start receiving jobs.
              </Text>
            </View>
          )}
        </View>

        {/* Help card */}
        <View style={styles.helpCard}>
          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>Need help with{'\n'}verification?</Text>
            <Text style={styles.helpSub}>
              Our compliance team is available 24/7 to assist with document issues.
            </Text>
          </View>
          <Pressable style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>Contact{'\n'}Compliance</Text>
          </Pressable>
        </View>

        {/* Submit */}
        <View style={styles.submitWrap}>
          <Pressable
            onPress={onUploadNew}
            style={[styles.submitBtn, documents.length === 0 && styles.submitBtnDisabled]}
            disabled={documents.length === 0}>
            <Text style={styles.submitArrow}>▷</Text>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  menuBtn: {width: 36, height: 36, justifyContent: 'center'},
  menuIcon: {fontSize: 22, color: colors.navy},
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarIcon: {fontSize: 20},

  // ── Info Banner ───────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EBF5FD',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoIconGlyph: {color: '#fff', fontSize: 11, fontWeight: '900'},
  infoText: {flex: 1, color: '#1D4ED8', fontSize: 13, lineHeight: 19, fontWeight: '600'},

  // ── Verification Protocol Card ────────────────────────────────────────────
  protocolCard: {
    backgroundColor: '#0F172A',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 12,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  protocolIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolIconGlyph: {color: '#60A5FA', fontSize: 18},
  protocolTitle: {color: '#fff', fontSize: 15, fontWeight: '900'},
  protocolRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  protocolCheckGlyph: {color: '#60A5FA', fontSize: 15, flexShrink: 0, marginTop: 1},
  protocolText: {flex: 1, color: '#94A3B8', fontSize: 13, lineHeight: 19},

  // ── Background Check Card ─────────────────────────────────────────────────
  bgCard: {
    backgroundColor: '#0F172A',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  bgCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bgCardTitle: {color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 26, flex: 1},
  bgShieldCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    flexShrink: 0,
  },
  bgShieldGlyph: {fontSize: 18},
  bgCardSub: {color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 16},
  bgCardBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bgCardBtnText: {color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5},

  // ── Document List ─────────────────────────────────────────────────────────
  docList: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  // Document card
  docCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    gap: 12,
  },
  docCardRejected: {borderColor: '#FCA5A5', borderWidth: 1.5},

  docTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  docIcon: {fontSize: 20},
  docMeta: {flex: 1},
  docName: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 2},
  docDesc: {color: '#64748B', fontSize: 12},

  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {fontSize: 9, fontWeight: '900', letterSpacing: 0.5},

  // Rejection warning row
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionWarnIcon: {color: '#DC2626', fontSize: 16, flexShrink: 0, marginTop: 1},
  rejectionLabel: {color: '#B91C1C', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3},
  rejectionText: {color: '#DC2626', fontSize: 13, lineHeight: 19, fontWeight: '500'},

  // Action buttons
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineBtnText: {color: colors.navy, fontSize: 13, fontWeight: '800'},

  uploadNewBtn: {
    backgroundColor: '#0F172A',
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadNewBtnText: {color: '#fff', fontSize: 14, fontWeight: '800'},

  // Empty state
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {fontSize: 48},
  emptyTitle: {color: colors.navy, fontSize: 18, fontWeight: '900'},
  emptySub: {color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20},

  // ── Help Card ─────────────────────────────────────────────────────────────
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
  },
  helpTextWrap: {flex: 1},
  helpTitle: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 4},
  helpSub: {color: '#64748B', fontSize: 12, lineHeight: 17},
  helpBtn: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  helpBtnText: {color: colors.navy, fontSize: 12, fontWeight: '900', textAlign: 'center'},

  // ── Submit Button ─────────────────────────────────────────────────────────
  submitWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: 32,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submitBtnDisabled: {opacity: 0.4},
  submitArrow: {color: '#fff', fontSize: 18},
  submitText: {color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5},
});

export default DocumentStatusScreen;
