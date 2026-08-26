/**
 * Small form-validation helpers shared by the agriculture forms.
 *
 * These check that a value was entered and that it is a plausible number.
 * They deliberately hold no agronomy knowledge -- the ranges only exist to
 * stop obviously invalid submissions reaching the service layer.
 */

/**
 * Validates one numeric field against an optional range.
 * @returns {string|null} an error message, or null when the value is fine.
 */
export function validateNumber(rawValue, { label, min, max, required = true } = {}) {
  const text = String(rawValue ?? '').trim();

  if (!text) return required ? `${label} is required.` : null;

  const value = Number(text);
  if (!Number.isFinite(value)) return `${label} must be a number.`;

  if (min !== undefined && value < min) return `${label} cannot be below ${min}.`;
  if (max !== undefined && value > max) return `${label} cannot be above ${max}.`;

  return null;
}

/** Validates a plain required text field, e.g. the crop name. */
export function validateText(rawValue, { label, minLength = 2 } = {}) {
  const text = String(rawValue ?? '').trim();
  if (!text) return `${label} is required.`;
  if (text.length < minLength) return `${label} must be at least ${minLength} characters.`;
  return null;
}

/**
 * Validates an Indian-style 10 digit mobile number.
 * Prototype-level only: digits are checked, the number is not verified.
 */
export function validatePhone(rawValue, { label = 'Phone number' } = {}) {
  const text = String(rawValue ?? '').trim();
  if (!text) return `${label} is required.`;

  const digits = text.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return `${label} must contain digits only.`;
  if (digits.length !== 10) return `${label} must be 10 digits.`;
  if (!/^[6-9]/.test(digits)) return `${label} must start with 6, 7, 8 or 9.`;

  return null;
}

/**
 * Runs a rule map over a value map.
 * @param {object} values - { fieldName: rawValue }
 * @param {object} rules  - { fieldName: rule } where rule is a numeric spec
 *                          or { type: 'text', label }
 * @returns {{ errors: object, isValid: boolean }}
 */
export function validateForm(values, rules) {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    let error;
    if (rule.type === 'text') error = validateText(values[field], rule);
    else if (rule.type === 'phone') error = validatePhone(values[field], rule);
    else error = validateNumber(values[field], rule);
    if (error) errors[field] = error;
  });

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** Converts the validated string inputs into numbers for the service call. */
export function toNumbers(values, fields) {
  return fields.reduce((acc, field) => {
    acc[field] = Number(String(values[field]).trim());
    return acc;
  }, {});
}
