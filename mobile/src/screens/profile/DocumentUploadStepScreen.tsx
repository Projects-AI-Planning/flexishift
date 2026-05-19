import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useState} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentUploadStepScreenProps {
  documents: any[];
  onUpload: (documentType: string, expiryDate: string, file: any) => Promise<void>;
  uploadLoading: boolean;
  uploadError: string | null;
  onSkip?: () => void;
}

type ViewMode = 'list' | 'upload';

// ─── Required document definitions ───────────────────────────────────────────

const REQUIRED_DOCS = [
  {
    id: 'driving_license',
    label: 'Driving License',
    desc: 'Valid CDL or state driving license',
    icon: '🪪',
  },
  {
    id: 'vehicle_registration',
    label: 'Vehicle Registration',
    desc: 'RC Book / Registration Certificate',
    icon: '🚛',
  },
  {
    id: 'vehicle_insurance',
    label: 'Insurance Policy',
    desc: 'General Liability / Comprehensive Coverage',
    icon: '🛡️',
  },
  {
    id: 'aadhaar_card',
    label: 'Aadhaar Card',
    desc: 'Government issued photo ID',
    icon: '🪪',
  },
  {
    id: 'pan_card',
    label: 'PAN Card',
    desc: 'Tax identity document',
    icon: '📄',
  },
];

// ─── Status config ────────────────────────────────────────────────────────────

type DocStatus = 'incomplete' | 'under_review' | 'rejected' | 'verified';

