import React from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import {colors} from '../theme';

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
        {/* Invisible tap zone over the GET STARTED button in the image */}
        <Pressable
          onPress={onGetStarted}
          style={styles.getStartedArea}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        />
        {/* Invisible tap zone over the "Already have an account? Login" text */}
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
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
  },
  // Sits over the blue GET STARTED button in the static splash artwork.
  getStartedArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '69%',
    height: '8%',
  },
  // Sits over the "Already have an account? Login" text in the artwork.
  loginArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '80%',
    height: '6%',
  },
});

export default SplashScreen;
