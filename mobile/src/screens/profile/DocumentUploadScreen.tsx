import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
// import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Card from '../../components/common/Card';

interface DocumentUploadScreenProps {
  onUpload: (documentType: string, expiryDate: string, file: any) => Promise<void>;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}

const documentTypes = [
  {id: 'driving_license', label: 'Driving License'},
  {id: 'vehicle_insurance', label: 'Vehicle Insurance'},
  {id: 'aadhaar_card', label: 'Aadhaar Card'},
  {id: 'pan_card', label: 'PAN Card'},
  {id: 'vehicle_registration', label: 'Vehicle Registration (RC)'},
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

  const handlePickImage = () => {
    Alert.alert(
      'Select Image',
      'Choose a method to upload your document',
      [
        {
          text: 'Camera',
          onPress: () => {
            // launchCamera({mediaType: 'photo', quality: 0.8}, (res) => {
            //   if (res.assets && res.assets[0]) setSelectedFile(res.assets[0]);
            // });
            setSelectedFile({uri: 'mock-uri', fileName: 'document.jpg'});
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            // launchImageLibrary({mediaType: 'photo', quality: 0.8}, (res) => {
            //   if (res.assets && res.assets[0]) setSelectedFile(res.assets[0]);
            // });
            setSelectedFile({uri: 'mock-uri', fileName: 'document.jpg'});
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
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
            <Text style={styles.backBtnText}>✕ Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Upload Document</Text>
          <Text style={styles.subtitle}>
            Please provide high-quality photos of your documents for faster verification.
          </Text>
        </View>

        <Card title="Document Type">
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
          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8A94A0"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <Text style={[styles.label, {marginTop: 20}]}>Document Photo</Text>
          <Pressable 
            onPress={handlePickImage}
            style={[styles.uploadBox, selectedFile && styles.uploadBoxActive]}
          >
            {selectedFile ? (
              <View style={styles.fileSelected}>
                <Text style={styles.fileIcon}>📄</Text>
                <Text style={styles.fileName}>
                  {selectedFile.fileName || 'Document Captured'}
                </Text>
                <Text style={styles.retakeText}>Tap to retake</Text>
              </View>
            ) : (
              <View style={styles.filePlaceholder}>
                <Text style={styles.cameraIcon}>📷</Text>
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
              (loading || !selectedType || !expiryDate || !selectedFile) && styles.disabledButton,
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
    backgroundColor: '#F4F1E8',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5B6671',
    lineHeight: 21,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DED0',
    backgroundColor: '#F4F1E8',
  },
  typeBtnActive: {
    borderColor: '#102235',
    backgroundColor: '#102235',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B6671',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102235',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#18232F',
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  uploadBox: {
    height: 140,
    backgroundColor: '#F4F1E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DED0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBoxActive: {
    borderStyle: 'solid',
    borderColor: '#18794E',
    backgroundColor: '#F0F9F4',
  },
  filePlaceholder: {
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A94A0',
  },
  fileSelected: {
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#18794E',
    marginBottom: 4,
  },
  retakeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5B6671',
  },
  errorText: {
    color: '#A53A32',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default DocumentUploadScreen;
