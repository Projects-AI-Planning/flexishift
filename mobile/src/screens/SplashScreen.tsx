import React from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

interface SplashScreenProps {
  onGetStarted: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onGetStarted}) => {
  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to create account"
        onPress={onGetStarted}
        style={styles.fill}>
        <ImageBackground
          source={require('../assets/screens/Freightflex.png')}
          resizeMode="cover"
          style={styles.fill}
        />
      </Pressable>
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
});

export default SplashScreen;
