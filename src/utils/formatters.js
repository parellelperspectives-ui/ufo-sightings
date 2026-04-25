export const capitalizeFirst = (str = '') =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeHTMLEntities(str) {
  if (!str || typeof str !== 'string') return str;

  const txt = document.createElement('textarea');
  txt.innerHTML = str;

  return txt.value
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}