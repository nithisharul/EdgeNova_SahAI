import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Radius, Spacing } from '../../constants/Theme';

/** Active tab icons sit inside a soft green pill, like the design reference. */
function TabIcon({ name, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="farm"
        options={{
          title: 'Field',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'leaf' : 'leaf-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Fund',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          // "AI" as a destination name says what the technology is rather
          // than what the tab does, and the sparkle icon is the visual cliche
          // this product should avoid. "Ask" names the action -- and stays
          // distinct from the Crop Advisor screen, which "Advisor" did not.
          title: 'Ask',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    // The bar has to fit the icon pill plus a full line of label text --
    // too tight and the label gets clipped rather than wrapped.
    height: Platform.OS === 'ios' ? 92 : 76,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm,
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  iconWrapActive: {
    backgroundColor: Colors.accentSoft,
  },
});