const STATUS_CONFIG: Record<DocStatus, {label: string; bg: string; text: string; border: string}> = {
  incomplete:   {label: 'INCOMPLETE',   bg: '#F1F5F9', text: '#475569', border: '#CBD5E1'},
  under_review: {label: 'UNDER REVIEW', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047'},
  rejected:     {label: 'REJECTED',     bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5'},
  verified:     {label: 'VERIFIED',     bg: '#DBEAFE', text: '#1066B1', border: '#93C5FD'},
};

function resolveStatus(uploaded: any | undefined): DocStatus {
  if (!uploaded) return 'incomplete';
  const s = uploaded.status?.toLowerCase();
  if (s === 'approved' || s === 'verified') return 'verified';
  if (s === 'rejected') return 'rejected';
  return 'under_review';
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentUploadStepScreen: React.FC<DocumentUploadStepScreenProps> = ({
  documents,
  onUpload,
  uploadLoading,
  uploadError,
  onSkip,
}) => {
  const [view, setView] = useState<ViewMode>('list');
  const [activeDocId, setActiveDocId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [pickerDate, setPickerDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Merge required docs with uploaded state
  const docList = REQUIRED_DOCS.map(req => ({
    ...req,
    uploaded: documents.find(d => d.documentType === req.id) ?? null,
    status: resolveStatus(documents.find(d => d.documentType === req.id)),
  }));

  const uploadedCount = docList.filter(d => d.status !== 'incomplete').length;
  const verifiedCount = docList.filter(d => d.status === 'verified').length;
  const allDone = verifiedCount === REQUIRED_DOCS.length;

  // ── Upload helpers ──────────────────────────────────────────────────────────

  const openUpload = (docId: string) => {
    setActiveDocId(docId);
    setExpiryDate('');
    setPickerDate(new Date());
    setDateError('');
    setSelectedFile(null);
    setView('upload');
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (!selected) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected <= today) {
      setDateError('Expiry date must be in the future.');
      setExpiryDate('');
      return;
    }
    setDateError('');
    setPickerDate(selected);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setExpiryDate(`${dd}-${mm}-${yyyy}`);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      const res =
        source === 'camera'
          ? await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false})
          : await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1});

      if (res.didCancel || res.errorCode || !res.assets?.length) return;
      const asset = res.assets[0];
      if (asset.uri) {
        setSelectedFile({
          uri: asset.uri,
          fileName: asset.fileName ?? 'document.jpg',
          type: asset.type ?? 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const handlePickImage = () => {
    Alert.alert('Select Photo', 'Choose how to add your document', [
      {text: 'Camera', onPress: () => pickImage('camera').catch(() => undefined)},
      {text: 'Gallery', onPress: () => pickImage('gallery').catch(() => undefined)},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleSubmit = async () => {
    if (!activeDocId || !expiryDate || !selectedFile) return;
    await onUpload(activeDocId, expiryDate, selectedFile);
  };

  const activeDoc = REQUIRED_DOCS.find(d => d.id === activeDocId);
  const canSubmit = !uploadLoading && !!activeDocId && !!expiryDate && !dateError && !!selectedFile;

  // ── Upload Form View ────────────────────────────────────────────────────────

  if (view === 'upload') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.uploadScroll}>

          {/* Header */}
          <View style={styles.uploadHeader}>
            <Pressable onPress={() => setView('list')} hitSlop={10} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          </View>

          {/* Title */}
          <Text style={styles.uploadTitle}>Upload Document</Text>
          <Text style={styles.uploadSub}>
            Please provide a clear photo of your document for faster review.
          </Text>

          {/* Selected doc pill */}
          {activeDoc && (
            <View style={styles.selectedDocPill}>
              <Text style={styles.selectedDocIcon}>{activeDoc.icon}</Text>
              <Text style={styles.selectedDocLabel}>{activeDoc.label}</Text>
            </View>
          )}

          {/* Expiry date */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>EXPIRY DATE</Text>
            <Pressable
              onPress={() => setShowPicker(true)}
              style={[styles.dateInput, styles.datePressable]}>
              <Text style={expiryDate ? styles.dateValueText : styles.datePlaceholderText}>
                {expiryDate || 'Tap to select date'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </Pressable>
            {dateError ? (
              <Text style={styles.dateErrorText}>{dateError}</Text>
            ) : null}
            {showPicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date(Date.now() + 86400000)}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* File picker */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>DOCUMENT PHOTO</Text>
            <Pressable
              onPress={handlePickImage}
              style={[styles.filePicker, selectedFile && styles.filePickerDone]}>
              {selectedFile ? (
                <View style={styles.filePickerInner}>
                  <Text style={styles.filePickerIcon}>📄</Text>
                  <Text style={styles.filePickerName}>
                    {selectedFile.fileName || 'Document Captured'}
                  </Text>
                  <Text style={styles.filePickerRetake}>Tap to retake</Text>
                </View>
              ) : (
                <View style={styles.filePickerInner}>
                  <Text style={styles.filePickerIcon}>📷</Text>
                  <Text style={styles.filePickerPrompt}>Tap to capture or select</Text>
                  <Text style={styles.filePickerHint}>JPG, PNG or PDF · Max 10MB</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Error */}
          {uploadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{uploadError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitUploadBtn, !canSubmit && styles.btnDisabled]}>
            <Text style={styles.submitUploadBtnText}>
              {uploadLoading ? 'Uploading…' : 'Submit for Review'}
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </View>

        {/* Progress banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconCircle}>
            <Text style={styles.infoIconGlyph}>ℹ</Text>
          </View>
          <Text style={styles.infoText}>
            {allDone
              ? 'All documents verified! You can now receive job requests.'
              : `${uploadedCount} of ${REQUIRED_DOCS.length} documents uploaded. Upload all to start receiving jobs.`}
          </Text>
        </View>

        {/* Upload guidelines card */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolHeader}>
            <View style={styles.protocolIconBox}>
              <Text style={styles.protocolIconGlyph}>☑</Text>
            </View>
            <Text style={styles.protocolTitle}>Upload Guidelines</Text>
          </View>
          {[
            'Ensure all text is legible and edges are visible',
            'Accepted formats: JPG, PNG, or PDF',
            'Max file size: 10MB per document',
          ].map((rule, i) => (
            <View key={i} style={styles.protocolRow}>
              <Text style={styles.protocolCheck}>⊙</Text>
              <Text style={styles.protocolText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Background check card */}
        <View style={styles.bgCard}>
          <View style={styles.bgCardTop}>
            <Text style={styles.bgCardTitle}>BACKGROUND CHECK{'\n'}REQUIRED</Text>
            <View style={styles.bgShieldCircle}>
              <Text style={styles.bgShieldIcon}>🛡</Text>
            </View>
          </View>
          <Text style={styles.bgCardSub}>
            Mandatory safety screening for all active haulers.
          </Text>
          <Pressable style={styles.bgCardBtn}>
            <Text style={styles.bgCardBtnText}>START SCREENING</Text>
          </Pressable>
        </View>

        {/* Document cards */}
        <View style={styles.docList}>
          {docList.map(doc => {
            const sc = STATUS_CONFIG[doc.status];
            const isIncomplete = doc.status === 'incomplete';
            const isRejected = doc.status === 'rejected';
            const isVerified = doc.status === 'verified';
            const isUnderReview = doc.status === 'under_review';

            return (
              <View
                key={doc.id}
                style={[
                  styles.docCard,
                  isRejected && styles.docCardRejected,
                  isIncomplete && styles.docCardIncomplete,
                ]}>

                {/* Top row */}
                <View style={styles.docTop}>
                  <View style={[styles.docIconBox, isIncomplete && styles.docIconBoxDim]}>
                    <Text style={styles.docIcon}>{doc.icon}</Text>
                  </View>
                  <View style={styles.docMeta}>
                    <Text style={[styles.docName, isIncomplete && styles.docNameDim]}>
                      {doc.label}
                    </Text>
                    <Text style={styles.docDesc} numberOfLines={1}>
                      {doc.uploaded?.description ?? doc.desc}
                    </Text>
                  </View>
                  <View style={[styles.badge, {backgroundColor: sc.bg, borderColor: sc.border}]}>
                    <Text style={[styles.badgeText, {color: sc.text}]}>{sc.label}</Text>
                  </View>
                </View>

                {/* Rejection / wrong doc reason */}
                {isRejected && doc.uploaded?.rejectionReason ? (
                  <View style={styles.rejectionRow}>
                    <Text style={styles.rejectionIcon}>⚠</Text>
                    <Text style={styles.rejectionText} numberOfLines={2}>
                      {doc.uploaded.rejectionReason}
                    </Text>
                  </View>
                ) : null}

                {/* Under review note */}
                {isUnderReview ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewIcon}>⏳</Text>
                    <Text style={styles.reviewText}>
                      Document uploaded — under review by admin.
                    </Text>
                  </View>
                ) : null}

                {/* Action buttons */}
                {isIncomplete && (
                  <Pressable
                    onPress={() => openUpload(doc.id)}
                    style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </Pressable>
                )}
                {isUnderReview && (
                  <View style={styles.docActionRow}>
                    <Pressable
                      onPress={() => openUpload(doc.id)}
                      style={[styles.outlineBtn, styles.docActionHalf]}>
                      <Text style={styles.outlineBtnText}>Re-upload</Text>
                    </Pressable>
                  </View>
                )}
                {isRejected && (
                  <Pressable
                    onPress={() => openUpload(doc.id)}
                    style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>Re-upload</Text>
                  </Pressable>
                )}
                {isVerified && (
                  <Pressable
                    onPress={() => openUpload(doc.id)}
                    style={styles.outlineBtn}>
                    <Text style={styles.outlineBtnText}>Replace</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
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

        {/* Submit / Skip */}
        <View style={styles.submitWrap}>
          <Pressable
            onPress={() => openUpload(
              docList.find(d => d.status === 'incomplete')?.id ?? REQUIRED_DOCS[0].id,
            )}
            style={[styles.submitBtn, allDone && styles.submitBtnDone]}>
            <Text style={styles.submitArrow}>{allDone ? '✓' : '▷'}</Text>
            <Text style={styles.submitBtnText}>
              {allDone ? 'All Documents Submitted' : 'Submit Documents'}
            </Text>
          </Pressable>
          {onSkip ? (
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#E8EDF3',
  },
  menuBtn: {width: 36, height: 36, justifyContent: 'center'},
  menuIcon: {fontSize: 22, color: colors.navy},
  headerTitle: {flex: 1, textAlign: 'center', color: colors.navy, fontSize: 18, fontWeight: '900'},
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center',
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

  // ── Protocol card ─────────────────────────────────────────────────────────
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
  protocolCheck: {color: '#60A5FA', fontSize: 15, flexShrink: 0, marginTop: 1},
  protocolText: {flex: 1, color: '#94A3B8', fontSize: 13, lineHeight: 19},

  // ── Background check card ─────────────────────────────────────────────────
  bgCard: {
    backgroundColor: '#0F172A', marginHorizontal: spacing.lg, marginTop: spacing.md,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  bgCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  bgCardTitle: {color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 26, flex: 1},
  bgShieldCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E40AF',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10, flexShrink: 0,
  },
  bgShieldIcon: {fontSize: 18},
  bgCardSub: {color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 16},
  bgCardBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  bgCardBtnText: {color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5},

  // ── Document list ─────────────────────────────────────────────────────────
  docList: {paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md},

  docCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.lg, gap: 12,
  },
  docCardRejected: {borderColor: '#FCA5A5', borderWidth: 1.5},
  docCardIncomplete: {borderColor: '#E2E8F0', borderStyle: 'dashed'},

  docTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  docIconBox: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  docIconBoxDim: {backgroundColor: '#F8FAFC', opacity: 0.6},
  docIcon: {fontSize: 20},
  docMeta: {flex: 1},
  docName: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 2},
  docNameDim: {color: '#94A3B8'},
  docDesc: {color: '#64748B', fontSize: 12},

  badge: {
    borderRadius: radius.pill, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
  },
  badgeText: {fontSize: 9, fontWeight: '900', letterSpacing: 0.5},

  // Rejection row
  rejectionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7ED', borderRadius: radius.sm, padding: spacing.sm,
  },
  rejectionIcon: {color: '#EA580C', fontSize: 14, flexShrink: 0},
  rejectionText: {flex: 1, color: '#EA580C', fontSize: 12, lineHeight: 17},

  // Under review row
  reviewRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: radius.sm, padding: spacing.sm,
  },
  reviewIcon: {color: '#D97706', fontSize: 13, flexShrink: 0},
  reviewText: {flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17},

  // Buttons
  uploadBtn: {
    backgroundColor: '#0F172A', borderRadius: radius.sm,
    paddingVertical: 13, alignItems: 'center',
  },
  uploadBtnText: {color: '#fff', fontSize: 14, fontWeight: '800'},

  outlineBtn: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.sm,
    paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff',
  },
  outlineBtnText: {color: colors.navy, fontSize: 13, fontWeight: '800'},

  docActionRow: {flexDirection: 'row', gap: 10},
  docActionHalf: {flex: 1},

  // ── Help card ─────────────────────────────────────────────────────────────
  helpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC', marginHorizontal: spacing.lg, marginTop: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: '#E2E8F0', padding: spacing.lg,
  },
  helpTextWrap: {flex: 1},
  helpTitle: {color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: 4},
  helpSub: {color: '#64748B', fontSize: 12, lineHeight: 17},
  helpBtn: {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', backgroundColor: '#fff', flexShrink: 0,
  },
  helpBtnText: {color: colors.navy, fontSize: 12, fontWeight: '900', textAlign: 'center'},

  // ── Submit / Skip ─────────────────────────────────────────────────────────
  submitWrap: {paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 36, gap: 12},
  submitBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg, minHeight: 58,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  submitBtnDone: {backgroundColor: colors.mint},
  submitArrow: {color: '#fff', fontSize: 18},
  submitBtnText: {color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.3},
  skipBtn: {alignItems: 'center', paddingVertical: 6},
  skipBtnText: {color: '#94A3B8', fontSize: 13, fontWeight: '700'},

  // ── Upload form ───────────────────────────────────────────────────────────
  uploadScroll: {padding: spacing.lg, paddingBottom: 48, gap: spacing.md},
  uploadHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm},
  backBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4},
  backArrow: {fontSize: 20, color: colors.accent},
  backLabel: {color: colors.accent, fontSize: 15, fontWeight: '800'},

  uploadTitle: {color: colors.navy, fontSize: 26, fontWeight: '900', marginBottom: spacing.sm},
  uploadSub: {color: '#64748B', fontSize: 14, lineHeight: 21},

  selectedDocPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE',
    marginTop: spacing.sm,
  },
  selectedDocIcon: {fontSize: 16},
  selectedDocLabel: {color: '#1D4ED8', fontSize: 13, fontWeight: '800'},

  formCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#E2E8F0', padding: spacing.lg, gap: spacing.sm,
  },
  formLabel: {
    color: colors.navy, fontSize: 11, fontWeight: '900',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  dateInput: {
    backgroundColor: '#F8FAFC', borderRadius: radius.sm,
    paddingHorizontal: spacing.lg, minHeight: 52,
    fontSize: 15, color: colors.navy,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  datePressable: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateValueText: {
    color: colors.navy, fontSize: 15, fontWeight: '700',
  },
  datePlaceholderText: {
    color: '#94A3B8', fontSize: 15,
  },
  calendarIcon: {fontSize: 20},
  dateErrorText: {
    color: '#B91C1C', fontSize: 12, fontWeight: '700', marginTop: 4,
  },
  filePicker: {
    height: 150, backgroundColor: '#F8FAFC', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: '#CBD5E1', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  filePickerDone: {borderStyle: 'solid', borderColor: colors.mint, backgroundColor: '#EFF6FF'},
  filePickerInner: {alignItems: 'center', gap: 6},
  filePickerIcon: {fontSize: 32},
  filePickerName: {color: colors.navy, fontSize: 14, fontWeight: '800'},
  filePickerRetake: {color: colors.mint, fontSize: 12, fontWeight: '700'},
  filePickerPrompt: {color: '#64748B', fontSize: 14, fontWeight: '800'},
  filePickerHint: {color: '#94A3B8', fontSize: 12},

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: radius.sm,
    padding: spacing.md, borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: {color: '#B91C1C', fontSize: 13, fontWeight: '700'},

  submitUploadBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: {opacity: 0.4},
  submitUploadBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
});

export default DocumentUploadStepScreen;
