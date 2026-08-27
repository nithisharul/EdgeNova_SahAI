import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import SahaiHeader from '../components/SahaiHeader';
import TransactionCard from '../components/TransactionCard';
import SecondaryButton from '../components/SecondaryButton';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, FontSize } from '../constants/Theme';
import { getTransactions } from '../services/financeService';
import { transactionFilters } from '../data/transactionFilters';

export default function TransactionsScreen() {
  const [all, setAll] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setAll(await getTransactions());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filter = transactionFilters.find((f) => f.id === activeFilter) || transactionFilters[0];
  const visible =
    filter.types.length === 0 ? all : all.filter((txn) => filter.types.includes(txn.type));

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Transactions" subtitle="Finance" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Text style={styles.subtitle}>
            Every deposit, disbursement, repayment and expense in the group ledger.
          </Text>

          {/* Filter chips ------------------------------------------------ */}
          <View style={styles.chipRow}>
            {transactionFilters.map((chip) => {
              const active = chip.id === activeFilter;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setActiveFilter(chip.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {status === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.secondary} />
              <Text style={styles.stateText}>Loading transactions...</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Unable to load transactions. Please try again.
              </Text>
              <SecondaryButton label="Retry" icon="refresh" onPress={load} />
            </View>
          )}

          {status === 'ready' && (
            <>
              <Text style={styles.count}>
                {visible.length} {visible.length === 1 ? 'record' : 'records'}
              </Text>

              {visible.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No transactions found</Text>
                  <Text style={styles.emptyBody}>Try another category.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {visible.map((txn) => (
                    <TransactionCard
                      key={txn.id}
                      type={txn.type}
                      description={txn.description}
                      member={txn.member}
                      amount={txn.amount}
                      date={txn.date}
                      status={txn.status}
                      statusTone={txn.statusTone}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  chipPressed: { opacity: 0.7 },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.secondary },
  count: { ...Typography.sectionLabel },
  list: { gap: Spacing.md },
  emptyBox: {
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { ...Typography.subtitle },
  emptyBody: { ...Typography.bodySmall, textAlign: 'center' },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  stateText: { ...Typography.bodySmall },
  errorBox: {
    gap: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error },
});
