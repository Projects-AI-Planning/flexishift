import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Card from '../../components/common/Card';

interface DocumentStatusScreenProps {
  documents: any[];
  verificationStatus: any;
  refreshing: boolean;
  onRefresh: () => void;
  onUploadNew: () => void;
}

const DocumentStatusScreen: React.FC<DocumentStatusScreenProps> = ({
  documents,
  verificationStatus,
  refreshing,
  onRefresh,
  onUploadNew,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return '#18794E';
      case 'pending':
        return '#DFA622';
      case 'rejected':
        return '#A53A32';
      default:
        return '#5B6671';
    }
  };

  const formatLabel = (value: string) => {
    return value
      .replace(/[_.]/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>My Documents</Text>
          <Text style={styles.subtitle}>
            Manage your professional credentials and verification status.
          </Text>
        </View>

        {verificationStatus && (
          <Card 
            title="Overall Status" 
            variant={verificationStatus.isVerified ? 'accent' : 'default'}
          >
            <View style={styles.statusBanner}>
              <Text style={[styles.statusText, {color: getStatusColor(verificationStatus.isVerified ? 'Verified' : 'Pending')}]}>
                {verificationStatus.isVerified ? '✓ Fully Verified' : '○ Verification in Progress'}
              </Text>
              <Text style={styles.statusDescription}>
                {verificationStatus.message || 'Your documents are being reviewed by our compliance team.'}
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
          <Pressable onPress={onUploadNew}>
            <Text style={styles.addLink}>+ Add New</Text>
          </Pressable>
        </View>

        {documents.length > 0 ? (
          documents.map(doc => (
            <Card
              key={doc.documentId}
              title={formatLabel(doc.documentType)}
              subtitle={`Expires: ${doc.expiryDate || 'No expiry'}`}
              rightLabel={doc.status.toUpperCase()}
            >
              {doc.rejectionReason && (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                  <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
                </View>
              )}
              <View style={styles.docFooter}>
                <Text style={styles.metaText}>Uploaded on {doc.uploadedAt || 'N/A'}</Text>
                <Pressable>
                  <Text style={styles.viewLink}>View File</Text>
                </Pressable>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptySubtitle}>
              Please upload your Driving License and Vehicle Insurance to start receiving jobs.
            </Text>
            <Pressable onPress={onUploadNew} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Upload First Document</Text>
            </Pressable>
          </View>
        )}
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
  statusBanner: {
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#5B6671',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102235',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
  },
  rejectionBox: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#A53A32',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A53A32',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: '#18232F',
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4DED0',
  },
  metaText: {
    fontSize: 12,
    color: '#8A94A0',
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102235',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#5B6671',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default DocumentStatusScreen;
