import ComingSoonScreen from '../components/ComingSoonScreen';

export default function MyLandScreen() {
  return (
    <ComingSoonScreen
      title="My Land"
      subtitle="Agriculture"
      phaseLabel="Coming soon"
      icon="map"
      description="Keep your farm profile in one place so recommendations arrive already tuned to your plots."
      bullets={[
        'Plot size, location and soil type',
        'Irrigation source and cropping pattern',
        'Saved defaults for faster recommendations',
      ]}
    />
  );
}
