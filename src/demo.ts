import type { Project } from './types';

const sampleTarget = [
  { id: 'sample-1', start: 0, end: 7, text: 'Heute nehme ich mir zehn Minuten Zeit, um zuzuhören.' },
  { id: 'sample-2', start: 7, end: 14, text: 'Ich höre erst den Sinn und dann die einzelnen Wörter.' },
  { id: 'sample-3', start: 14, end: 20, text: 'Danach spreche ich den Gedanken mit eigenen Worten nach.' }
];
const sampleTranslation = [
  { id: 'sample-en-1', start: 0, end: 7, text: 'Today I take ten minutes to listen.' },
  { id: 'sample-en-2', start: 7, end: 14, text: 'First I hear the meaning, then the individual words.' },
  { id: 'sample-en-3', start: 14, end: 20, text: 'Then I say the thought back in my own words.' }
];

function sampleWav(): Blob {
  const sampleRate = 8_000;
  const seconds = 20;
  const bytes = new ArrayBuffer(44 + sampleRate * seconds * 2);
  const view = new DataView(bytes);
  const write = (offset: number, value: string) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + sampleRate * seconds * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, sampleRate * seconds * 2, true);
  for (let i = 0; i < sampleRate * seconds; i += 1) {
    const time = i / sampleRate;
    const phrase = Math.floor(time / 2) % 2 === 0;
    const sample = phrase ? Math.sin(time * Math.PI * 2 * (180 + (time % 2) * 55)) * 0.11 : 0;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export function makeDemoProject(): Project {
  const now = new Date().toISOString();
  return {
    id: 'demo:morning-listening', title: 'German morning reset', createdAt: now, updatedAt: now,
    mediaName: 'german-morning-reset.wav', mediaType: 'audio/wav', mediaBlob: sampleWav(), duration: 20,
    targetLanguage: 'de', textDirection: 'auto', targetCues: sampleTarget, translationCues: sampleTranslation,
    loops: [{ id: 'demo:loop-1', start: 0, end: 20, cueIds: sampleTarget.map((cue) => cue.id) }], progress: {}
  };
}
