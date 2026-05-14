import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {radius, spacing} from '../../theme';

interface JobSearchLockedScreenProps {
  profileComplete: boolean;
  documentsApproved: boolean;
  onGoToProfile: () => void;
  onGoToDocuments: () => void;
}

const JobSearchLockedScreen: React.FC<JobSearchLockedScreenProps> = ({
  profileComplete,
  onGoToProfile,
  onGoToDocuments,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>🔒</Text>
      </View>

      <Text style={styles.title}>Document Verification Pending</Text>
      <Text style={styles.subtitle}>
        Complete your document verification first before searching for jobs.
      </Text>

      <Pressable
        style={styles.btn}
        onPress={profileComplete ? onGoToDocuments : onGoToProfile}>
        <Text style={styles.btnText}>
          {profileComplete ? 'Complete Verification →' : 'Complete Profile →'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  iconText: {fontSize: 38},
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
