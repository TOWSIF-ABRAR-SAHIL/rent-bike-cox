function renderTemplate(template, variables) {
  if (!template) return '';
  let result = String(template);
  if (!variables) return result;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value !== null && value !== undefined ? String(value) : '');
  }
  return result;
}

function renderObject(obj, variables) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = renderTemplate(value, variables);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = renderObject(value, variables);
    } else {
      result[key] = value;
    }
  }
  return result;
}

module.exports = { renderTemplate, renderObject };
