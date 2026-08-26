import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../../components/SahaiHeader';
import Colors from '../../constants/Colors';
import { Spacing, Typography, CardBase, Shadow } from '../../constants/Theme';

export default function AIScreen() {
  return (
    <View style={styles.screen}>
      <SahaiHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Ionicons name="sparkles-outline" size={28} color={Colors.secondary} />
          <Text style={styles.cardTitle}>AI</Text>
          <Text style={styles.cardBody}>This section is being built next.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { ...CardBase, ...Shadow.card, gap: Spacing.sm },
  cardTitle: { ...Typography.subtitle },
  cardBody: { ...Typography.bodySmall },
});
