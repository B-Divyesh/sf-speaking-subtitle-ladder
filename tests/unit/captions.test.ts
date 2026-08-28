import { describe, expect, it } from 'vitest';
import { buildLoops, cueTextForLoop, maskWords, parseCaptions } from '../../src/captions';

describe('caption parsing', () => {
  it('parses SRT and strips markup safely', () => {
    const cues = parseCaptions(`1\n00:00:00,500 --> 00:00:08,000\n<b>Guten Morgen!</b>\n\n2\n00:00:08,100 --> 00:00:17,000\nWie geht es dir?`);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ start: 0.5, end: 8, text: 'Guten Morgen!' });
  });

  it('parses WebVTT timestamps without an hour', () => {
    const cues = parseCaptions(`WEBVTT\n\n00:01.000 --> 00:04.500\nمرحبا بالعالم`);
    expect(cues[0].text).toBe('مرحبا بالعالم');
    expect(cues[0].end).toBe(4.5);
  });

  it('rejects files without timed captions', () => {
    expect(() => parseCaptions('just some words')).toThrow(/No timed captions/);
  });
});

describe('loop generation', () => {
  const cues = parseCaptions(`1\n00:00:00,000 --> 00:00:08,000\nOne\n\n2\n00:00:08,000 --> 00:00:17,000\nTwo\n\n3\n00:00:17,000 --> 00:00:33,000\nThree`);

  it('creates caption-aligned loops within the 15–60 second target', () => {
    const loops = buildLoops(cues, 35);
    expect(loops.length).toBeGreaterThan(0);
    expect(loops.every((loop) => loop.end - loop.start >= 15 && loop.end - loop.start <= 60)).toBe(true);
    expect(cueTextForLoop(cues, loops[0])).toContain('One');
  });

  it('requires at least 15 seconds of audio', () => {
    expect(() => buildLoops(cues, 12)).toThrow(/at least 15 seconds/);
  });
});

describe('masking', () => {
  it('masks words across Unicode scripts without removing the rest', () => {
    const result = maskWords('Ich spreche Deutsch heute');
    expect(result).toContain('▰');
    expect(result).toContain('Ich');
  });
});
