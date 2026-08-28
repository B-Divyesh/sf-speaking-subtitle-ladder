import type { Cue, PracticeLoop } from './types';

function parseTimestamp(value: string): number {
  const clean = value.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) return NaN;
  const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseCaptions(source: string): Cue[] {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
  if (!normalized) throw new Error('This caption file is empty.');
  const blocks = normalized.replace(/^WEBVTT[^\n]*\n+/, '').split(/\n{2,}/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trimEnd());
    if (!lines.length || /^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex].match(/((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})/);
    if (!timing) continue;
    const start = parseTimestamp(timing[1]);
    const end = parseTimestamp(timing[2]);
    const text = lines.slice(timingIndex + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) continue;
    cues.push({ id: `cue-${cues.length + 1}`, start, end, text });
  }

  if (!cues.length) throw new Error('No timed captions were found. Use a UTF-8 SRT or WebVTT file.');
  return cues.sort((a, b) => a.start - b.start);
}

export function buildLoops(cues: Cue[], duration: number): PracticeLoop[] {
  if (duration < 15) throw new Error('Choose audio that is at least 15 seconds long.');
  const loops: PracticeLoop[] = [];
  let current: Cue[] = [];
  let loopStart = 0;

  const finish = () => {
    if (!current.length) return;
    let start = Math.max(0, loopStart);
    let end = Math.min(duration, current[current.length - 1].end + 0.75);
    if (end - start < 15) {
      end = Math.min(duration, start + 15);
      start = Math.max(0, end - 15);
    }
    loops.push({ id: `loop-${loops.length + 1}`, start, end, cueIds: current.map((cue) => cue.id) });
    current = [];
  };

  for (const cue of cues.filter((item) => item.start < duration)) {
    if (!current.length) loopStart = Math.max(0, cue.start - 0.75);
    const proposedEnd = Math.min(duration, cue.end + 0.75);
    if (current.length && proposedEnd - loopStart > 60) {
      finish();
      loopStart = Math.max(0, cue.start - 0.75);
    }
    current.push(cue);
    if (proposedEnd - loopStart >= 15) finish();
  }
  finish();

  if (loops.length > 1) {
    const last = loops[loops.length - 1];
    const previous = loops[loops.length - 2];
    if (last.end - last.start < 15 && last.end - previous.start <= 60) {
      previous.end = last.end;
      previous.cueIds.push(...last.cueIds);
      loops.pop();
    }
  }
  return loops;
}

export function cueTextForLoop(cues: Cue[], loop: PracticeLoop): string {
  const ids = new Set(loop.cueIds);
  return cues.filter((cue) => ids.has(cue.id)).map((cue) => cue.text).join('\n');
}

export function translationForLoop(cues: Cue[], loop: PracticeLoop): string {
  return cues.filter((cue) => cue.start < loop.end && cue.end > loop.start).map((cue) => cue.text).join('\n');
}

export function maskWords(text: string): string {
  let index = 0;
  return text.replace(/[\p{L}\p{N}]+/gu, (word) => {
    index += 1;
    return index % 3 === 0 || (index + word.length) % 5 === 0 ? '▰'.repeat(Math.min(8, [...word].length)) : word;
  });
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
