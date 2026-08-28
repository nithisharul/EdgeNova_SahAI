import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Motion } from '../constants/Theme';

/**
 * Motion helpers.
 *
 * Built on React Native's own Animated API rather than a motion library:
 * nothing extra to install, and it already ships in the project (ProgressBar
 * uses it). Every helper here is deliberately short and small in amplitude --
 * a 12px rise reads as content settling into place, a 40px one reads as an
 * effect being performed at you.
 *
 * Standard easing is ease-out: quick to start, gentle to finish, which is what
 * makes an interface feel responsive rather than sluggish.
 */

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Fade and rise on mount. Returns a style object to spread onto an Animated.View.
 *
 * @param {boolean} active - start the animation (e.g. once a result arrives)
 * @param {number} delay   - stagger offset for siblings
 */
export function useReveal(active = true, delay = 0) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Motion.reveal,
      delay,
      easing: EASE_OUT,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, delay, progress]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };
}

/**
 * Count a number up to its real value.
 *
 * Only ever used on figures that ALREADY arrived from the backend -- the
 * animation is a reveal of a known number, never a placeholder standing in for
 * one that has not loaded. Returns the current value as state so it can be
 * formatted (rupees, percentages) on the way out, which an interpolated
 * Animated.Value cannot be.
 */
export function useCountUp(target, { duration = Motion.value, enabled = true } = {}) {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  const raf = useRef(null);

  useEffect(() => {
    const end = Number(target) || 0;

    if (!enabled) {
      setDisplay(end);
      return undefined;
    }

    let start = null;
    const step = (timestamp) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);
      // Matches EASE_OUT closely enough, without pulling in the easing curve.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(end * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setDisplay(end);
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, enabled]);

  return display;
}

/**
 * Animate a bar or meter to a percentage.
 *
 * Width cannot run on the native driver, so this returns a plain Animated.Value
 * for the caller to interpolate. A handful of short width tweens costs nothing;
 * screen readers still get the real value from the label, not the tween.
 */
export function useMeter(percent, { duration = Motion.value, enabled = true } = {}) {
  const value = useRef(new Animated.Value(enabled ? 0 : percent)).current;

  useEffect(() => {
    const target = Math.max(0, Math.min(100, Number(percent) || 0));
    if (!enabled) {
      value.setValue(target);
      return undefined;
    }
    const animation = Animated.timing(value, {
      toValue: target,
      duration,
      easing: EASE_OUT,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percent, duration, enabled, value]);

  return value;
}

/** Press feedback: a small, quick scale-down. Native-driver safe. */
export function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) =>
    Animated.timing(scale, {
      toValue,
      duration: Motion.fast,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();

  return {
    scale,
    onPressIn: () => animateTo(to),
    onPressOut: () => animateTo(1),
  };
}

export default { useReveal, useCountUp, useMeter, usePressScale };
