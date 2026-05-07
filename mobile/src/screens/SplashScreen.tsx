import React from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface SplashScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onGetStarted, onLogin}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../assets/screens/Freightflex.png')}
        resizeMode="cover"
        style={styles.fill}>
        {/* Spacer pushes buttons to the same vertical position as in the image */}
        <View style={styles.spacer} />

        {/* Covers + replaces the GET STARTED button baked into the image */}
        <Pressable
          onPress={onGetStarted}
          style={({pressed}) => [styles.getStartedBtn, pressed && styles.getStartedBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Get Started">
          <Text style={styles.getStartedText}>GET STARTED  →</Text>
        </Pressable>

        {/* Covers + replaces the login anchor baked into the image */}
        <Pressable
          onPress={onLogin}
          style={styles.loginRow}
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Login">
          <Text style={styles.loginPrompt}>
            Already have an account?{'  '}
            <Text style={styles.loginLink}>Login</Text>
          </Text>
        </Pressable>

        {/* Bottom gap to sit above the system-status footer in the image */}
        <View style={styles.footer} />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071A2D',
  },
  fill: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  getStartedBtn: {
    marginHorizontal: 24,
    backgroundColor: '#1A6FD4',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  getStartedBtnPressed: {
    opacity: 0.85,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loginRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  loginPrompt: {
    color: '#B0BCCC',
    fontSize: 13,
  },
  loginLink: {
    color: '#5BA8F5',
    fontWeight: '600',
  },
  footer: {
    height: 72,
  },
});

export default SplashScreen;
