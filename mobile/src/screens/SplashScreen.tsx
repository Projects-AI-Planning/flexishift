import React from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
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
        {/* Transparent hit-area over the GET STARTED button in the image */}
        <Pressable
          onPress={onGetStarted}
          style={styles.getStartedArea}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        />
        {/* Transparent hit-area over the "Already have an account? Login" link */}
        <Pressable
          onPress={onLogin}
          style={styles.loginArea}
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Login"
        />
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
  // Covers the blue GET STARTED button (~66–76% from top)
  getStartedArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: '10%',
  },
  // Covers the "Already have an account? Login" line (~76–84% from top)
  loginArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '76%',
    height: '8%',
  },
});

export default SplashScreen;
