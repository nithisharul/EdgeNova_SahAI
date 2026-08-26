import ComingSoonScreen from '../components/ComingSoonScreen';

export default function CropHealthScreen() {
  return (
    <ComingSoonScreen
      title="Crop Health"
      subtitle="Agriculture"
      phaseLabel="Coming soon"
      icon="pulse"
      description="Track how the standing crop is doing and catch stress in the field before it spreads."
      bullets={[
        'Growth stage and field condition log',
        'Early warnings for pest and nutrient stress',
        'Season-by-season health history',
      ]}
    />
  );
}
