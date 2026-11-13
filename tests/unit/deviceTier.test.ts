import { describe, expect, it } from 'vitest';
import { QUALITY_PRESETS, resolvePreset } from '../../src/app/quality';
import { detectTier } from '../../src/core/deviceTier';

describe('detectTier', () => {
  it('rates a recent iPhone as high', () => {
    expect(detectTier({ renderer: 'Apple GPU', cores: 6, isMobile: true })).toBe('high');
  });

  it('rates a Pixel 6 (Mali-G78) as high', () => {
    expect(detectTier({ renderer: 'Mali-G78', deviceMemory: 8, cores: 8, isMobile: true })).toBe(
      'high',
    );
  });

  it('drops a strong mobile GPU with little RAM to medium', () => {
    expect(
      detectTier({ renderer: 'Adreno (TM) 730', deviceMemory: 3, cores: 8, isMobile: true }),
    ).toBe('medium');
  });

  it('rates weak Android GPUs and low memory as low', () => {
    expect(detectTier({ renderer: 'Mali-G52', deviceMemory: 4, isMobile: true })).toBe('low');
    expect(detectTier({ renderer: 'Adreno (TM) 506', isMobile: true })).toBe('low');
    expect(detectTier({ renderer: 'Mali-G78', deviceMemory: 2, isMobile: true })).toBe('low');
  });

  it('rates software rendering as low', () => {
    expect(
      detectTier({
        renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))',
        isMobile: false,
      }),
    ).toBe('low');
  });

  it('falls back to medium for unknown hardware', () => {
    expect(detectTier({ renderer: '', isMobile: false })).toBe('medium');
    expect(detectTier({ renderer: 'Some Future GPU', cores: 8, isMobile: true })).toBe('medium');
  });
});

describe('resolvePreset', () => {
  it('uses the detected tier on auto and the explicit tier otherwise', () => {
    expect(resolvePreset('auto', 'low')).toBe(QUALITY_PRESETS.low);
    expect(resolvePreset('high', 'low')).toBe(QUALITY_PRESETS.high);
  });

  it('keeps post-processing and shadows off the low tier', () => {
    expect(QUALITY_PRESETS.low).toMatchObject({ dprCap: 1, bloom: false, shadows: false });
  });
});
