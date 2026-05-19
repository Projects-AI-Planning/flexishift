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
  View,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors, fonts} from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentVerificationScreenProps {
  documents: any[];
  verificationStatus: any;
  driverAvailability?: string;
  refreshing: boolean;
  onRefresh: () => void;
  onUpload: (documentType: string, expiryDate: string, file: any) => Promise<void>;
  uploadLoading: boolean;
  uploadError: string | null;
  onSubmit?: () => void;
}

interface UploadForm {
  file: {uri: string; fileName: string; type: string} | null;
  expiry: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_DOCS = [
  {
    backendKey: 'DRIVING_LICENCE',
    normalKey:  'driving_license',
    label:      'Driving License',
    icon:       '🪪',
    subtitle:   'Standard Texas Class A CDL',
  },
  {
    backendKey: 'VEHICLE_REG',
    normalKey:  'vehicle_registration',
    label:      'Vehicle Registration',
    icon:       '🚛',
    subtitle:   'Freightliner Cascadia 2022',
  },
  {
    backendKey: 'VEHICLE_INSURANCE',
    normalKey:  'vehicle_insurance',
    label:      'Insurance Policy',
    icon:       '🛡️',
    subtitle:   'General Liability Coverage',
  },
];

function getVisibleDocs(driverAvailability?: string) {
  const mode = (driverAvailability ?? '').toUpperCase();
  if (mode === 'DRIVER_ONLY') {
    return REQUIRED_DOCS.filter(d => d.normalKey === 'driving_license');
  }
  if (mode === 'TRUCK_ONLY') {
    return REQUIRED_DOCS.filter(d => d.normalKey !== 'driving_license');
  }
  // DRIVER_WITH_TRUCK or unknown → show all three
  return REQUIRED_DOCS;
}

function normalizeDocType(raw: string | undefined): string {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'driving_licence' || v === 'driving_license') {return 'driving_license';}
  if (v === 'vehicle_reg'     || v === 'vehicle_registration') {return 'vehicle_registration';}
  if (v === 'vehicle_insurance') {return 'vehicle_insurance';}
  return v;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentVerificationScreen: React.FC<DocumentVerificationScreenProps> = ({
  documents,
  verificationStatus: _verificationStatus,
  driverAvailability,
  refreshing,
  onRefresh,
  onUpload,
  uploadLoading,
  uploadError,
  onSubmit,
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [uploadForms, setUploadForms] = useState<Record<string, UploadForm>>({});

  const visibleDocs = getVisibleDocs(driverAvailability);

  const getUploadedDoc = (normalKey: string) =>
    documents.find(d =>
      normalizeDocType(d.documentType ?? d.docType ?? d.type) === normalKey,
    );

  const openUploadForm = (normalKey: string) => {
    setExpandedCard(normalKey);
    setUploadForms(prev => ({...prev, [normalKey]: {file: null, expiry: ''}}));
  };

  const patchForm = (normalKey: string, patch: Partial<UploadForm>) =>
    setUploadForms(prev => ({...prev, [normalKey]: {...prev[normalKey], ...patch}}));

  const pickFile = (normalKey: string) => {
    Alert.alert('Select Document', 'Choose upload method', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            const res = await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false});
            const a = res.assets?.[0];
            if (a?.uri) {
              patchForm(normalKey, {file: {uri: a.uri, fileName: a.fileName ?? 'doc.jpg', type: a.type ?? 'image/jpeg'}});
            }
          } catch {}
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          try {
            const res = await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1});
            const a = res.assets?.[0];
            if (a?.uri) {
              patchForm(normalKey, {file: {uri: a.uri, fileName: a.fileName ?? 'doc.jpg', type: a.type ?? 'image/jpeg'}});
            }
          } catch {}
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleUpload = async (backendKey: string, normalKey: string) => {
    const form = uploadForms[normalKey];
    if (!form?.file) {
      Alert.alert('No file selected', 'Please select a document photo first.');
      return;
    }
    if (!form.expiry.trim()) {
      Alert.alert('Expiry required', 'Please enter the document expiry date.');
      return;
    }
    await onUpload(backendKey, form.expiry.trim(), form.file);
    setExpandedCard(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Document Verification</Text>
        </View>

        {/* ── Info Banner ─────────────────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
          <Text style={styles.infoText}>
            Job requests are restricted until all{'\n'}documents are approved by the admin.
          </Text>
        </View>

        {/* ── Verification Protocol ──────────────────────────────────────── */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolHeader}>
            <View style={styles.protocolIconBox}>
              <Text style={styles.protocolIconText}>☑</Text>
            </View>
            <Text style={styles.protocolTitle}>Verification Protocol</Text>
          </View>

          {[
            'Ensure all text is legible and edges are visible',
            'Accepted formats: JPG, PNG, or PDF',
            'Max file size: 10MB per document',
          ].map((rule, i) => (
            <View key={i} style={styles.protocolRow}>
              <View style={styles.protocolBullet}>
                <Text style={styles.protocolBulletTick}>✓</Text>
              </View>
              <Text style={styles.protocolRuleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* ── Document Cards ─────────────────────────────────────────────── */}
        {visibleDocs.map(def => {
          const doc = getUploadedDoc(def.normalKey);
          const status = doc?.status?.toLowerCase();
          const isVerified  = status === 'approved' || status === 'verified';
          const isPending   = status === 'pending'  || status === 'under_review';
          const isRejected  = status === 'rejected';
          const hasDoc      = isVerified || isPending || isRejected;
          const isExpanded  = expandedCard === def.normalKey;
          const form        = uploadForms[def.normalKey];

          return (
            <View
              key={def.normalKey}
              style={[styles.docCard, isRejected && styles.docCardRejected]}>

              {/* ── Card top row ── */}
              <View style={styles.docRow}>
                <View style={[styles.docIconBox, isRejected && styles.docIconBoxRed]}>
                  <Text style={styles.docIconText}>{def.icon}</Text>
                </View>

                <View style={styles.docMeta}>
                  <Text style={styles.docName}>{def.label}</Text>
                  <Text style={styles.docSubtitle}>
                    {doc?.description ?? def.subtitle}
                  </Text>
                </View>

                {isVerified && (
                  <View style={styles.badgeVerified}>
                    <Text style={styles.badgeVerifiedText}>VERIFIED</Text>
                  </View>
                )}
                {isPending && (
                  <View style={styles.badgePending}>
                    <Text style={styles.badgePendingText}>PENDING REVIEW</Text>
                  </View>
                )}
                {isRejected && (
                  <View style={styles.badgeRejected}>
                    <Text style={styles.badgeRejectedText}>REJECTED</Text>
                  </View>
                )}
              </View>

              {/* ── Rejection reason ── */}
              {isRejected && (
                <View style={styles.rejectionRow}>
                  <View style={styles.rejectionIcon}>
                    <Text style={styles.rejectionIconText}>!</Text>
                  </View>
                  <Text style={styles.rejectionMsg}>
                    {doc?.rejectionReason?.trim() || 'Image blurry: License number unreadable'}
                  </Text>
                </View>
              )}

              {/* ── Inline upload form (expands when Replace / Upload New tapped) ── */}
              {isExpanded && (
                <View style={styles.uploadForm}>
                  <Pressable
                    onPress={() => pickFile(def.normalKey)}
                    style={[styles.filePicker, form?.file && styles.filePickerReady]}>
                    {form?.file ? (
                      <View style={styles.filePickerInner}>
                        <Text style={styles.fpIcon}>📄</Text>
                        <Text style={styles.fpName} numberOfLines={1}>{form.file.fileName}</Text>
                        <Text style={styles.fpRetap}>Tap to change</Text>
                      </View>
                    ) : (
                      <View style={styles.filePickerInner}>
                        <Text style={styles.fpIcon}>📷</Text>
                        <Text style={styles.fpPrompt}>Tap to select document</Text>
                        <Text style={styles.fpHint}>JPG, PNG or PDF · Max 10MB</Text>
                      </View>
                    )}
                  </Pressable>

                  <AppInput
                    placeholder="Expiry date  YYYY-MM-DD"
                    value={form?.expiry ?? ''}
                    onChangeText={v => patchForm(def.normalKey, {expiry: v})}
                    keyboardType="numeric"
                    containerStyle={{marginBottom: 0}}
                  />

                  <View style={styles.formActions}>
                    <Pressable onPress={() => setExpandedCard(null)} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleUpload(def.backendKey, def.normalKey)}
                      disabled={uploadLoading}
                      style={[styles.uploadBtn, uploadLoading && {opacity: 0.5}]}>
                      <Text style={styles.uploadBtnText}>
                        {uploadLoading ? 'Uploading…' : 'Upload'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ── Action buttons (hidden while card is expanded) ── */}
              {!isExpanded && (
                <>
                  {isVerified && (
                    <Pressable
                      onPress={() => openUploadForm(def.normalKey)}
                      style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>Replace</Text>
                    </Pressable>
                  )}
                  {isPending && (
                    <Pressable
                      onPress={() => doc?.fileUrl && Linking.openURL(doc.fileUrl)}
                      style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>View</Text>
                    </Pressable>
                  )}
                  {isRejected && (
                    <Pressable
                      onPress={() => openUploadForm(def.normalKey)}
                      style={styles.darkBtn}>
                      <Text style={styles.darkBtnText}>Upload New</Text>
                    </Pressable>
                  )}
                  {!hasDoc && (
                    <Pressable
                      onPress={() => openUploadForm(def.normalKey)}
                      style={styles.outlineBtn}>
                      <Text style={styles.outlineBtnText}>Upload Document</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          );
        })}

        {/* ── Upload error ───────────────────────────────────────────────── */}
        {uploadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{uploadError}</Text>
          </View>
        ) : null}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <Pressable onPress={onSubmit} style={styles.submitBtn}>
          <Text style={styles.submitArrow}>▷</Text>
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  scroll: {paddingBottom: 36},

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 19,
    fontFamily: fonts.bold,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#C8E8FF',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: '900',
  },
  infoText: {
    flex: 1,
    color: '#1565C0',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },

  // Verification Protocol card
  protocolCard: {
    backgroundColor: '#1A2332',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  protocolIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#263347',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolIconText: {fontSize: 20, color: '#60A5FA'},
  protocolTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: '700',
    flex: 1,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  protocolBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  protocolBulletTick: {color: '#6B7280', fontSize: 9, fontWeight: '900'},
  protocolRuleText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },

  // Document card
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    gap: 14,
  },
  docCardRejected: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  docIconBoxRed: {backgroundColor: '#FEE2E2'},
  docIconText: {fontSize: 24},
  docMeta: {flex: 1},
  docName: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
    marginBottom: 2,
  },
  docSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: fonts.regular,
  },

  // Badges
  badgeVerified: {
    backgroundColor: '#DBEAFE',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  badgeVerifiedText: {
    color: '#1066B1',
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 0,
  },
  badgePendingText: {
    color: '#B45309',
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeRejected: {
    backgroundColor: '#DC2626',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  badgeRejectedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Rejection reason row
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rejectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rejectionIconText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
  },
  rejectionMsg: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },

  // Outline button (Replace / View)
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },

  // Dark filled button (Upload New)
  darkBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  darkBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },

  // Inline upload form
  uploadForm: {gap: 12},
  filePicker: {
    minHeight: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  filePickerReady: {
    borderStyle: 'solid',
    borderColor: '#1066B1',
    backgroundColor: '#EFF6FF',
  },
  filePickerInner: {alignItems: 'center', gap: 4},
  fpIcon: {fontSize: 28},
  fpName: {
    color: '#0F172A',
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: '700',
    maxWidth: 220,
    textAlign: 'center',
  },
  fpRetap: {color: '#1066B1', fontSize: 11, fontWeight: '600'},
  fpPrompt: {color: '#475569', fontSize: 13, fontWeight: '700'},
  fpHint: {color: '#94A3B8', fontSize: 11},

  expiryInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontFamily: fonts.regular,
  },

  formActions: {flexDirection: 'row', gap: 10},
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {color: '#64748B', fontSize: 14, fontFamily: fonts.bold, fontWeight: '700'},
  uploadBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },

  // Error
  errorBox: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBoxText: {color: '#B91C1C', fontSize: 13, fontWeight: '700'},

  // Submit
  submitBtn: {
    marginHorizontal: 14,
    marginTop: 20,
    backgroundColor: '#1A5FAF',
    borderRadius: 14,
    height: 62,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  submitArrow: {color: '#FFFFFF', fontSize: 22},
  submitText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default DocumentVerificationScreen;
