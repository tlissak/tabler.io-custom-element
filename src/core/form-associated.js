const validityKeys = [
  'badInput',
  'customError',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
];

export function attachInternals(host) {
  try {
    return host.attachInternals?.() ?? null;
  } catch {
    return null;
  }
}

export function setFormValue(internals, value) {
  internals?.setFormValue?.(value);
}

export function syncValidity(internals, control) {
  if (!internals?.setValidity || !control?.validity) return;

  if (control.validity.valid) {
    internals.setValidity({});
    return;
  }

  const flags = {};

  validityKeys.forEach(key => {
    if (control.validity[key]) flags[key] = true;
  });

  internals.setValidity(flags, control.validationMessage, control);
}

export function valuesToFormData(name, values) {
  if (!name || typeof FormData === 'undefined') return null;

  const filteredValues = values.filter(value => value !== undefined && value !== null);
  if (!filteredValues.length) return null;

  const formData = new FormData();
  filteredValues.forEach(value => formData.append(name, value));

  return formData;
}
