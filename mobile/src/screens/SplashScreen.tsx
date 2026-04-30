import React from 'react';
import {ImageBackground, SafeAreaView, StyleSheet} from 'react-native';

const SplashScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../assets/screens/Freightflex.png')}
        resizeMode="cover"
        style={styles.image}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071A2D',
  },
  image: {
    flex: 1,
  },
});

export default SplashScreen;
