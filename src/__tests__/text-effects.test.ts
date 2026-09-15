// ============================================================
// SerkoGram — Text Effects & Transformations Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  toFlip,
  toBubble,
  toDumb,
  toLeet,
  toZalgo,
  toNoSpace,
  toAsciiArt,
} from '@/lib/commands/text-effects';

describe('Text Effects Engine', () => {
  it('toFlip should flip characters in English and Russian', () => {
    const flippedEn = toFlip('hello');
    expect(flippedEn).toBe('ollǝɥ');

    const flippedRu = toFlip('привет');
    expect(flippedRu).toBe('ʇǝвиdu');
  });

  it('toBubble should convert characters into circled Unicode bubbles', () => {
    const bubbled = toBubble('abc');
    expect(bubbled).toBe('ⓐⓑⓒ');
  });

  it('toDumb should alternate lowercase and uppercase', () => {
    const dumb = toDumb('spongetext');
    expect(dumb).toBe('sPoNgEtExT');
  });

  it('toLeet should substitute characters with 1337 numbers', () => {
    const leet = toLeet('elite');
    expect(leet).toBe('3l173');
  });

  it('toZalgo should inject combining characters', () => {
    const zalgo = toZalgo('zalgo');
    expect(zalgo.length).toBeGreaterThan('zalgo'.length);
  });

  it('toNoSpace should remove all whitespaces', () => {
    const noSpace = toNoSpace('  hello   world  test ');
    expect(noSpace).toBe('helloworldtest');
  });

  it('toAsciiArt should wrap text in ASCII banners', () => {
    const art = toAsciiArt('TEST');
    expect(art).toContain('TEST');
    expect(art).toContain('█');
  });
});
