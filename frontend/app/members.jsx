import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import SahaiHeader from '../components/SahaiHeader';
import MemberCard from '../components/MemberCard';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography } from '../constants/Theme';
import { formatCurrency } from '../utils/currency';
import { getMembers } from '../services/memberService';

export default function MembersScreen() {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setMembers(await getMembers());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Refetch on focus so a member added on the next screen appears here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSavings = members.reduce((sum, member) => sum + (member.savings || 0), 0);

  return (
    <View style={styles.screen}>
      <SahaiHeader title="SHG Members" subtitle="Finance" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Text style={styles.subtitle}>
            View savings, loans and repayment status for each member.
          </Text>

          <PrimaryButton
            label="Add Member"
            icon="add"
            onPress={() => router.push('/add-member')}
          />

          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading members...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Unable to load members. Please try again.</Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && members.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No members yet.</Text>
              <Text style={styles.emptyBody}>Add the first SHG member to begin.</Text>
            </View>
          )}

          {status === 'ready' && members.length > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {members.length} members · {formatCurrency(totalSavings)} saved
                </Text>
              </View>

              <View style={styles.list}>
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    // MemberCard reads `loan`; the roster stores outstandingLoan.
                    member={{ ...member, loan: member.outstandingLoan }}
                    onPress={() => router.push(`/member-details?id=${member.id}`)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodySmall,
    lineHeight: 21,
  },
  summaryRow: {
    paddingTop: Spacing.xs,
  },
  summaryText: {
    ...Typography.sectionLabel,
  },
  list: {
    gap: Spacing.md,
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  stateText: {
    ...Typography.bodySmall,
  },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  emptyBox: {
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.subtitle,
  },
  emptyBody: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
