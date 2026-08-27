import { Redirect } from 'expo-router';

// Entry point: send everyone straight to the dashboard.
export default function Index() {
  return <Redirect href="/home" />;
}
