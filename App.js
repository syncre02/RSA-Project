import React from 'react';
import { View } from 'react-native';
import BlindInfo from './BlindInfo';
import { AppRegistry } from 'react-native';
import 'expo-dev-client';

AppRegistry.registerComponent('windowblinds', () => App);

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
      <BlindInfo />
    </View>
  );
}
