import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  imageProcessOptionsSchema,
  processImage,
  probeInputMetadata,
} from './image-processor.js';

async function makeTestPng(width = 200, height = 100): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe('imageProcessOptionsSchema', () => {
  it('coerces multipart string fields', () => {
    const parsed = imageProcessOptionsSchema.parse({
      format: 'webp',
      quality: '75',
      resizeMode: 'percent',
      resizeValue: '50',
      stripMetadata: 'true',
      progressive: 'false',
      rotate: '90',
      flipHorizontal: '1',
      flipVertical: '0',
    });
    expect(parsed.quality).toBe(75);
    expect(parsed.resizeValue).toBe(50);
    expect(parsed.stripMetadata).toBe(true);
    expect(parsed.progressive).toBe(false);
    expect(parsed.rotate).toBe('90');
    expect(parsed.flipHorizontal).toBe(true);
    expect(parsed.flipVertical).toBe(false);
  });

  it('rejects out-of-range quality', () => {
    expect(() => imageProcessOptionsSchema.parse({ format: 'jpeg', quality: '200' })).toThrow();
  });

  it('rejects unknown format', () => {
    expect(() => imageProcessOptionsSchema.parse({ format: 'gif' })).toThrow();
  });
});

describe('probeInputMetadata', () => {
  it('returns metadata for valid image', async () => {
    const buf = await makeTestPng(120, 80);
    const meta = await probeInputMetadata(buf);
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(80);
  });

  it('throws on non-image input', async () => {
    await expect(probeInputMetadata(Buffer.from('not an image'))).rejects.toThrow();
  });
});

describe('processImage', () => {
  it('converts PNG to WebP', async () => {
    const input = await makeTestPng();
    const result = await processImage(input, {
      format: 'webp',
      quality: 80,
      resizeMode: 'none',
      stripMetadata: false,
      progressive: false,
      rotate: '0',
      flipHorizontal: false,
      flipVertical: false,
    });
    expect(result.format).toBe('webp');
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('resizes by percent', async () => {
    const input = await makeTestPng(200, 100);
    const result = await processImage(input, {
      format: 'jpeg',
      quality: 80,
      resizeMode: 'percent',
      resizeValue: 50,
      stripMetadata: false,
      progressive: false,
      rotate: '0',
      flipHorizontal: false,
      flipVertical: false,
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('resizes by maxWidth and keeps aspect ratio', async () => {
    const input = await makeTestPng(800, 400);
    const result = await processImage(input, {
      format: 'webp',
      quality: 80,
      resizeMode: 'maxWidth',
      resizeValue: 200,
      stripMetadata: false,
      progressive: false,
      rotate: '0',
      flipHorizontal: false,
      flipVertical: false,
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('rotates 90 degrees', async () => {
    const input = await makeTestPng(200, 100);
    const result = await processImage(input, {
      format: 'png',
      quality: 80,
      resizeMode: 'none',
      stripMetadata: false,
      progressive: false,
      rotate: '90',
      flipHorizontal: false,
      flipVertical: false,
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it('compresses to target size via binary search', async () => {
    const input = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 80, g: 120, b: 200 },
      },
              })
      .composite([
        {
          input: Buffer.from(
            `<svg width="800" height="600">
              <rect x="0" y="0" width="800" height="600" fill="#5078c8"/>
              <circle cx="400" cy="300" r="200" fill="#fff" opacity="0.6"/>
              <text x="50" y="100" font-size="60" fill="#000">target size test pattern</text>
            </svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const targetBytes = 8 * 1024;
    const result = await processImage(input, {
      format: 'jpeg',
      quality: 80,
      resizeMode: 'none',
      stripMetadata: false,
      progressive: false,
      rotate: '0',
      flipHorizontal: false,
      flipVertical: false,
      targetSizeBytes: targetBytes,
    });

    expect(result.size).toBeLessThanOrEqual(targetBytes);
    expect(result.qualityUsed).toBeGreaterThanOrEqual(1);
    expect(result.qualityUsed).toBeLessThanOrEqual(100);
  });

  it('rejects target size for PNG output', async () => {
    const input = await makeTestPng();
    await expect(
      processImage(input, {
        format: 'png',
        quality: 80,
        resizeMode: 'none',
        stripMetadata: false,
        progressive: false,
        rotate: '0',
        flipHorizontal: false,
        flipVertical: false,
        targetSizeBytes: 10000,
      }),
    ).rejects.toThrow('TARGET_SIZE_UNSUPPORTED_FORMAT');
  });
});
