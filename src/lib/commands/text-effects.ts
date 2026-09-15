// ============================================================
// SerkoGram — Text Transformation & Effects Engine
// Provides creative text transformations for chat commands
// ============================================================

const FLIP_MAP: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
  i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd',
  q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x',
  y: 'ʎ', z: 'z',
  А: '∀', Б: '9', В: 'ꓭ', Г: '⅃', Д: '∇', Е: 'Ǝ', Ё: 'Ǝ', Ж: 'Ж',
  З: 'Ɛ', И: 'И', Й: 'И', К: 'ꓘ', Л: '⅂', М: 'W', Н: 'H', О: 'O',
  П: '⊔', Р: 'Ԁ', С: 'Ɔ', Т: 'ꓕ', У: 'ʎ', Ф: 'Ф', Х: 'X', Ц: 'П',
  Ч: 'h', Ш: 'm', Щ: 'm', Ъ: 'q', Ы: 'ıq', Ь: 'q', Э: 'Є', Ю: 'ОI',
  Я: 'ʁ',
  а: 'ɐ', б: 'g', в: 'в', г: 'ɹ', д: 'р', е: 'ǝ', ё: 'ǝ', ж: 'ж',
  з: 'ε', и: 'и', й: 'и', к: 'ʞ', л: 'v', м: 'w', н: 'н', о: 'о',
  п: 'u', р: 'd', с: 'ɔ', т: 'ʇ', у: 'ʎ', ф: 'ф', х: 'х', ц: 'п',
  ч: 'h', ш: 'm', щ: 'm', ъ: 'q', ы: 'ıq', ь: 'q', э: 'є', ю: 'оı',
  я: 'в',
  '1': '⇂', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ',
  '8': '8', '9': '6', '0': '0', '.': '˙', ',': '\'', '?': '¿', '!': '¡',
};

const BUBBLE_MAP: Record<string, string> = {
  a: 'ⓐ', b: 'ⓑ', c: 'ⓒ', d: 'ⓓ', e: 'ⓔ', f: 'ⓕ', g: 'ⓖ', h: 'ⓗ',
  i: 'ⓘ', j: 'ⓙ', k: 'ⓚ', l: 'ⓛ', m: 'ⓜ', n: 'ⓝ', o: 'ⓞ', p: 'ⓟ',
  q: 'ⓠ', r: 'ⓡ', s: 'ⓢ', t: 'ⓣ', u: 'ⓤ', v: 'ⓥ', w: 'ⓦ', x: 'ⓧ',
  y: 'ⓨ', z: 'ⓩ',
  A: 'Ⓐ', B: 'Ⓑ', C: 'Ⓒ', D: 'Ⓓ', E: 'Ⓔ', F: 'Ⓕ', G: 'Ⓖ', H: 'Ⓗ',
  I: 'Ⓘ', J: 'Ⓙ', K: 'Ⓚ', L: 'Ⓛ', M: 'Ⓜ', N: 'Ⓝ', O: 'Ⓞ', P: 'Ⓟ',
  Q: 'Ⓠ', R: 'Ⓡ', S: 'Ⓢ', T: 'Ⓣ', U: 'Ⓤ', V: 'Ⓥ', W: 'Ⓦ', X: 'Ⓧ',
  Y: 'Ⓨ', Z: 'Ⓩ',
  '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤',
  '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨',
};

const LEET_MAP: Record<string, string> = {
  a: '4', e: '3', i: '1', o: '0', t: '7', s: '5', b: '8', g: '9',
  A: '4', E: '3', I: '1', O: '0', T: '7', S: '5', B: '8', G: '9',
  а: '4', е: '3', и: '1', о: '0', т: '7', с: '5', б: '6',
  А: '4', Е: '3', И: '1', О: '0', Т: '7', С: '5', Б: '6',
};

const ZALGO_UP = ['̍', '̎', '̄', '̅', '̿', '̑', '̆', '̐', '͒', '͗', '͑', '̇', '̈', '̊', '͂', '̓', '̈́', '͊', '͋', '͌'];
const ZALGO_DOWN = ['̖', '̗', '̘', '̙', '̜', '̝', '̞', '̟', '̠', '̤', '̥', '̦', '̩', '̪', '̫', '̬', '̭', '̮', '̯'];

export function toFlip(text: string): string {
  return text
    .split('')
    .reverse()
    .map((c) => FLIP_MAP[c] || c)
    .join('');
}

export function toBubble(text: string): string {
  return text
    .split('')
    .map((c) => BUBBLE_MAP[c] || c)
    .join('');
}

export function toDumb(text: string): string {
  return text
    .split('')
    .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
    .join('');
}

export function toLeet(text: string): string {
  return text
    .split('')
    .map((c) => LEET_MAP[c] || c)
    .join('');
}

export function toZalgo(text: string): string {
  return text
    .split('')
    .map((c) => {
      if (c === ' ') return c;
      const up = ZALGO_UP[Math.floor(Math.random() * ZALGO_UP.length)];
      const down = ZALGO_DOWN[Math.floor(Math.random() * ZALGO_DOWN.length)];
      return c + up + down;
    })
    .join('');
}

export function toNoSpace(text: string): string {
  return text.replace(/\s+/g, '');
}

export function toAsciiArt(text: string): string {
  const t = text.trim() || 'SERKOGRAM';
  return `░█▀▀░█▀▀░█▀▄░█░█░█▀█░█▀▀░█▀▄░█▀█░█▄█
░▀▀█░█▀▀░█▀▄░█▀▄░█░█░█░█░█▀▄░█▀█░█░█
░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀░▀
[ ${t.toUpperCase()} ]`;
}
