const badgeColorMap = new Map([
  ['blue', ['#206bc4', '#ffffff', '#e7f1ff', '#1c5aa6']],
  ['azure', ['#4299e1', '#ffffff', '#eaf5ff', '#2f80c8']],
  ['indigo', ['#4263eb', '#ffffff', '#edf0ff', '#364fc7']],
  ['purple', ['#ae3ec9', '#ffffff', '#f8ecfb', '#9c36b5']],
  ['pink', ['#d6336c', '#ffffff', '#fdebf2', '#c2255c']],
  ['red', ['#d63939', '#ffffff', '#fdecec', '#b92f2f']],
  ['orange', ['#f76707', '#ffffff', '#fff0e6', '#d9480f']],
  ['yellow', ['#f59f00', '#182433', '#fff6d6', '#c47f00']],
  ['lime', ['#74b816', '#ffffff', '#eff8de', '#5c940d']],
  ['green', ['#2fb344', '#ffffff', '#eaf7ec', '#2b963b']],
  ['teal', ['#0ca678', '#ffffff', '#e6f7f2', '#087f5b']],
  ['cyan', ['#17a2b8', '#ffffff', '#e8f7fa', '#0c8599']],
  ['primary', ['#206bc4', '#ffffff', '#e7f1ff', '#1c5aa6']],
  ['secondary', ['#667382', '#ffffff', '#eef1f5', '#4d5968']],
  ['success', ['#2fb344', '#ffffff', '#eaf7ec', '#2b963b']],
  ['warning', ['#f59f00', '#182433', '#fff6d6', '#c47f00']],
  ['danger', ['#d63939', '#ffffff', '#fdecec', '#b92f2f']],
  ['info', ['#4299e1', '#ffffff', '#eaf5ff', '#2f80c8']],
  ['dark', ['#182433', '#ffffff', '#e9edf2', '#182433']],
  ['light', ['#ffffff', '#182433', '#ffffff', '#dce1e7']],
]);

const cssColorPattern = /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\()/i;

function colorName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function cssColorValue(value) {
  const color = String(value ?? '').trim();

  return cssColorPattern.test(color) ? color : '';
}

function solidColor(value) {
  const token = colorName(value);

  if (badgeColorMap.has(token)) {
    const [background, foreground] = badgeColorMap.get(token);

    return { background, foreground };
  }

  const customColor = cssColorValue(value);

  if (customColor) {
    return { background: customColor, foreground: '#ffffff' };
  }

  return null;
}

function badgeColorToken(value, fallback = 'secondary') {
  const token = colorName(value);

  return badgeColorMap.has(token) ? token : fallback;
}

function badgeCssColor(value, fallback) {
  const token = colorName(value);

  if (badgeColorMap.has(token)) {
    return badgeColorMap.get(token)[0];
  }

  return cssColorValue(value) || fallback;
}

function resolveBadgeSolidColors(value, fallback = 'secondary') {
  return solidColor(value) ?? solidColor(fallback) ?? solidColor('secondary');
}

export {
  badgeColorMap,
  badgeColorToken,
  badgeCssColor,
  resolveBadgeSolidColors,
};
