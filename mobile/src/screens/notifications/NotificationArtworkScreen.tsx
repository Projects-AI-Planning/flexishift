import React from 'react';
import {Image, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

const NotificationArtworkScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.frame}>
        <Image
          source={require('../../assets/screens/Notification.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  frame: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default NotificationArtworkScreen;
