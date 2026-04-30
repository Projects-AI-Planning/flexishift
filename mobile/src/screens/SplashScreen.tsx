import React from 'react';
import {View, Text, StyleSheet, SafeAreaView} from 'react-native';

const SplashScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.truckIcon}>🚚</Text>
          <Text style={styles.logoText}>FREIGHTFLEX</Text>
        </View>
        <Text style={styles.tagline}>Smart Logistics, Simplified</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102235', // Matches 'nav' color in palette
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  truckIcon: {
    fontSize: 80,
    marginBottom: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    color: '#C4CDD6',
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default SplashScreen;
