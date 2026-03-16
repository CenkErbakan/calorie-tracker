import { Redirect } from 'expo-router';

// The barcode scanner has moved to the Scan tab.
// This redirect ensures old navigation calls (e.g. "Scan Again" buttons) still work.
export default function BarcodeScannerRedirect() {
  return <Redirect href="/(tabs)/scan" />;
}
