export const hexToRgba = (hex, alpha = 1) => {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  if (hex.startsWith('var(')) {
    return `color-mix(in srgb, ${hex}, transparent calc(100% - (${alpha} * 100%)))`;
  }
  return hex;
};
