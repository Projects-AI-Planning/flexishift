import React, {useState} from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'upload';

export interface DocumentVerificationScreenProps {
  documents: any[];
  verificationStatus: any;
  refreshing: boolean;
  onRefresh: () => void;
  onUpload: (documentType: string, expiryDate: string, file: any) => Promise<void>;
  uploadLoading: boolean;
  uploadError: string | null;
  startInUploadMode?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_ICONS: Record<string, string> = {
  driving_license: '🪪',
  vehicle_insurance: '🛡️',
  vehicle_registration: '🚛',
};

const DOC_LABELS: Record<string, string> = {
  driving_license: 'Driving License',
  vehicle_insurance: 'Insurance Policy',
  vehicle_registration: 'Vehicle Registration',
};

const DOC_SUBTITLES: Record<string, string> = {
  driving_license: 'Standard Texas Class A CDL',
  vehicle_insurance: 'General Liability Coverage',
  vehicle_registration: 'Freightliner Cascadia 2022',
};

const DOC_TYPES = [
  {id: 'DRIVING_LICENCE', label: 'Driving License'},
  {id: 'VEHICLE_REG', label: 'Vehicle Registration (RC)'},
  {id: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance'},
];

const STATUS_CONFIG: Record<string, {label: string; bg: string; text: string; border: string}> = {
  approved:     {label: 'VERIFIED',       bg: '#DCFCE7', text: '#15803D', border: '#86EFAC'},
  verified:     {label: 'VERIFIED',       bg: '#DCFCE7', text: '#15803D', border: '#86EFAC'},
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

function normalizeDocType(raw: string | undefined): string {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'driving_licence' || value === 'driving_license') return 'driving_license';
  if (value === 'vehicle_reg' || value === 'vehicle_registration') return 'vehicle_registration';
  if (value === 'vehicle_insurance') return 'vehicle_insurance';
  return value;
}

function toBackendDocType(raw: string | undefined): string {
  const value = normalizeDocType(raw);
  if (value === 'driving_license') return 'DRIVING_LICENCE';
  if (value === 'vehicle_registration') return 'VEHICLE_REG';
  if (value === 'vehicle_insurance') return 'VEHICLE_INSURANCE';
  return String(raw ?? '').toUpperCase();
}

function getDocSubtitle(doc: any): string {
  const type = normalizeDocType(doc.documentType ?? doc.docType ?? doc.type);
  return doc.description ?? DOC_SUBTITLES[type] ?? 'Uploaded document';
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentVerificationScreen: React.FC<DocumentVerificationScreenProps> = ({
  documents,
  verificationStatus,
  refreshing,
  onRefresh,
  onUpload,
  uploadLoading,
  uploadError,
  startInUploadMode = false,
}) => {
  const [view, setView] = useState<ViewMode>(startInUploadMode ? 'upload' : 'list');
  const [uploadType, setUploadType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const isFullyVerified =
    verificationStatus?.isVerified === true ||
    (documents.length > 0 &&
      documents.every(d => ['approved', 'verified'].includes(d.status?.toLowerCase())));

  // ── Upload helpers ──────────────────────────────────────────────────────────

  const openUpload = (preselectedType = '') => {
    setUploadType(preselectedType);
    setExpiryDate('');
    setSelectedFile(null);
    setView('upload');
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      const response =
        source === 'camera'
          ? await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false})
          : await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1});

      if (response.didCancel || response.errorCode || !response.assets?.length) {
        return;
      }
      const asset = response.assets[0];
      if (asset.uri) {
        setSelectedFile({
          uri: asset.uri,
          fileName: asset.fileName ?? 'document.jpg',
          type: asset.type ?? 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert(
        'Photo upload failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  const handlePickImage = () => {
    Alert.alert('Select Image', 'Choose a method to upload your document', [
      {text: 'Camera', onPress: () => pickImage('camera').catch(() => undefined)},
      {text: 'Gallery', onPress: () => pickImage('gallery').catch(() => undefined)},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleSubmitUpload = async () => {
    if (!uploadType || !expiryDate || !selectedFile) {
      return;
    }
    await onUpload(uploadType, expiryDate, selectedFile);
    // Parent navigates on success; on error, uploadError prop updates
  };

  // ── Upload View ─────────────────────────────────────────────────────────────

  if (view === 'upload') {
    const canSubmit = !uploadLoading && !!uploadType && !!expiryDate && !!selectedFile;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.uploadContent}>

          {/* Upload header */}
          <View style={styles.uploadHeader}>
            <Pressable onPress={() => setView('list')} hitSlop={8} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
            <Text style={styles.uploadTitle}>Upload Document</Text>
            <Text style={styles.uploadSubtitle}>
              Please provide clear photos of your documents for faster verification.
            </Text>
          </View>

          {/* Document type */}
          <View style={styles.uploadCard}>
            <Text style={styles.uploadCardLabel}>DOCUMENT TYPE</Text>
            <View style={styles.typeGrid}>
              {DOC_TYPES.map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => setUploadType(t.id)}
                  style={[styles.typeChip, uploadType === t.id && styles.typeChipActive]}>
                  <Text
                    style={[styles.typeChipText, uploadType === t.id && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Expiry date */}
          <View style={styles.uploadCard}>
            <Text style={styles.uploadCardLabel}>EXPIRY DATE</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={expiryDate}
              onChangeText={setExpiryDate}
              keyboardType="numeric"
            />
          </View>

          {/* File picker */}
          <View style={styles.uploadCard}>
            <Text style={styles.uploadCardLabel}>DOCUMENT PHOTO</Text>
            <Pressable
              onPress={handlePickImage}
              style={[styles.filePicker, selectedFile && styles.filePickerDone]}>
              {selectedFile ? (
                <View style={styles.filePickerBody}>
                  <Text style={styles.filePickerIcon}>📄</Text>
                  <Text style={styles.filePickerName}>
                    {selectedFile.fileName || 'Document Captured'}
                  </Text>
                  <Text style={styles.filePickerRetake}>Tap to retake</Text>
                </View>
              ) : (
                <View style={styles.filePickerBody}>
                  <Text style={styles.filePickerIcon}>📷</Text>
                  <Text style={styles.filePickerPrompt}>Capture Document Photo</Text>
                  <Text style={styles.filePickerHint}>JPG, PNG or PDF · Max 10MB</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Error */}
          {uploadError ? (
            <View style={styles.uploadErrorBanner}>
              <Text style={styles.uploadErrorText}>{uploadError}</Text>
            </View>
          ) : null}

          {/* Submit upload */}
          <Pressable
            onPress={handleSubmitUpload}
            disabled={!canSubmit}
            style={[styles.submitUploadBtn, !canSubmit && styles.submitUploadBtnDisabled]}>
            <Text style={styles.submitUploadBtnText}>
              {uploadLoading ? 'Uploading...' : 'Submit for Verification'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </View>
          <Text style={styles.headerTitle}>Document Verification</Text>
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
              const docType = normalizeDocType(doc.documentType ?? doc.docType ?? doc.type);

              return (
                <View
                  key={doc.documentId ?? idx}
                  style={[styles.docCard, isRejected && styles.docCardRejected]}>

                  <View style={styles.docTop}>
                    <View style={styles.docIconBox}>
                      <Text style={styles.docIcon}>{DOC_ICONS[docType] ?? '📄'}</Text>
                    </View>
                    <View style={styles.docMeta}>
                      <Text style={styles.docName}>{formatDocType(docType)}</Text>
                      <Text style={styles.docDesc} numberOfLines={1}>
                        {getDocSubtitle(doc)}
                      </Text>
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
                    <Pressable
                      onPress={() => openUpload(toBackendDocType(docType))}
                      style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>Replace</Text>
                    </Pressable>
                  )}
                  {isPending && (
                    <View style={styles.docActionRow}>
                      <Pressable
                        onPress={() => doc.fileUrl && Linking.openURL(doc.fileUrl)}
                        style={[styles.outlineBtn, styles.docActionHalf]}>
                        <Text style={styles.outlineBtnText}>View</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openUpload(toBackendDocType(docType))}
                        style={[styles.outlineBtn, styles.docActionHalf]}>
                        <Text style={styles.outlineBtnText}>Upload</Text>
                      </Pressable>
                    </View>
                  )}
                  {isRejected && (
                    <Pressable
                      onPress={() => openUpload(toBackendDocType(docType))}
                      style={styles.uploadNewBtn}>
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
                Upload your Driving License, Vehicle Registration, and Vehicle Insurance to start receiving jobs.
              </Text>
              <Pressable onPress={() => openUpload()} style={[styles.outlineBtn, {marginTop: 12}]}>
                <Text style={styles.outlineBtnText}>+ Upload First Document</Text>
              </Pressable>
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
            onPress={() => openUpload()}
            style={[styles.submitBtn, documents.length === 0 && styles.submitBtnDisabled]}>
            <Text style={styles.submitArrow}>▷</Text>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F4F7FB'},

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
  headerTitle: {flex: 1, textAlign: 'center', color: colors.navy, fontSize: 18, fontWeight: '900'},
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarIcon: {fontSize: 20},

  // ── Info Banner ───────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EBF5FD', marginHorizontal: spacing.lg, marginTop: spacing.lg,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoIconCircle: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  infoIconGlyph: {color: '#fff', fontSize: 11, fontWeight: '900'},
  infoText: {flex: 1, color: '#1D4ED8', fontSize: 13, lineHeight: 19, fontWeight: '600'},

  // ── Verification Protocol ─────────────────────────────────────────────────
  protocolCard: {
    backgroundColor: '#0F172A', marginHorizontal: spacing.lg, marginTop: spacing.lg,
    borderRadius: radius.lg, padding: spacing.lg, gap: 12,
  },
  protocolHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2},
  protocolIconBox: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#1E293B',
    justifyContent: 'center', alignItems: 'center',
  },
  protocolIconGlyph: {color: '#60A5FA', fontSize: 18},
  protocolTitle: {color: '#fff', fontSize: 15, fontWeight: '900'},
  protocolRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  protocolCheckGlyph: {color: '#60A5FA', fontSize: 15, flexShrink: 0, marginTop: 1},
  protocolText: {flex: 1, color: '#94A3B8', fontSize: 13, lineHeight: 19},

  // ── Background Check ──────────────────────────────────────────────────────
  bgCard: {
    backgroundColor: '#0F172A', marginHorizontal: spacing.lg, marginTop: spacing.md,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  bgCardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10},
  bgCardTitle: {color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 26, flex: 1},
  bgShieldCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E40AF',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10, flexShrink: 0,
  },
  bgShieldGlyph: {fontSize: 18},
  bgCardSub: {color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 16},
  bgCardBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  bgCardBtnText: {color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5},

  // ── Document List ─────────────────────────────────────────────────────────
  docList: {paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md},
  docCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.lg, gap: 12,
  },
  docCardRejected: {borderColor: '#FCA5A5', borderWidth: 1.5},
  docTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  docIconBox: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  docIcon: {fontSize: 20},
  docMeta: {flex: 1},
  docName: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 2},
  docDesc: {color: '#64748B', fontSize: 12},
  badge: {borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0},
  badgeText: {fontSize: 9, fontWeight: '900', letterSpacing: 0.5},

  rejectionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: radius.sm, padding: spacing.md,
    borderWidth: 1, borderColor: '#FECACA',
  },
  rejectionWarnIcon: {color: '#DC2626', fontSize: 16, flexShrink: 0, marginTop: 1},
  rejectionLabel: {color: '#B91C1C', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3},
  rejectionText: {color: '#DC2626', fontSize: 13, lineHeight: 19, fontWeight: '500'},

  outlineBtn: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.sm,
    paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff',
  },
  outlineBtnText: {color: colors.navy, fontSize: 13, fontWeight: '800'},
  docActionRow: {flexDirection: 'row', gap: 10},
  docActionHalf: {flex: 1},
  uploadNewBtn: {backgroundColor: '#0F172A', borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center'},
  uploadNewBtnText: {color: '#fff', fontSize: 14, fontWeight: '800'},

  emptyCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.xxl, alignItems: 'center', gap: 10,
  },
  emptyIcon: {fontSize: 48},
  emptyTitle: {color: colors.navy, fontSize: 18, fontWeight: '900'},
  emptySub: {color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20},

  // ── Help Card ─────────────────────────────────────────────────────────────
  helpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC',
    marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.lg,
  },
  helpTextWrap: {flex: 1},
  helpTitle: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 4},
  helpSub: {color: '#64748B', fontSize: 12, lineHeight: 17},
  helpBtn: {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#fff', flexShrink: 0,
  },
  helpBtnText: {color: colors.navy, fontSize: 12, fontWeight: '900', textAlign: 'center'},

  // ── Submit ────────────────────────────────────────────────────────────────
  submitWrap: {paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 32},
  submitBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg, minHeight: 58,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  submitBtnDisabled: {opacity: 0.4},
  submitArrow: {color: '#fff', fontSize: 18},
  submitText: {color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5},

  // ── Upload View ───────────────────────────────────────────────────────────
  uploadContent: {padding: spacing.lg, paddingBottom: 48, gap: spacing.md},
  uploadHeader: {paddingVertical: spacing.sm},
  backBtn: {alignSelf: 'flex-start', marginBottom: spacing.md},
  backBtnText: {color: colors.accent, fontSize: 15, fontWeight: '800'},
  uploadTitle: {color: colors.navy, fontSize: 28, fontWeight: '900', marginBottom: spacing.sm},
  uploadSubtitle: {color: '#64748B', fontSize: 14, lineHeight: 21},

  uploadCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.lg, gap: spacing.sm,
  },
  uploadCardLabel: {
    color: colors.navy, fontSize: 11, fontWeight: '900',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  typeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  typeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1, borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  typeChipActive: {borderColor: colors.navy, backgroundColor: colors.navy},
  typeChipText: {fontSize: 13, fontWeight: '800', color: '#64748B'},
  typeChipTextActive: {color: '#fff'},

  dateInput: {
    backgroundColor: '#F8FAFC', borderRadius: radius.sm, paddingHorizontal: spacing.lg,
    minHeight: 52, fontSize: 15, color: colors.navy, borderWidth: 1, borderColor: '#E2E8F0',
  },

  filePicker: {
    height: 150, backgroundColor: '#F8FAFC', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  filePickerDone: {
    borderStyle: 'solid', borderColor: colors.mint, backgroundColor: '#F0FDF4',
  },
  filePickerBody: {alignItems: 'center', gap: 6},
  filePickerIcon: {fontSize: 32},
  filePickerName: {color: colors.navy, fontSize: 14, fontWeight: '800'},
  filePickerRetake: {color: colors.mint, fontSize: 12, fontWeight: '700'},
  filePickerPrompt: {color: '#64748B', fontSize: 14, fontWeight: '800'},
  filePickerHint: {color: '#94A3B8', fontSize: 12},

  uploadErrorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: radius.sm,
    padding: spacing.md, borderWidth: 1, borderColor: '#FCA5A5',
  },
  uploadErrorText: {color: '#B91C1C', fontSize: 13, fontWeight: '700'},

  submitUploadBtn: {
    backgroundColor: colors.navy, borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitUploadBtnDisabled: {opacity: 0.4},
  submitUploadBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
});

export default DocumentVerificationScreen;
