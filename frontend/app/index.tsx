import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.gold} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
