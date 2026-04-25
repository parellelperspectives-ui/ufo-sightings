export function decodeHTMLEntities(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

 export function capitalize(str = '') {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }