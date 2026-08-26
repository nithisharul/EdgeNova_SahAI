import ComingSoonScreen from '../components/ComingSoonScreen';

export default function LoanRiskScreen() {
  return (
    <ComingSoonScreen
      title="Check Loan Risk"
      subtitle="SHG Finance"
      phaseLabel="Coming in Phase 5"
      icon="speedometer-outline"
      description="Score a loan request before the group approves it, using repayment history and the member's savings record."
      bullets={[
        'Requested amount and repayment period',
        'Member savings and past repayment behaviour',
        'A risk band the group can act on together',
      ]}
    />
  );
}
