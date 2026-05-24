import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon from '../../components/common/Icon';

export interface ProfileCheck {
  label: string;
  done: boolean;
}

export interface DocCheck {
  label: string;
  status: 'approved' | 'pending' | 'rejected' | 'missing';
}

export interface AvailabilityGateInfo {
  availabilityMode: string;
  modeLabel: string;
  profileChecks: ProfileCheck[];
  docChecks: DocCheck[];
  nextAction: 'set_availability' | 'complete_profile' | 'upload_docs' | 'wait_approval';
}

interface JobSearchLockedScreenProps {
  gateInfo: AvailabilityGateInfo;
  onGoToProfile: () => void;
  onGoToDocuments: () => void;
  onGoToAvailability: () => void;
  context?: 'jobs' | 'shifts';
}

const CONFIG = {
  set_availability: {
    icon: 'settings' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Set Your Availability Type',
    subtitle: 'Choose Driver Only, Truck Only, or Driver with Truck to unlock this section.',
    btnLabel: 'Set Availability →',
    btnColor: '#1066B1',
  },
  complete_profile: {
    icon: 'user' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Complete Your Profile',
    subtitle: 'Fill in the required profile fields to unlock this section.',
    btnLabel: 'Go to Profile →',
    btnColor: '#1066B1',
  },
  upload_docs: {
    icon: 'file' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Documents Not Uploaded',
    subtitle: 'Upload the required documents for your availability mode to unlock this section.',
    btnLabel: 'Upload Documents →',
    btnColor: '#1066B1',
  },
  wait_approval: {
    icon: 'clock' as const,
    iconBg: '#EAF3FD',
    iconBorder: '#BFDBFE',
    title: 'Documents Under Verification',
    subtitle: 'Your documents have been submitted and are being reviewed by the admin. You will be notified once approved.',
    btnLabel: null,
    btnColor: null,
  },
};

const JobSearchLockedScreen: React.FC<JobSearchLockedScreenProps> = ({
  gateInfo,
  onGoToProfile,
  onGoToDocuments,
  onGoToAvailability,
}) => {
  const {nextAction} = gateInfo;
  const cfg = CONFIG[nextAction];

  const onPress =
    nextAction === 'set_availability' ? onGoToAvailability :
    nextAction === 'complete_profile' ? onGoToProfile :
                                        onGoToDocuments;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, {backgroundColor: cfg.iconBg, borderColor: cfg.iconBorder}]}>
        <Icon name={cfg.icon} size={36} color="#000000" strokeWidth={1.5} />
      </View>

      <Text style={styles.title}>{cfg.title}</Text>
      <Text style={styles.subtitle}>{cfg.subtitle}</Text>

      {cfg.btnLabel && cfg.btnColor ? (
        <Pressable style={[styles.btn, {backgroundColor: cfg.btnColor}]} onPress={onPress}>
          <Text style={styles.btnText}>{cfg.btnLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
    backgroundColor: colors.bg,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 20, fontWeight: '900', color: '#111827',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, color: '#6B7280',
    textAlign: 'center', lineHeight: 21, maxWidth: 280, marginBottom: 28,
  },
  btn: {
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: radius.lg, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  btnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '900'},
});

export default JobSearchLockedScreen;
