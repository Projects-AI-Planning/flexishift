import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface ScannerInterfaceScreenProps {
  onClose: () => void;
}

const ScannerInterfaceScreen: React.FC<ScannerInterfaceScreenProps> = ({
  onClose,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Point the camera at the pickup code or enter it manually on the
          previous screen.
        </Text>

        <View style={styles.scannerFrame}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
          <Text style={styles.scannerIcon}>{'\uD83D\uDCF7'}</Text>
          <Text style={styles.scannerText}>Camera preview placeholder</Text>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tips</Text>
          <Text style={styles.tipText}>
            Keep the code centered and avoid glare.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {flex: 1, padding: spacing.xl},
  title: {color: colors.navy, fontSize: 32, fontWeight: '900'},
  subtitle: {color: colors.inkSoft, fontSize: 15, lineHeight: 22, marginTop: 6},
  scannerFrame: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    flex: 1,
    justifyContent: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  scannerIcon: {fontSize: 54, marginBottom: spacing.md},
  scannerText: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
  tipCard: {
    backgroundColor: '#F8FAFD',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  tipTitle: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  tipText: {color: colors.inkSoft, fontSize: 13, marginTop: 4},
  cornerTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
  },
});

export default ScannerInterfaceScreen;
