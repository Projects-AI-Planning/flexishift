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
import {colors, radius, spacing} from '../../theme';

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
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.danger;
      default:
        return colors.inkSoft;
    }
  };

  const formatLabel = (value: string) =>
    value.replace(/[_.]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

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

        {verificationStatus ? (
          <Card
            title="Overall Status"
            variant={verificationStatus.isVerified ? 'accent' : 'default'}>
            <View style={styles.statusBanner}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color: getStatusColor(
                      verificationStatus.isVerified ? 'Verified' : 'Pending',
                    ),
                  },
                ]}>
                {verificationStatus.isVerified
                  ? '\u2713 Fully Verified'
                  : '\u25CB Verification in Progress'}
              </Text>
              <Text style={styles.statusDescription}>
                {verificationStatus.message ||
                  'Your documents are being reviewed by our compliance team.'}
              </Text>
            </View>
          </Card>
        ) : null}

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
              rightLabel={String(doc.status || 'PENDING').toUpperCase()}>
              {doc.rejectionReason ? (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                  <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
                </View>
              ) : null}
              <View style={styles.docFooter}>
                <Text style={styles.metaText}>
                  Uploaded on {doc.uploadedAt || 'N/A'}
                </Text>
                <Pressable>
                  <Text style={styles.viewLink}>View File</Text>
                </Pressable>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDCC4'}</Text>
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload your Driving License and Vehicle Insurance to start receiving jobs.
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
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
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
  statusBanner: {
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  statusDescription: {
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.navy,
  },
  addLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
  rejectionBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: 13,
    color: colors.ink,
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '900',
  },
});

export default DocumentStatusScreen;
