import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import Card from '../../components/common/Card';

interface HandoverScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (checklist: any, photos: any[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const HandoverScreen: React.FC<HandoverScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  loading,
  error,
}) => {
  const [checklist, setChecklist] = useState({
    vehicleClean: false,
    noVisibleDamage: false,
    safetyGearReady: false,
    documentsReceived: false,
  });

  const [photos, setPhotos] = useState<Record<string, any>>({});

  const handlePickPhoto = (side: string) => {
    Alert.alert('Capture Photo', `Take a photo of the ${side} of the vehicle`, [
      {
        text: 'Capture',
        onPress: () => {
          setPhotos(prev => ({...prev, [side]: {uri: 'mock-uri'}}));
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const toggleItem = (key: keyof typeof checklist) => {
    setChecklist(prev => ({...prev, [key]: !prev[key]}));
  };

  const isComplete = 
    Object.values(checklist).every(v => v === true) && 
    Object.keys(photos).length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.stepTitle}>Step 2 of 3</Text>
          <Text style={styles.mainTitle}>Vehicle Handover Check</Text>
          <Text style={styles.subtitle}>
            Please verify the vehicle condition and ensure all safety protocols are met before departure.
          </Text>
        </View>

        <Card title="Pre-Trip Checklist" subtitle={`Ref: ${jobReference}`}>
          <View style={styles.checklist}>
            <Pressable
              style={styles.checkItem}
              onPress={() => toggleItem('vehicleClean')}>
              <Text style={styles.checkLabel}>Vehicle is clean and organized</Text>
              <Switch
                value={checklist.vehicleClean}
                onValueChange={() => toggleItem('vehicleClean')}
                trackColor={{false: '#E4DED0', true: '#18794E'}}
                thumbColor="#FFFFFF"
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.checkItem}
              onPress={() => toggleItem('noVisibleDamage')}>
              <Text style={styles.checkLabel}>No visible damage to cargo area</Text>
              <Switch
                value={checklist.noVisibleDamage}
                onValueChange={() => toggleItem('noVisibleDamage')}
                trackColor={{false: '#E4DED0', true: '#18794E'}}
                thumbColor="#FFFFFF"
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.checkItem}
              onPress={() => toggleItem('safetyGearReady')}>
              <Text style={styles.checkLabel}>Safety equipment is on board</Text>
              <Switch
                value={checklist.safetyGearReady}
                onValueChange={() => toggleItem('safetyGearReady')}
                trackColor={{false: '#E4DED0', true: '#18794E'}}
                thumbColor="#FFFFFF"
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.checkItem}
              onPress={() => toggleItem('documentsReceived')}>
              <Text style={styles.checkLabel}>Transit documents received</Text>
              <Switch
                value={checklist.documentsReceived}
                onValueChange={() => toggleItem('documentsReceived')}
                trackColor={{false: '#E4DED0', true: '#18794E'}}
                thumbColor="#FFFFFF"
              />
            </Pressable>
          </View>
        </Card>

        <Card title="Vehicle Photos" subtitle="Capture 4 sides of the vehicle">
          <View style={styles.photoGrid}>
            {['Front', 'Rear', 'Left', 'Right'].map(side => (
              <Pressable 
                key={side}
                onPress={() => handlePickPhoto(side)}
                style={[styles.photoBox, photos[side] && styles.photoBoxActive]}
              >
                <Text style={styles.photoIcon}>{photos[side] ? '✅' : '📷'}</Text>
                <Text style={styles.photoLabel}>{side}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <Pressable
            onPress={() => onSubmit(checklist, Object.values(photos))}
            disabled={loading || !isComplete}
            style={[
              styles.primaryButton,
              (loading || !isComplete) && styles.disabledButton,
            ]}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Submitting...' : 'Sign & Start Trip'}
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
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#5B6671',
    lineHeight: 21,
  },
  checklist: {
    marginTop: 8,
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18232F',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E4DED0',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  photoBox: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DED0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxActive: {
    borderStyle: 'solid',
    borderColor: '#18794E',
    backgroundColor: '#F0F9F4',
  },
  photoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A94A0',
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

export default HandoverScreen;
