import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon from '../../components/common/Icon';

interface JobSearchLockedScreenProps {
  documentState: 'missing' | 'pending' | 'rejected';
  profileComplete: boolean;
  onGoToProfile: () => void;
  onGoToDocuments: () => void;
}

const JobSearchLockedScreen: React.FC<JobSearchLockedScreenProps> = ({
  documentState,
  profileComplete,
  onGoToProfile,
  onGoToDocuments,
}) => {
  const needsProfile = !profileComplete;
  const needsDocuments = documentState === 'missing';
  const isRejected = documentState === 'rejected';
  const title = needsDocuments
    ? 'Upload Documents'
    : isRejected
    ? 'Document Rejected'
    : needsProfile
    ? 'Complete Your Profile'
    : 'Documents Under Verification';
  const subtitle = needsDocuments
    ? needsProfile
      ? 'Complete your driver profile, then upload your required documents. Jobs will unlock after admin approval.'
      : 'Upload your required documents first. Jobs will unlock after admin approval.'
    : isRejected
    ? 'Your document was rejected by admin. Tap below to upload a corrected document.'
    : needsProfile
    ? 'Complete your driver profile before searching for jobs.'
    : 'Your documents are under verification. You will be notified soon after admin review.';
  const buttonText = needsProfile
    ? 'Complete Profile ->'
    : needsDocuments || isRejected
    ? 'Upload Documents ->'
    : 'View Documents';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon
          name={needsDocuments ? 'file' : isRejected ? 'alert-triangle' : 'lock'}
          size={38}
          color="#000000"
          strokeWidth={1.5}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Pressable
        style={styles.btn}
        onPress={profileComplete ? onGoToDocuments : onGoToProfile}>
        <Text style={styles.btnText}>{buttonText}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EAF3FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 280,
    marginBottom: 36,
  },
  btn: {
    width: '100%',
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1066B1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},
});

export default JobSearchLockedScreen;
