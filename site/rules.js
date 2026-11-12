let activeRules = null;

export function setRules(value) {
  activeRules = value;
  return activeRules;
}

export function getRules() {
  if (!activeRules) throw new Error('Decision rules have not loaded.');
  return activeRules;
}

export function getRulesOrNull() {
  return activeRules;
}

export function format(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
