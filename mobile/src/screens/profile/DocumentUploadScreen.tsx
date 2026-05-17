import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface DocumentUploadScreenProps {
  onUpload: (
    documentType: string,
    expiryDate: string,
    file: any,
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}

const documentTypes = [
  {id: 'DRIVING_LICENCE', label: 'Driving Licence'},
  {id: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance'},
  {id: 'VEHICLE_REG', label: 'Vehicle Registration (RC)'},
  {id: 'COMPANY_REG', label: 'Company Registration'},
];

const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({
  onUpload,
  loading,
  error,
  onCancel,
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const applyPickedAsset = (asset: {
    uri?: string;
    fileName?: string | null;
    type?: string | null;
  }) => {
    if (!asset.uri) {
      return;
    }

    setSelectedFile({
      uri: asset.uri,
      fileName: asset.fileName ?? 'document.jpg',
      type: asset.type ?? 'image/jpeg',
    });
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      const response =
        source === 'camera'
          ? await launchCamera({
              mediaType: 'photo',
              quality: 0.8,
              saveToPhotos: false,
            })
          : await launchImageLibrary({
              mediaType: 'photo',
              quality: 0.8,
              selectionLimit: 1,
            });

      if (
        response.didCancel ||
        response.errorCode ||
        !response.assets?.length
      ) {
        return;
      }

      applyPickedAsset(response.assets[0]);
    } catch (pickerError) {
      Alert.alert(
        'Photo upload failed',
        pickerError instanceof Error
          ? pickerError.message
          : 'Please try selecting the photo again.',
      );
    }
  };

  const handlePickImage = () => {
    Alert.alert('Select Image', 'Choose a method to upload your document', [
      {
        text: 'Camera',
        onPress: () => {
          pickImage('camera').catch(() => undefined);
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          pickImage('gallery').catch(() => undefined);
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleUpload = () => {
    if (selectedType && expiryDate && selectedFile) {
      onUpload(selectedType, expiryDate, selectedFile);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'} Cancel</Text>
          </Pressable>
          <Text style={styles.subtitle}>
            Please provide clear photos of your documents for faster
            verification.
          </Text>
        </View>

        <Card title="Document Type" variant="accent">
          <View style={styles.typeGrid}>
            {documentTypes.map(type => (
              <Pressable
                key={type.id}
                onPress={() => setSelectedType(type.id)}
                style={[
                  styles.typeBtn,
                  selectedType === type.id && styles.typeBtnActive,
                ]}>
                <Text
                  style={[
                    styles.typeBtnText,
                    selectedType === type.id && styles.typeBtnTextActive,
                  ]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card title="Details & File">
          <AppInput
            label="Expiry Date"
            placeholder="YYYY-MM-DD"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <Text style={[styles.label, {marginTop: spacing.xl}]}>
            Document Photo
          </Text>
          <Pressable
            onPress={handlePickImage}
            style={[styles.uploadBox, selectedFile && styles.uploadBoxActive]}>
            {selectedFile ? (
              <View style={styles.fileSelected}>
                <Text style={styles.fileIcon}>{'\uD83D\uDCC4'}</Text>
                <Text style={styles.fileName}>
                  {selectedFile.fileName || 'Document Captured'}
                </Text>
                <Text style={styles.retakeText}>Tap to retake</Text>
              </View>
            ) : (
              <View style={styles.filePlaceholder}>
                <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
                <Text style={styles.uploadText}>Capture Document Photo</Text>
              </View>
            )}
          </Pressable>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <Pressable
            onPress={handleUpload}
            disabled={loading || !selectedType || !expiryDate || !selectedFile}
            style={[
              styles.primaryButton,
              (loading || !selectedType || !expiryDate || !selectedFile) &&
                styles.disabledButton,
            ]}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Uploading...' : 'Submit for Verification'}
            </Text>
          </Pressable>
        </View>
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
  header: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  typeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.neutralSoft,
  },
  typeBtnActive: {
    borderColor: '#1066B1',
    backgroundColor: '#1066B1',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  typeBtnTextActive: {
    color: colors.card,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: '#D6DCE5',
  },
  uploadBox: {
    height: 160,
    backgroundColor: '#F8FAFD',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D6DCE5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBoxActive: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: '#F0FAF2',
  },
  filePlaceholder: {
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  fileSelected: {
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  fileName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  retakeText: {
    color: colors.success,
    fontSize: 13,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
  },
  primaryButton: {
    backgroundColor: '#1066B1',
    borderRadius: 18,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 17,
    fontWeight: '900',
  },
});

export default DocumentUploadScreen;
