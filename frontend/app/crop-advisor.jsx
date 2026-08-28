import { useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import Backdrop from '../components/Backdrop';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import StepSection from '../components/StepSection';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import FactorBar from '../components/FactorBar';
import FertilizerResult from '../components/FertilizerResult';
import ErrorNotice from '../components/ErrorNotice';
import LoadingState from '../components/LoadingState';
import Colors from '../constants/Colors';
import { Spacing, Radius, Typography, FontSize, Motion } from '../constants/Theme';
import { validateNumber } from '../utils/validation';
import { useBreakpoint } from '../utils/layout';
import { useReveal, useCountUp } from '../utils/motion';
import { getCropAdvisory, fetchWeather, SOIL_TYPES } from '../services/cropService';

/**
 * Crop Advisor -- the front door, and the screen judges will look at longest.
 *
 * FORM AS THREE QUESTIONS, NOT ONE
 * --------------------------------
 * The model needs a dozen numbers. Asked all at once that is a tax return;
 * asked as "where is your field / what is your soil / do you have a soil test"
 * it is three short questions with visible progress. The numbered steps sit on
 * the page rather than inside cards, so nothing is nested.
 *
 * WEATHER, IN THREE STEPS
 * -----------------------
 *   1. GPS        one tap; the farmer never sees a coordinate
 *   2. Town name  when GPS is denied or unavailable
 *   3. Type it    only when both of the above have failed
 *
 * Step 3 stays hidden until it is needed. Asking a farmer for "rainfall in mm"
 * up front is a worse experience than asking for a town.
 *
 * TWO NPK SCALES
 * --------------
 * Step 03 collects the FERTILIZER model's N/K/P, a different measurement basis
 * from the crop model's N/P/K in step 02. They are never copied into each
 * other. Leave step 03 blank and the backend answers needs_soil_test, which
 * this screen reports rather than filling in.
 */

const SOIL_FIELDS = [
  { name: 'n', label: 'Nitrogen (N)', unit: 'ratio', placeholder: '90', min: 0, max: 200 },
  { name: 'p', label: 'Phosphorus (P)', unit: 'ratio', placeholder: '42', min: 0, max: 200 },
  { name: 'k', label: 'Potassium (K)', unit: 'ratio', placeholder: '43', min: 0, max: 250 },
  { name: 'ph', label: 'Soil pH', unit: '', placeholder: '6.5', min: 0, max: 14 },
  { name: 'moisture', label: 'Soil moisture', unit: '%', placeholder: '45', min: 0, max: 100 },
];

const WEATHER_FIELDS = [
  { name: 'temperature', label: 'Temperature', unit: '°C', placeholder: '27', min: -5, max: 55 },
  { name: 'humidity', label: 'Humidity', unit: '%', placeholder: '80', min: 0, max: 100 },
  { name: 'rainfall', label: 'Rainfall, last month', unit: 'mm', placeholder: '200', min: 0, max: 1000 },
];

const FERT_FIELDS = [
  { name: 'fertNitrogen', label: 'Nitrogen', unit: '', placeholder: '24', min: 0, max: 150 },
  { name: 'fertPhosphorous', label: 'Phosphorous', unit: '', placeholder: '18', min: 0, max: 150 },
  { name: 'fertPotassium', label: 'Potassium', unit: '', placeholder: '12', min: 0, max: 150 },
];

const EMPTY = {
  n: '', p: '', k: '', ph: '', moisture: '45',
  temperature: '', humidity: '', rainfall: '',
  fertNitrogen: '', fertPhosphorous: '', fertPotassium: '',
};

export default function CropAdvisorScreen() {
  const { isDesktop, maxWidth } = useBreakpoint();

  const [values, setValues] = useState(EMPTY);
  const [soilType, setSoilType] = useState('Loamy');
  const [errors, setErrors] = useState({});

  const [locationStage, setLocationStage] = useState('idle'); // idle|locating|ready|place|manual
  const [coords, setCoords] = useState(null);
  const [place, setPlace] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const loading = status === 'loading';
  const showManualWeather = locationStage === 'manual';

  const setField = (name) => (text) => {
    setValues((prev) => ({ ...prev, [name]: text }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const applyWeather = (data) => {
    setWeather(data);
    setValues((prev) => ({
      ...prev,
      temperature: String(data.temperature),
      humidity: String(data.humidity),
      rainfall: String(data.rainfall),
    }));
  };

  const useMyLocation = async () => {
    setWeatherError(null);
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;

    if (!geo?.getCurrentPosition) {
      setLocationStage('place');
      setWeatherError({
        kind: 'invalid',
        message: 'This device cannot share its location. Enter your town instead.',
      });
      return;
    }

    setLocationStage('locating');
    setWeatherBusy(true);

    geo.getCurrentPosition(
      async (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(next);
        try {
          applyWeather(await fetchWeather(next));
          setLocationStage('ready');
        } catch (error) {
          // Located fine but weather failed -- a town name will not help.
          setWeatherError(error);
          setLocationStage('manual');
        } finally {
          setWeatherBusy(false);
        }
      },
      () => {
        setWeatherBusy(false);
        setLocationStage('place');
        setWeatherError({
          kind: 'invalid',
          message: 'Location was not shared. Enter your nearest town instead.',
        });
      },
      { timeout: 12000, maximumAge: 300000 }
    );
  };

  const useTownName = async () => {
    if (!place.trim()) {
      setErrors((prev) => ({ ...prev, place: 'Enter a town or village name.' }));
      return;
    }
    setWeatherBusy(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather({ place: place.trim() });
      setCoords({ latitude: data.latitude, longitude: data.longitude });
      applyWeather(data);
      setLocationStage('ready');
    } catch (error) {
      setWeatherError(error);
      setLocationStage('manual');
    } finally {
      setWeatherBusy(false);
    }
  };

  const enterManually = () => {
    setLocationStage('manual');
    setWeather(null);
    setCoords(null);
    setWeatherError(null);
  };

  const validate = () => {
    const found = {};

    SOIL_FIELDS.forEach((field) => {
      const message = validateNumber(values[field.name], field);
      if (message) found[field.name] = message;
    });

    if (showManualWeather) {
      WEATHER_FIELDS.forEach((field) => {
        const message = validateNumber(values[field.name], field);
        if (message) found[field.name] = message;
      });
    }

    // All three fertilizer values or none -- a partial set cannot run the model.
    const filled = FERT_FIELDS.filter((f) => String(values[f.name]).trim() !== '');
    if (filled.length > 0 && filled.length < FERT_FIELDS.length) {
      FERT_FIELDS.forEach((field) => {
        if (String(values[field.name]).trim() === '') {
          found[field.name] = 'Enter all three, or leave all three blank.';
        }
      });
    } else {
      filled.forEach((field) => {
        const message = validateNumber(values[field.name], { ...field, required: false });
        if (message) found[field.name] = message;
      });
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (loading || !validate()) return;

    setStatus('loading');
    setFailure(null);

    try {
      const payload = await getCropAdvisory({
        n: values.n,
        p: values.p,
        k: values.k,
        ph: values.ph,
        soilType,
        moisture: values.moisture,
        ...(coords && locationStage === 'ready' ? coords : {}),
        ...(showManualWeather
          ? {
              temperature: values.temperature,
              humidity: values.humidity,
              rainfall: values.rainfall,
            }
          : {
              temperature: values.temperature || undefined,
              humidity: values.humidity || undefined,
              rainfall: values.rainfall || undefined,
            }),
        fertNitrogen: values.fertNitrogen,
        fertPotassium: values.fertPotassium,
        fertPhosphorous: values.fertPhosphorous,
      });
      setResult(payload);
      setStatus('done');
    } catch (error) {
      // 422 means the backend could not resolve weather either: open the
      // manual fields rather than leaving the farmer stuck.
      if (error?.kind === 'invalid') setLocationStage('manual');
      setFailure(error);
      setStatus('error');
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setResult(null);
    setStatus('idle');
    setFailure(null);
    setLocationStage('idle');
    setCoords(null);
    setWeather(null);
    setPlace('');
  };

  const showResult = status === 'done' && !!result;

  return (
    <View style={styles.screen}>
      <SahaiHeader title="Crop Advisor" subtitle="Field" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth: maxWidth('content') }]}>
            {showResult ? (
              <AdvisoryResult result={result} onReset={reset} isDesktop={isDesktop} />
            ) : (
              <>
                <View style={styles.intro}>
                  <Backdrop variant="field" height={170} />
                  <Text style={styles.introTitle}>Find a crop suited to your field</Text>
                  <Text style={styles.introBody}>
                    Three short steps. We read the weather for you.
                  </Text>
                </View>

                {status === 'error' && !!failure && <ErrorNotice error={failure} />}

                {/* ---- 01 Location ---- */}
                <StepSection
                  number="01"
                  title="Where is your field?"
                  hint="Used only to look up local weather."
                >
                  {locationStage === 'idle' && (
                    <PrimaryButton
                      label="Use my location"
                      icon="location-outline"
                      onPress={useMyLocation}
                    />
                  )}

                  {locationStage === 'locating' && (
                    <LoadingState message="Finding your field..." />
                  )}

                  {!!weatherError && locationStage !== 'ready' && (
                    <ErrorNotice error={weatherError} />
                  )}

                  {locationStage === 'place' && (
                    <>
                      <InputField
                        label="Town or village"
                        value={place}
                        onChangeText={(text) => {
                          setPlace(text);
                          setErrors((prev) => ({ ...prev, place: undefined }));
                        }}
                        placeholder="e.g. Salem"
                        error={errors.place}
                        autoCapitalize="words"
                        editable={!weatherBusy}
                      />
                      <PrimaryButton
                        label="Get weather"
                        icon="partly-sunny-outline"
                        loading={weatherBusy}
                        loadingLabel="Looking up..."
                        onPress={useTownName}
                      />
                      <SecondaryButton
                        label="Enter weather myself"
                        icon="create-outline"
                        onPress={enterManually}
                      />
                    </>
                  )}

                  {locationStage === 'ready' && !!weather && (
                    <WeatherPanel weather={weather} onRedo={enterManually} />
                  )}

                  {showManualWeather && (
                    <>
                      {WEATHER_FIELDS.map((field) => (
                        <InputField
                          key={field.name}
                          label={field.label}
                          value={values[field.name]}
                          onChangeText={setField(field.name)}
                          placeholder={field.placeholder}
                          unit={field.unit || undefined}
                          error={errors[field.name]}
                          required
                          keyboardType="decimal-pad"
                          editable={!loading}
                        />
                      ))}
                      <SecondaryButton
                        label="Try my location again"
                        icon="location-outline"
                        onPress={() => {
                          setLocationStage('idle');
                          setWeatherError(null);
                        }}
                      />
                    </>
                  )}
                </StepSection>

                {/* ---- 02 Soil ---- */}
                <StepSection
                  number="02"
                  title="Your soil"
                  hint="From a soil test, your agriculture centre, or a field sensor."
                >
                  <SelectField
                    label="Soil type"
                    value={soilType}
                    onChange={setSoilType}
                    options={SOIL_TYPES}
                    required
                    disabled={loading}
                  />

                  <View style={[styles.fieldGrid, isDesktop && styles.fieldGridDesktop]}>
                    {SOIL_FIELDS.map((field) => (
                      <InputField
                        key={field.name}
                        label={field.label}
                        value={values[field.name]}
                        onChangeText={setField(field.name)}
                        placeholder={field.placeholder}
                        unit={field.unit || undefined}
                        error={errors[field.name]}
                        required
                        keyboardType="decimal-pad"
                        editable={!loading}
                        style={isDesktop && styles.gridCell}
                      />
                    ))}
                  </View>
                </StepSection>

                {/* ---- 03 Optional soil test ---- */}
                <StepSection
                  number="03"
                  title="Fertilizer soil test"
                  optional
                  hint="A separate reading on its own scale. Without all three we can still recommend a crop, but not a fertilizer grade."
                >
                  <View style={[styles.fieldGrid, isDesktop && styles.fieldGridDesktop]}>
                    {FERT_FIELDS.map((field) => (
                      <InputField
                        key={field.name}
                        label={field.label}
                        value={values[field.name]}
                        onChangeText={setField(field.name)}
                        placeholder={field.placeholder}
                        error={errors[field.name]}
                        keyboardType="decimal-pad"
                        editable={!loading}
                        style={isDesktop && styles.gridCell}
                      />
                    ))}
                  </View>
                </StepSection>

                {loading ? (
                  <LoadingState message="Checking your field conditions..." />
                ) : (
                  <PrimaryButton label="Get recommendation" onPress={submit} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** What the lookup found, and how far to trust it. */
function WeatherPanel({ weather, onRedo }) {
  const reveal = useReveal(true);
  const where = weather.resolvedLocation?.name;

  return (
    <Animated.View style={[styles.weatherPanel, reveal]}>
      <View style={styles.weatherHead}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.weatherTitle}>
          {where ? `Weather near ${where}` : 'Weather found for your location'}
        </Text>
      </View>

      <View style={styles.weatherRow}>
        {[
          { label: 'Temperature', value: `${weather.temperature}°` },
          { label: 'Humidity', value: `${weather.humidity}%` },
          { label: 'Rainfall', value: `${weather.rainfall}mm` },
        ].map((item) => (
          <View key={item.label} style={styles.weatherItem}>
            <Text style={styles.weatherValue}>{item.value}</Text>
            <Text style={styles.weatherLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* The backend's own honesty text, shown rather than smoothed over. */}
      <Text style={styles.weatherNote}>
        Measured at the nearest weather grid point, not your exact field.
      </Text>
      {!!weather.rainfallBasis && (
        <Text style={styles.weatherNote}>{weather.rainfallBasis}</Text>
      )}

      <SecondaryButton label="Enter weather myself" icon="create-outline" onPress={onRedo} />
    </Animated.View>
  );
}

/** Crop, reasoning, alternatives, then fertilizer. */
function AdvisoryResult({ result, onReset, isDesktop }) {
  const { crop, why, fertilizer, needsSoilTest, weather } = result;
  const reveal = useReveal(true);
  const alsoReveal = useReveal(true, Motion.stagger * 2);

  const percent = Math.round((crop.confidence || 0) * 100);
  const counted = useCountUp(percent);
  const others = crop.alternatives.filter((alt) => alt.crop !== crop.name).slice(0, 2);

  return (
    <>
      {/* Hero. One crop, one number, one sentence -- no nested cards. */}
      <Animated.View style={[styles.resultHero, reveal]}>
        <Backdrop variant="field" height={260} tone="deep" />
        <Text style={styles.resultEyebrow}>Best match</Text>
        <Text style={[styles.resultCrop, isDesktop && styles.resultCropDesktop]}>
          {String(crop.name).toUpperCase()}
        </Text>
        <View style={styles.resultMatchRow}>
          <Text style={styles.resultMatch}>{Math.round(counted)}%</Text>
          <Text style={styles.resultMatchLabel}>suited to your{'\n'}field conditions</Text>
        </View>
      </Animated.View>

      {/* Alternatives as a ranked list, not more cards. */}
      {others.length > 0 && (
        <Animated.View style={[styles.section, alsoReveal]}>
          <Text style={styles.sectionLabel}>Other suitable crops</Text>
          <View style={styles.altList}>
            {others.map((alt, index) => (
              <View
                key={alt.crop}
                style={[styles.altRow, index === others.length - 1 && styles.altRowLast]}
              >
                <Text style={styles.altName}>{alt.crop}</Text>
                <Text style={styles.altValue}>{Math.round((alt.confidence || 0) * 100)}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Explainability -- the model's own sentence, given real weight. */}
      {!!why?.summary && (
        <View style={styles.whyBlock}>
          <Text style={styles.sectionLabel}>Why this crop</Text>
          <Text style={styles.whySummary}>{why.summary}</Text>

          {!!why.topFactors?.length && (
            <View style={styles.factorList}>
              {why.topFactors.map((factor, index) => (
                <FactorBar
                  key={factor.feature}
                  label={factor.label}
                  value={factor.value}
                  influence={factor.influence}
                  direction={factor.direction}
                  delay={Motion.stagger * index}
                />
              ))}
            </View>
          )}

          {!!why.caveat && <Text style={styles.caveat}>{why.caveat}</Text>}
        </View>
      )}

      {/* Fertilizer: model, guideline, or an honest "we need a soil test". */}
      {needsSoilTest ? (
        <View style={styles.soilTestBlock}>
          <View style={styles.soilTestHead}>
            <Ionicons name="flask-outline" size={18} color={Colors.info} />
            <Text style={styles.soilTestTitle}>A soil test is needed for fertilizer advice</Text>
          </View>
          <Text style={styles.soilTestBody}>
            {result.message ||
              'Add the fertilizer soil-test values and we can suggest a grade. Your crop recommendation above is unaffected.'}
          </Text>
        </View>
      ) : (
        !!fertilizer && <FertilizerResult fertilizer={fertilizer} />
      )}

      {!!weather?.caveat && (
        <Text style={styles.provenance}>
          {weather.source === 'manual'
            ? 'Weather values were entered by hand.'
            : weather.caveat}
        </Text>
      )}

      <SecondaryButton label="Start again" icon="refresh" onPress={onReset} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.section },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.xl },

  intro: {
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  introTitle: { ...Typography.heading, maxWidth: 340 },
  introBody: { ...Typography.bodySmall },

  fieldGrid: { gap: Spacing.lg },
  fieldGridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { flexBasis: '47%', flexGrow: 1 },

  // ---- weather ----
  weatherPanel: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  weatherHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  weatherTitle: { ...Typography.label, color: Colors.secondary, flex: 1 },
  weatherRow: { flexDirection: 'row', gap: Spacing.lg },
  weatherItem: { flex: 1, gap: 2 },
  weatherValue: {
    ...Typography.title,
    color: Colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  weatherLabel: { ...Typography.caption },
  weatherNote: { ...Typography.caption, lineHeight: 16 },

  // ---- result hero ----
  resultHero: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  resultEyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  resultCrop: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -1.5,
  },
  resultCropDesktop: { fontSize: 68, lineHeight: 72 },
  resultMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  resultMatch: {
    ...Typography.display,
    color: Colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  resultMatchLabel: { ...Typography.bodySmall, lineHeight: 18 },

  // ---- alternatives ----
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.sectionLabel },
  altList: { borderTopWidth: 1, borderTopColor: Colors.border },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  altRowLast: { borderBottomWidth: 0 },
  altName: { ...Typography.body, fontWeight: '600', textTransform: 'capitalize' },
  altValue: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.secondary,
    fontVariant: ['tabular-nums'],
  },

  // ---- why ----
  whyBlock: { gap: Spacing.md },
  whySummary: { ...Typography.body, lineHeight: 25, color: Colors.text },
  factorList: { gap: Spacing.lg, marginTop: Spacing.sm },
  caveat: { ...Typography.caption, lineHeight: 16, fontStyle: 'italic' },

  // ---- needs soil test ----
  soilTestBlock: {
    backgroundColor: Colors.infoSoft,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  soilTestHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  soilTestTitle: { ...Typography.subtitle, color: Colors.info, flex: 1 },
  soilTestBody: { ...Typography.bodySmall, color: Colors.info, lineHeight: 20 },

  provenance: { ...Typography.caption, lineHeight: 16 },
});
