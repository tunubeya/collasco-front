import { useEffect, useState, RefObject } from 'react';

export function useDynamicTextColor(ref: RefObject<HTMLElement>, fallback = 'text-white') {
  const [textColor, setTextColor] = useState(fallback);
  const [hoverClass, setHoverClass] = useState('hover:bg-gray-700');

  function isColorDark(hexColor: string): boolean {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 160;
  }

  function rgbToHex(rgb: string): string {
    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';
    const [r, g, b] = result.map(Number);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  useEffect(() => {
    const detectColor = () => {
      const el = ref.current;
      if (!el) {
        setTimeout(detectColor, 100);
        return;
      }

      const computed = getComputedStyle(el);
      const bgColor = computed.getPropertyValue('background-color').trim();

      if (!bgColor) {
        setTimeout(detectColor, 100);
        return;
      }

      const hex = rgbToHex(bgColor);
      const isDark = isColorDark(hex);

      setTextColor(isDark ? 'text-white' : 'text-black');
      setHoverClass(isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200');
    };

    detectColor();
  }, [ref]);

  return { textColor, hoverClass };
}
