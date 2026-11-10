import { getMonthDays, getWeekDays, getDayHours } from './date';
import { hexToRgba } from './colors';

describe('date utils', () => {
  it('getWeekDays returns Monday..Sunday by default', () => {
    const days = getWeekDays(new Date(2026, 10, 11)); // Wed 11 Nov 2026
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });

  it('getMonthDays covers full weeks around the month', () => {
    const days = getMonthDays(new Date(2026, 1, 15)); // Feb 2026
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1);
    expect(days[0] <= new Date(2026, 1, 1)).toBe(true);
    expect(days.at(-1) >= new Date(2026, 1, 28)).toBe(true);
  });

  it('getDayHours returns 0..23', () => {
    expect(getDayHours()).toEqual([...Array(24).keys()]);
  });
});

describe('hexToRgba', () => {
  it('converts 6- and 3-digit hex', () => {
    expect(hexToRgba('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)');
    expect(hexToRgba('#fff')).toBe('rgba(255,255,255,1)');
  });

  it('passes through non-hex values', () => {
    expect(hexToRgba('red')).toBe('red');
  });
});
