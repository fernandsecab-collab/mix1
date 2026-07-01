import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';

type Clip = {
  id: string;
  trackId: string;
  name: string;
  url: string;
  duration: number;
  timelineStart: number;
  start: number;
  end: number;
  volume: number;
  pan: number;
  pitch: number;
  fadeIn: number;
  fadeOut: number;
  reversed: boolean;
  normalized: boolean;
  waveform: number[];
};

type SavedClip = Omit<Clip, 'url' | 'waveform'> & { hasAudioFile: false };
type TrackState = { id: string; name: string; volume: number; pan: number; mute: boolean; solo: boolean };

type PreservedAudio = HTMLAudioElement & {
  preservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

const styles = ['Kompa Gouyad','Kompa Vintage','Afro House','Amapiano','Dancehall','Shatta','Zouk','Bouyon','Trap Soul','Deep House','Techno','Reggaeton','Sega Réunion','Maloya','Hip Hop','Rock'];

type StyleRecipe = { bpm: number; drum: string; bass: string; melody: string; groove: string };
const styleRecipes: Record<string, StyleRecipe> = {
  'Kompa Gouyad': { bpm: 92, drum: 'kick doux + rimshot syncopé', bass: 'basse ronde gouyad', melody: 'piano chaud + guitare palm mute', groove: 'lent, collé, balancement 3-3-2' },
  'Kompa Vintage': { bpm: 88, drum: 'kick organique + caisse claire sèche', bass: 'basse live', melody: 'guitare claire + orgue', groove: 'kompa classique stable' },
  'Afro House': { bpm: 124, drum: 'kick 4x4 + percussions afro', bass: 'sub répétitif', melody: 'lead court + nappes', groove: 'club, montant' },
  'Amapiano': { bpm: 112, drum: 'kick léger + shaker', bass: 'log drum', melody: 'keys et plucks', groove: 'swing sud-africain' },
  'Dancehall': { bpm: 100, drum: 'dembow léger', bass: '808 courte', melody: 'pluck tropical', groove: 'bounce dancehall' },
  'Shatta': { bpm: 102, drum: 'kick sec + snare agressive', bass: 'sub lourd', melody: 'lead minimal', groove: 'martelé' },
  'Zouk': { bpm: 86, drum: 'groove zouk doux', bass: 'basse ronde', melody: 'piano électrique', groove: 'romantique' },
  'Bouyon': { bpm: 140, drum: 'kick rapide + perc', bass: 'basse énergique', melody: 'synth court', groove: 'carnaval' },
  'Trap Soul': { bpm: 72, drum: '808 + clap', bass: 'sub longue', melody: 'piano sombre', groove: 'half-time' },
  'Deep House': { bpm: 122, drum: 'kick rond 4x4', bass: 'bassline profonde', melody: 'pad + chord', groove: 'smooth club' },
  'Techno': { bpm: 132, drum: 'kick dur', bass: 'rumble', melody: 'stab', groove: 'industriel' },
  'Reggaeton': { bpm: 96, drum: 'dembow', bass: 'sub simple', melody: 'guitare/pluck latin', groove: 'latino' },
  'Sega Réunion': { bpm: 118, drum: 'roulèr + kayamb simulés', bass: 'basse sautée', melody: 'accordéon/guitare', groove: 'séga entraînant' },
  'Maloya': { bpm: 104, drum: 'kayamb + roulèr', bass: 'bourdon grave', melody: 'chant/réponse', groove: 'ternaire réunionnais' },
  'Hip Hop': { bpm: 90, drum: 'boom bap', bass: 'sub propre', melody: 'sample chop', groove: 'laid back' },
  'Rock': { bpm: 128, drum: 'kick/snare live', bass: 'basse médiator', melody: 'guitare power', groove: 'énergique' }
};
const initialTracks: TrackState[] = [
  { id: 'voix', name: 'VOIX', volume: 0.74, pan: 0, mute: false, solo: false },
  { id: 'drums', name: 'DRUMS', volume: 0.78, pan: 0, mute: false, solo: false },
  { id: 'basse', name: 'BASSE', volume: 0.8, pan: 0, mute: false, solo: false },
  { id: 'piano', name: 'PIANO', volume: 0.68, pan: 0, mute: false, solo: false },
  { id: 'guitare', name: 'GUITARE', volume: 0.68, pan: 0, mute: false, solo: false },
  { id: 'synth', name: 'SYNTHÉ', volume: 0.65, pan: 0, mute: false, solo: false },
  { id: 'fx', name: 'FX', volume: 0.62, pan: 0, mute: false, solo: false },
  { id: 'kick', name: 'KICK', volume: 0.9, pan: 0, mute: false, solo: false },
  { id: 'snare', name: 'SNARE', volume: 0.82, pan: 0, mute: false, solo: false }
];
const instrumentLibrarySeed: InstrumentDefinition[] = [
  { id: 'piano-grand', name: 'Piano Grand', category: 'Claviers', tags: ['piano','accords','pop'], key: 'C', engine: 'synth', tone: 'sine', baseFreq: 523, color: 'violet', favorite: true },
  { id: 'rhodes', name: 'Rhodes chaud', category: 'Claviers', tags: ['rhodes','zouk','kompa'], key: 'Fm', engine: 'synth', tone: 'triangle', baseFreq: 466, color: 'rose', favorite: true },
  { id: 'orgue-kompa', name: 'Orgue Kompa', category: 'Claviers', tags: ['orgue','kompa','vintage'], bpm: 92, key: 'Gm', engine: 'synth', tone: 'square', baseFreq: 392, color: 'orange', favorite: false },
  { id: 'basse-ronde', name: 'Basse ronde', category: 'Cordes', tags: ['basse','gouyad','zouk'], bpm: 92, key: 'Dm', engine: 'synth', tone: 'sawtooth', baseFreq: 110, color: 'blue', favorite: true },
  { id: 'guitare-palm', name: 'Guitare palm mute', category: 'Cordes', tags: ['guitare','kompa','rythme'], bpm: 92, key: 'Am', engine: 'synth', tone: 'triangle', baseFreq: 220, color: 'violet', favorite: false },
  { id: 'strings-soft', name: 'Strings doux', category: 'Cordes', tags: ['cordes','nappe','émotion'], key: 'C', engine: 'synth', tone: 'sine', baseFreq: 330, color: 'rose', favorite: false },
  { id: 'pad-air', name: 'Pad aérien', category: 'Synthés', tags: ['pad','intro','ambiant'], key: 'Em', engine: 'synth', tone: 'sine', baseFreq: 440, color: 'blue', favorite: true },
  { id: 'lead-tropical', name: 'Lead tropical', category: 'Synthés', tags: ['lead','dancehall','afro'], bpm: 100, key: 'Bm', engine: 'synth', tone: 'sawtooth', baseFreq: 660, color: 'orange', favorite: false },
  { id: 'kit-kompa', name: 'Kit Batterie Kompa', category: 'Batteries', tags: ['kick','snare','rimshot','kompa'], bpm: 92, engine: 'kit', tone: 'sine', baseFreq: 80, color: 'violet', favorite: true },
  { id: 'kit-gouyad', name: 'Kit Gouyad', category: 'Batteries', tags: ['gouyad','lent','rimshot'], bpm: 88, engine: 'kit', tone: 'sine', baseFreq: 72, color: 'rose', favorite: true },
  { id: 'kit-afro', name: 'Kit Afro House', category: 'Batteries', tags: ['afro','house','club'], bpm: 124, engine: 'kit', tone: 'square', baseFreq: 95, color: 'orange', favorite: false },
  { id: 'kit-amapiano', name: 'Kit Amapiano Log', category: 'Batteries', tags: ['amapiano','log drum','swing'], bpm: 112, engine: 'kit', tone: 'sawtooth', baseFreq: 64, color: 'blue', favorite: false },
  { id: 'kayamb', name: 'Kayamb', category: 'Réunion', tags: ['maloya','réunion','percu'], bpm: 104, engine: 'kit', tone: 'square', baseFreq: 2200, color: 'orange', favorite: true },
  { id: 'rouler', name: 'Roulèr', category: 'Réunion', tags: ['maloya','tambour','réunion'], bpm: 104, engine: 'kit', tone: 'sine', baseFreq: 130, color: 'rose', favorite: true },
  { id: 'sega-kit', name: 'Kit Séga Réunion', category: 'Réunion', tags: ['séga','kayamb','roulèr'], bpm: 118, engine: 'kit', tone: 'triangle', baseFreq: 180, color: 'violet', favorite: false },
  { id: 'bouyon-kit', name: 'Kit Bouyon', category: 'Batteries', tags: ['bouyon','rapide','carnaval'], bpm: 140, engine: 'kit', tone: 'square', baseFreq: 100, color: 'blue', favorite: false },
  { id: 'djembe', name: 'Djembé', category: 'Monde', tags: ['percu','afrique','groove'], bpm: 110, engine: 'kit', tone: 'sine', baseFreq: 150, color: 'orange', favorite: false },
  { id: 'kalimba', name: 'Kalimba', category: 'Monde', tags: ['pluck','mélodie','soft'], key: 'C', engine: 'synth', tone: 'triangle', baseFreq: 740, color: 'rose', favorite: false }
];
const instruments = instrumentLibrarySeed.map(item => item.name);
const instrumentCategories: Array<'Tous' | 'Favoris' | InstrumentCategory> = ['Tous','Favoris','Claviers','Cordes','Synthés','Batteries','Réunion','Monde'];
const sampleTags = ['Kompa','Grosse caisse','Club','Gouyad','Afro','Amapiano','Percu','FX','Voix','Basse'];

type SequenceRowName = 'Kick' | 'Caisse claire' | 'Clap' | 'Charley' | 'Basse' | 'Percu';
type AudioSelection = { start: number; end: number };
type BeatDivision = '1/1' | '1/2' | '1/4' | '1/8';
type ArrangementMarker = { id: string; label: string; time: number; type: 'cue' | 'intro' | 'drop' | 'break' | 'outro' };
type PianoInstrument = 'Piano' | 'Piano électrique' | 'Basse' | 'Guitare' | 'Pad' | 'Lead' | 'Kompa Kit' | 'Afro Kit' | 'Orgue' | 'Rhodes' | 'Strings' | 'Brass' | 'Maloya Kit' | 'Sega Kit' | 'Bouyon Kit';
type InstrumentCategory = 'Claviers' | 'Cordes' | 'Synthés' | 'Batteries' | 'Réunion' | 'Monde';
type InstrumentDefinition = { id: string; name: string; category: InstrumentCategory; tags: string[]; bpm?: number; key?: string; engine: 'synth' | 'kit'; tone: OscillatorType; baseFreq: number; color: string; favorite: boolean };
type MidiNote = { id: string; pitch: number; start: number; duration: number; velocity: number; selected: boolean };
type SamplerPad = { id: string; label: string; color: string; url?: string; fileName?: string; volume: number; pitch: number; attack: number; release: number; reverse: boolean; waveform: number[] };
type QuantizeValue = '1/4' | '1/8' | '1/16' | '1/32';
type SequenceGrid = Record<SequenceRowName, boolean[]>;
const sequenceRows: SequenceRowName[] = ['Kick','Caisse claire','Clap','Charley','Basse','Percu'];
const defaultSamplerPads: SamplerPad[] = ['KICK','SNARE','CLAP','HIHAT','BASS','PIANO','GUITARE','SYNTH','IMPACT','RISER','REVERB','CRASH'].map((label, index) => ({
  id: crypto.randomUUID(),
  label,
  color: ['violet','rose','orange','blue'][index % 4],
  volume: label === 'KICK' ? 1 : 0.82,
  pitch: 0,
  attack: 0.01,
  release: 0.22,
  reverse: false,
  waveform: Array.from({ length: 20 }, (_, i) => 0.25 + Math.abs(Math.sin((i + index) * 0.55)) * 0.7)
}));

const defaultSequence: SequenceGrid = {
  Kick: [true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false],
  'Caisse claire': [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],
  Clap: [false,false,false,false,false,false,false,false,false,false,false,false,true,false,false,false],
  Charley: [true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false],
  Basse: [true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false],
  Percu: [false,false,true,false,false,true,false,false,false,false,true,false,false,true,false,false]
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00.0';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const sample = clamp(input[i], -1, 1);
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: 'audio/wav' });
}

async function decodeClip(clip: Pick<Clip, 'url'>): Promise<AudioBuffer> {
  const arrayBuffer = await fetch(clip.url).then(r => r.arrayBuffer());
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close();
  return audioBuffer;
}

async function renderClipToWav(clip: Clip, gain = 1): Promise<Blob> {
  const audioBuffer = await decodeClip(clip);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(clip.start * sampleRate);
  const endSample = Math.floor(clip.end * sampleRate);
  const length = Math.max(1, endSample - startSample);
  const output = new Float32Array(length);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) output[i] += (input[startSample + i] ?? 0) / audioBuffer.numberOfChannels;
  }
  if (clip.reversed) output.reverse();
  if (clip.normalized) {
    let peak = 0;
    for (const sample of output) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0) for (let i = 0; i < output.length; i++) output[i] = output[i] / peak * 0.92;
  }
  const fadeInSamples = Math.floor(clip.fadeIn * sampleRate);
  const fadeOutSamples = Math.floor(clip.fadeOut * sampleRate);
  for (let i = 0; i < Math.min(fadeInSamples, output.length); i++) output[i] *= i / Math.max(1, fadeInSamples);
  for (let i = 0; i < Math.min(fadeOutSamples, output.length); i++) {
    const index = output.length - 1 - i;
    output[index] *= i / Math.max(1, fadeOutSamples);
  }
  for (let i = 0; i < output.length; i++) output[i] *= clip.volume * gain;
  return encodeWav(output, sampleRate);
}


async function renderProjectMixToWav(clips: Clip[], tracks: TrackState[], masterVolume: number): Promise<Blob> {
  if (!clips.length) throw new Error('No clips');
  const buffers = await Promise.all(clips.map(async clip => ({ clip, buffer: await decodeClip(clip) })));
  const sampleRate = buffers[0]?.buffer.sampleRate || 44100;
  const totalDuration = Math.max(...clips.map(c => (c.timelineStart ?? 0) + Math.max(0, c.end - c.start)), 1);
  const output = new Float32Array(Math.ceil(totalDuration * sampleRate));
  const solo = tracks.some(t => t.solo);
  for (const { clip, buffer } of buffers) {
    const track = tracks.find(t => t.id === clip.trackId);
    if (!track || track.mute || (solo && !track.solo)) continue;
    const startSample = Math.floor(clip.start * buffer.sampleRate);
    const endSample = Math.floor(clip.end * buffer.sampleRate);
    const length = Math.max(1, endSample - startSample);
    const temp = new Float32Array(length);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const input = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) temp[i] += (input[startSample + i] ?? 0) / buffer.numberOfChannels;
    }
    if (clip.reversed) temp.reverse();
    if (clip.normalized) {
      let peak = 0;
      for (const sample of temp) peak = Math.max(peak, Math.abs(sample));
      if (peak > 0) for (let i = 0; i < temp.length; i++) temp[i] = temp[i] / peak * 0.92;
    }
    const fadeInSamples = Math.floor(clip.fadeIn * sampleRate);
    const fadeOutSamples = Math.floor(clip.fadeOut * sampleRate);
    for (let i = 0; i < Math.min(fadeInSamples, temp.length); i++) temp[i] *= i / Math.max(1, fadeInSamples);
    for (let i = 0; i < Math.min(fadeOutSamples, temp.length); i++) temp[temp.length - 1 - i] *= i / Math.max(1, fadeOutSamples);
    const gain = clip.volume * track.volume * masterVolume;
    const destinationStart = Math.max(0, Math.floor((clip.timelineStart ?? 0) * sampleRate));
    for (let i = 0; i < temp.length && destinationStart + i < output.length; i++) output[destinationStart + i] += temp[i] * gain;
  }
  let peak = 0;
  for (const sample of output) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.98) for (let i = 0; i < output.length; i++) output[i] = output[i] / peak * 0.98;
  return encodeWav(output, sampleRate);
}

function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}

async function makeWaveform(url: string, bars = 116): Promise<number[]> {
  try {
    const buffer = await decodeClip({ url });
    const data = buffer.getChannelData(0);
    const block = Math.max(1, Math.floor(data.length / bars));
    return Array.from({ length: bars }, (_, i) => {
      let peak = 0;
      for (let j = 0; j < block; j++) peak = Math.max(peak, Math.abs(data[i * block + j] ?? 0));
      return Math.max(0.04, peak);
    });
  } catch {
    return Array.from({ length: bars }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.39)) * 0.75);
  }
}


function estimateBpmFromBuffer(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const hop = 1024;
  const envelope: number[] = [];
  for (let i = 0; i < data.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < hop && i + j < data.length; j++) sum += Math.abs(data[i + j]);
    envelope.push(sum / hop);
  }
  const diffs = envelope.slice(1).map((value, i) => Math.max(0, value - envelope[i]));
  const minBpm = 60;
  const maxBpm = 180;
  let bestBpm = 92;
  let bestScore = -Infinity;
  for (let bpmCandidate = minBpm; bpmCandidate <= maxBpm; bpmCandidate += 0.5) {
    const lag = Math.round((60 / bpmCandidate) * sampleRate / hop);
    if (lag < 2 || lag >= diffs.length) continue;
    let score = 0;
    for (let i = lag; i < diffs.length; i++) score += diffs[i] * diffs[i - lag];
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpmCandidate;
    }
  }
  while (bestBpm < 82) bestBpm *= 2;
  while (bestBpm > 160) bestBpm /= 2;
  return Number(bestBpm.toFixed(2));
}


function estimateKeyFromBuffer(buffer: AudioBuffer): { key: string; confidence: number } {
  const noteNames = ['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = 4096;
  const hop = 4096;
  const scores = new Array(12).fill(0) as number[];
  const maxSamples = Math.min(data.length, sampleRate * 150);
  for (let start = 0; start + windowSize < maxSamples; start += hop) {
    let crossings = 0;
    let energy = 0;
    let previous = data[start];
    for (let i = 1; i < windowSize; i++) {
      const value = data[start + i];
      energy += Math.abs(value);
      if ((previous <= 0 && value > 0) || (previous >= 0 && value < 0)) crossings++;
      previous = value;
    }
    const frequency = (crossings * sampleRate) / (2 * windowSize);
    if (frequency >= 55 && frequency <= 1800 && energy > 0.01) {
      const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
      const note = ((midi % 12) + 12) % 12;
      scores[note] += energy;
    }
  }
  const total = scores.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { key: 'Non détectée', confidence: 0 };
  const bestIndex = scores.indexOf(Math.max(...scores));
  const confidence = scores[bestIndex] / total;
  return { key: `${noteNames[bestIndex]} mineur/majeur probable`, confidence: Number((confidence * 100).toFixed(1)) };
}

function detectTransientMarkers(buffer: AudioBuffer, duration: number): ArrangementMarker[] {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const hop = 2048;
  const envelope: number[] = [];
  for (let i = 0; i < data.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < hop && i + j < data.length; j++) sum += Math.abs(data[i + j]);
    envelope.push(sum / hop);
  }
  const average = envelope.reduce((sum, value) => sum + value, 0) / Math.max(1, envelope.length);
  const markers: ArrangementMarker[] = [{ id: crypto.randomUUID(), label: 'INTRO', time: 0, type: 'intro' }];
  let lastTime = 0;
  for (let i = 2; i < envelope.length - 2 && markers.length < 10; i++) {
    const isPeak = envelope[i] > average * 2.2 && envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1];
    const time = (i * hop) / sampleRate;
    if (isPeak && time - lastTime > 8 && time > 4 && time < duration - 3) {
      const label = markers.length % 3 === 1 ? 'DROP' : markers.length % 3 === 2 ? 'BREAK' : 'CUE';
      markers.push({ id: crypto.randomUUID(), label, time, type: label === 'DROP' ? 'drop' : label === 'BREAK' ? 'break' : 'cue' });
      lastTime = time;
    }
  }
  markers.push({ id: crypto.randomUUID(), label: 'OUTRO', time: Math.max(0, duration - 4), type: 'outro' });
  return markers.sort((a, b) => a.time - b.time);
}

function beatDivisionFactor(division: BeatDivision): number {
  if (division === '1/1') return 1;
  if (division === '1/2') return 2;
  if (division === '1/4') return 4;
  return 8;
}

function makeRemixNotes(style: string, sourceBpm: number): string {
  const recipe = styleRecipes[style] ?? styleRecipes['Kompa Gouyad'];
  const ratio = recipe.bpm / Math.max(1, sourceBpm);
  return `${style} prêt · BPM cible ${recipe.bpm} · vitesse x${ratio.toFixed(2)} · ${recipe.drum} · ${recipe.bass} · ${recipe.melody}`;
}

function App() {
  const audioRef = useRef<PreservedAudio | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<TrackState[]>(initialTracks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState('voix');
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [dropActive, setDropActive] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.82);
  const [masterTempo, setMasterTempo] = useState(true);
  const [bpm, setBpm] = useState(92);
  const [targetBpm, setTargetBpm] = useState(128);
  const [detectedKey, setDetectedKey] = useState('Non détectée');
  const [keyConfidence, setKeyConfidence] = useState(0);
  const [beatGridOffset, setBeatGridOffset] = useState(0);
  const [beatDivision, setBeatDivision] = useState<BeatDivision>('1/4');
  const [beatGridLocked, setBeatGridLocked] = useState(true);
  const [arrangementMarkers, setArrangementMarkers] = useState<ArrangementMarker[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('Kompa Gouyad');
  const [analysisText, setAnalysisText] = useState('Analyse BPM/tonalité disponible après import.');
  const [sampleQuery, setSampleQuery] = useState('');
  const [metronome, setMetronome] = useState(false);
  const [sequence, setSequence] = useState<SequenceGrid>(defaultSequence);
  const [sequencerPlaying, setSequencerPlaying] = useState(false);
  const [sequencerStep, setSequencerStep] = useState(0);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [delayMix, setDelayMix] = useState(0);
  const [compressorOn, setCompressorOn] = useState(false);
  const [snap, setSnap] = useState(true);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [status, setStatus] = useState("V38 saine : banque d’instruments visible, filtrable, préécoutable et reliée au Piano Roll/Sampler.");
  const [timelineZoom, setTimelineZoom] = useState(8);
  const [dragClip, setDragClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [midiNotes, setMidiNotes] = useState<MidiNote[]>([
    { id: crypto.randomUUID(), pitch: 60, start: 0, duration: 1, velocity: 92, selected: true },
    { id: crypto.randomUUID(), pitch: 64, start: 1, duration: 1, velocity: 82, selected: false },
    { id: crypto.randomUUID(), pitch: 67, start: 2, duration: 1.5, velocity: 88, selected: false },
    { id: crypto.randomUUID(), pitch: 72, start: 3.5, duration: 0.5, velocity: 76, selected: false }
  ]);
  const [selectedMidiId, setSelectedMidiId] = useState<string | null>(null);
  const [pianoInstrument, setPianoInstrument] = useState<PianoInstrument>('Piano');
  const [quantizeValue, setQuantizeValue] = useState<QuantizeValue>('1/16');
  const [pianoPlaying, setPianoPlaying] = useState(false);
  const [pianoCursor, setPianoCursor] = useState(0);
  const [samplerPads, setSamplerPads] = useState<SamplerPad[]>(defaultSamplerPads);
  const [selectedPadId, setSelectedPadId] = useState<string>(defaultSamplerPads[0].id);
  const [instrumentLibrary, setInstrumentLibrary] = useState<InstrumentDefinition[]>(instrumentLibrarySeed);
  const [instrumentCategory, setInstrumentCategory] = useState<'Tous' | 'Favoris' | InstrumentCategory>('Tous');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('piano-grand');
  const padFileInputRef = useRef<HTMLInputElement | null>(null);
  const pianoRollRef = useRef<HTMLDivElement | null>(null);
  const [waveformZoom, setWaveformZoom] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [selection, setSelection] = useState<AudioSelection | null>(null);
  const [draggingSelection, setDraggingSelection] = useState(false);
  const [clipboardClip, setClipboardClip] = useState<Clip | null>(null);
  const [projectPosition, setProjectPosition] = useState(0);
  const projectAudioContextRef = useRef<AudioContext | null>(null);
  const projectSourcesRef = useRef<Array<{ source: AudioBufferSourceNode; gain: GainNode; panner: StereoPannerNode }>>([]);
  const projectStartAtRef = useRef(0);
  const projectStartPositionRef = useRef(0);
  const projectRestartingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const graphForAudioRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<{ low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode; compressor: DynamicsCompressorNode; delay: DelayNode; delayGain: GainNode; dryGain: GainNode; master: GainNode; panner: StereoPannerNode } | null>(null);

  const selectedClip = useMemo(() => clips.find(c => c.id === selectedId) ?? clips[0], [clips, selectedId]);
  const selectedTrack = useMemo(() => tracks.find(t => t.id === (selectedClip?.trackId ?? selectedTrackId)) ?? tracks[0], [tracks, selectedClip, selectedTrackId]);
  const selectedLength = selectedClip ? Math.max(0, selectedClip.end - selectedClip.start) : 0;
  const soloActive = tracks.some(t => t.solo);
  const tempoRatio = masterTempo ? clamp(targetBpm / Math.max(1, bpm), 0.5, 2) : 1;
  const filteredInstruments = instruments.filter(i => i.toLowerCase().includes(sampleQuery.toLowerCase()) || sampleTags.some(t => t.toLowerCase().includes(sampleQuery.toLowerCase())));
  const filteredInstrumentLibrary = instrumentLibrary.filter(instrument => {
    const query = sampleQuery.trim().toLowerCase();
    const matchQuery = !query || instrument.name.toLowerCase().includes(query) || instrument.tags.some(tag => tag.toLowerCase().includes(query));
    const matchCategory = instrumentCategory === 'Tous' || (instrumentCategory === 'Favoris' ? instrument.favorite : instrument.category === instrumentCategory);
    return matchQuery && matchCategory;
  });
  const selectedInstrument = instrumentLibrary.find(item => item.id === selectedInstrumentId) ?? instrumentLibrary[0];
  const beatInterval = (60 / Math.max(1, bpm)) / beatDivisionFactor(beatDivision);
  const beatMarkers = selectedClip ? Array.from({ length: Math.min(256, Math.ceil(Math.max(0, selectedLength - beatGridOffset) / beatInterval)) }, (_, i) => ((beatGridOffset + i * beatInterval) / Math.max(1, selectedLength)) * 100).filter(left => left >= 0 && left <= 100) : [];
  const visibleArrangementMarkers = selectedClip ? arrangementMarkers.filter(marker => marker.time >= 0 && marker.time <= selectedLength) : [];
  const normalizedSelection = selection ? { start: Math.min(selection.start, selection.end), end: Math.max(selection.start, selection.end) } : null;
  const visibleLoopEnd = loopEnd > loopStart ? loopEnd : selectedLength;
  const loopStartPercent = selectedLength ? (loopStart / selectedLength) * 100 : 0;
  const loopEndPercent = selectedLength ? (visibleLoopEnd / selectedLength) * 100 : 100;
  const selectionLeftPercent = normalizedSelection && selectedLength ? (normalizedSelection.start / selectedLength) * 100 : 0;
  const selectionWidthPercent = normalizedSelection && selectedLength ? ((normalizedSelection.end - normalizedSelection.start) / selectedLength) * 100 : 0;
  const timelineStep = snap ? Math.max(0.125, (60 / Math.max(1, bpm)) / beatDivisionFactor(beatDivision)) : 0.1;
  const timelineDuration = Math.max(30, ...clips.map(c => (c.timelineStart ?? 0) + Math.max(0, c.end - c.start) + 4));
  const selectedClipTimelineStart = selectedClip?.timelineStart ?? 0;
  const selectedClipTimelineEnd = selectedClip ? selectedClipTimelineStart + selectedLength : 0;
  const projectLoopStart = selectedClip ? selectedClipTimelineStart + loopStart : 0;
  const projectLoopEnd = selectedClip ? selectedClipTimelineStart + visibleLoopEnd : timelineDuration;

  function pushHistory(next?: Clip[]) {
    setHistory(prev => [...prev.slice(-32), next ?? clips]);
  }

  function updateClip(id: string, patch: Partial<Clip>) {
    pushHistory();
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  function updateTrack(id: string, patch: Partial<TrackState>) {
    setTracks(prev => prev.map(track => track.id === id ? { ...track, ...patch } : track));
  }

  function effectiveTrackGain(trackId: string): number {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return 1;
    if (track.mute) return 0;
    if (soloActive && !track.solo) return 0;
    return track.volume;
  }

  async function loadFile(file: File, trackId = selectedTrackId): Promise<void> {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const duration = await new Promise<number>((resolve, reject) => {
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.onerror = () => reject(new Error(`Fichier illisible : ${file.name}`));
      audio.src = url;
    });
    if (!duration || duration <= 0) {
      URL.revokeObjectURL(url);
      throw new Error(`Durée impossible à lire : ${file.name}`);
    }
    const waveform = await makeWaveform(url);
    const clip: Clip = {
      id: crypto.randomUUID(),
      trackId,
      name: file.name,
      url,
      duration,
      timelineStart: clips.length * 2,
      start: 0,
      end: duration,
      volume: 1,
      pan: 0,
      pitch: 0,
      fadeIn: 0,
      fadeOut: 0,
      reversed: false,
      normalized: false,
      waveform
    };
    setClips(prev => [...prev, clip]);
    setSelectedId(clip.id);
    setSelectedTrackId(trackId);
    setStatus(`Importé sur ${tracks.find(t => t.id === trackId)?.name ?? trackId} : ${file.name} · ${formatTime(duration)}`);
  }

  function loadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a|aiff|aif)$/i.test(f.name));
    if (!files.length) return setStatus('Aucun fichier audio reconnu. Formats acceptés : MP3, WAV, FLAC, OGG, M4A, AIFF.');
    setStatus(`Import de ${files.length} fichier(s) audio en cours...`);
    files.reduce((chain, file) => chain.then(() => loadFile(file)).catch(error => {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Erreur pendant l’import audio.');
    }), Promise.resolve()).then(() => setStatus(`${files.length} fichier(s) audio ajouté(s) à la playlist.`));
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDropActive(false);
    loadFiles(event.dataTransfer.files);
  }

  function applyTonalitéPreservation(audio: PreservedAudio) {
    audio.preservesPitch = masterTempo;
    audio.mozPreservesPitch = masterTempo;
    audio.webkitPreservesPitch = masterTempo;
  }


  function setupAudioGraph(audio: PreservedAudio) {
    if (graphForAudioRef.current === audio && graphRef.current) return;
    audioContextRef.current?.close().catch(() => undefined);
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 180;
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1200; mid.Q.value = 0.9;
    const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 5200;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = compressorOn ? -22 : 0;
    compressor.ratio.value = compressorOn ? 4 : 1;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;
    const panner = ctx.createStereoPanner();
    const dryGain = ctx.createGain();
    const delay = ctx.createDelay(2); delay.delayTime.value = 0.28;
    const delayGain = ctx.createGain();
    const master = ctx.createGain();
    source.connect(low).connect(mid).connect(high).connect(compressor).connect(panner);
    panner.connect(dryGain).connect(master);
    panner.connect(delay).connect(delayGain).connect(master);
    master.connect(ctx.destination);
    audioContextRef.current = ctx;
    sourceRef.current = source;
    graphForAudioRef.current = audio;
    graphRef.current = { low, mid, high, compressor, delay, delayGain, dryGain, master, panner };
    applyEffectValues();
  }

  function applyEffectValues() {
    const graph = graphRef.current;
    if (!graph || !selectedClip) return;
    graph.low.gain.value = eqLow;
    graph.mid.gain.value = eqMid;
    graph.high.gain.value = eqHigh;
    graph.delayGain.gain.value = delayMix;
    graph.dryGain.gain.value = 1 - Math.min(0.65, delayMix * 0.35);
    graph.compressor.threshold.value = compressorOn ? -22 : 0;
    graph.compressor.ratio.value = compressorOn ? 4 : 1;
    graph.panner.pan.value = clamp(selectedClip.pan + selectedTrack.pan, -1, 1);
    graph.master.gain.value = clamp(masterVolume * selectedClip.volume * effectiveTrackGain(selectedClip.trackId), 0, 1);
  }

  function ensureAudio(): PreservedAudio | null {
    if (!selectedClip) {
      setStatus('Importe d’abord un fichier audio.');
      return null;
    }
    if (!audioRef.current || audioRef.current.src !== selectedClip.url) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(selectedClip.url) as PreservedAudio;
      audioRef.current.currentTime = selectedClip.start;
      audioRef.current.ontimeupdate = () => setPosition(Math.max(0, (audioRef.current?.currentTime ?? 0) - selectedClip.start));
      audioRef.current.onended = () => setPlaying(false);
      setPosition(0);
      setPlaying(false);
    }
    const pitchRatio = Math.pow(2, selectedClip.pitch / 12);
    audioRef.current.playbackRate = clamp(tempoRatio * pitchRatio, 0.25, 4);
    applyTonalitéPreservation(audioRef.current);
    audioRef.current.volume = 1;
    setupAudioGraph(audioRef.current);
    applyEffectValues();
    return audioRef.current;
  }

  function stopProjectSources() {
    projectSourcesRef.current.forEach(({ source }) => {
      try { source.stop(); } catch { /* source déjà stoppée */ }
    });
    projectSourcesRef.current = [];
  }

  async function scheduleProjectFrom(startTime: number): Promise<void> {
    if (!clips.length) {
      setStatus('Importe d’abord un ou plusieurs fichiers audio.');
      return;
    }
    stopProjectSources();
    if (audioRef.current) audioRef.current.pause();
    const ctx = new AudioContext();
    if (projectAudioContextRef.current) await projectAudioContextRef.current.close().catch(() => undefined);
    projectAudioContextRef.current = ctx;
    const solo = tracks.some(t => t.solo);
    const playableClips = clips.filter(clip => {
      const track = tracks.find(t => t.id === clip.trackId);
      const clipDuration = Math.max(0, clip.end - clip.start);
      const clipTimelineStart = clip.timelineStart ?? 0;
      const clipTimelineEnd = clipTimelineStart + clipDuration;
      return track && !track.mute && (!solo || track.solo) && clipTimelineEnd > startTime;
    });
    if (!playableClips.length) {
      setStatus('Aucun clip audible à partir de cette position. Vérifie mute/solo ou déplace le curseur.');
      return;
    }

    const scheduled: Array<{ source: AudioBufferSourceNode; gain: GainNode; panner: StereoPannerNode }> = [];
    for (const clip of playableClips) {
      try {
        const buffer = await decodeClip(clip);
        const track = tracks.find(t => t.id === clip.trackId);
        if (!track) continue;
        const clipTimelineStart = clip.timelineStart ?? 0;
        const relativeStart = Math.max(0, startTime - clipTimelineStart);
        const audioOffset = clamp(clip.start + relativeStart, clip.start, clip.end);
        const clipRemaining = Math.max(0.05, clip.end - audioOffset);
        const delay = Math.max(0, clipTimelineStart - startTime);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clamp(tempoRatio * Math.pow(2, clip.pitch / 12), 0.25, 4);
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner();
        gain.gain.value = clamp(masterVolume * clip.volume * track.volume, 0, 1.5);
        panner.pan.value = clamp(clip.pan + track.pan, -1, 1);
        source.connect(panner).connect(gain).connect(ctx.destination);
        source.start(ctx.currentTime + delay, audioOffset, clipRemaining);
        scheduled.push({ source, gain, panner });
      } catch (error) {
        console.error(error);
      }
    }
    projectSourcesRef.current = scheduled;
    projectStartAtRef.current = ctx.currentTime;
    projectStartPositionRef.current = startTime;
    setPlaying(true);
    setProjectPosition(startTime);
    setPosition(selectedClip ? clamp(startTime - (selectedClip.timelineStart ?? 0), 0, selectedLength) : 0);
    setStatus(`Lecture multipiste V34 lancée depuis ${formatTime(startTime)} · ${scheduled.length} clip(s) planifié(s).`);
  }

  function playPause() {
    if (playing) {
      stopProjectSources();
      setPlaying(false);
      projectAudioContextRef.current?.suspend().catch(() => undefined);
      setStatus(`Pause projet à ${formatTime(projectPosition)}.`);
      return;
    }
    const startTime = loopEnabled && projectPosition >= projectLoopEnd ? projectLoopStart : projectPosition;
    void scheduleProjectFrom(startTime);
  }

  useEffect(() => {
    if (!audioRef.current || !selectedClip) return;
    const audio = audioRef.current;
    audio.playbackRate = clamp(tempoRatio * Math.pow(2, selectedClip.pitch / 12), 0.25, 4);
    applyTonalitéPreservation(audio);
    audio.volume = 1;
    applyEffectValues();
  }, [masterTempo, tempoRatio, masterVolume, selectedClip, tracks, eqLow, eqMid, eqHigh, delayMix, compressorOn]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const ctx = projectAudioContextRef.current;
      const nextPosition = ctx ? projectStartPositionRef.current + Math.max(0, ctx.currentTime - projectStartAtRef.current) : projectPosition;
      if (loopEnabled && projectLoopEnd > projectLoopStart + 0.05 && nextPosition >= projectLoopEnd && !projectRestartingRef.current) {
        projectRestartingRef.current = true;
        void scheduleProjectFrom(projectLoopStart).finally(() => { projectRestartingRef.current = false; });
        return;
      }
      setProjectPosition(clamp(nextPosition, 0, timelineDuration));
      if (selectedClip) setPosition(clamp(nextPosition - (selectedClip.timelineStart ?? 0), 0, selectedLength));
      if (nextPosition >= timelineDuration - 0.05) {
        stopProjectSources();
        setPlaying(false);
        setProjectPosition(timelineDuration);
        setStatus('Lecture projet terminée.');
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [playing, loopEnabled, projectLoopStart, projectLoopEnd, timelineDuration, selectedClip, selectedLength]);

  function stop() {
    stopProjectSources();
    if (audioRef.current && selectedClip) {
      audioRef.current.pause();
      audioRef.current.currentTime = selectedClip.start;
    }
    projectAudioContextRef.current?.close().catch(() => undefined);
    projectAudioContextRef.current = null;
    setProjectPosition(0);
    setPosition(0);
    setPlaying(false);
    setStatus('Stop projet : lecture multipiste remise au début.');
  }

  function selectRelativeClip(direction: -1 | 1) {
    if (!clips.length) return setStatus('Aucun morceau dans la playlist.');
    const currentIndex = Math.max(0, clips.findIndex(c => c.id === selectedClip?.id));
    const nextIndex = (currentIndex + direction + clips.length) % clips.length;
    const nextClip = clips[nextIndex];
    setSelectedId(nextClip.id);
    setSelectedTrackId(nextClip.trackId);
    setProjectPosition(nextClip.timelineStart ?? 0);
    setPosition(0);
    setStatus(`Morceau sélectionné : ${nextClip.name} · curseur projet à ${formatTime(nextClip.timelineStart ?? 0)}.`);
  }

  function seekProjectTime(time: number) {
    const next = clamp(time, 0, timelineDuration);
    setProjectPosition(next);
    if (selectedClip) setPosition(clamp(next - (selectedClip.timelineStart ?? 0), 0, selectedLength));
    if (playing) void scheduleProjectFrom(next);
  }

  function seek(ratio: number) {
    if (!selectedClip) return;
    const localTime = clamp(ratio, 0, 1) * selectedLength;
    const absoluteTime = (selectedClip.timelineStart ?? 0) + localTime;
    seekProjectTime(absoluteTime);
  }

  function ratioFromWaveEvent(event: React.MouseEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    return clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  }

  function timeFromWaveEvent(event: React.MouseEvent<HTMLDivElement>): number {
    return ratioFromWaveEvent(event) * selectedLength;
  }

  function startWaveSelection(event: React.MouseEvent<HTMLDivElement>) {
    if (!selectedClip) return;
    const time = timeFromWaveEvent(event);
    setSelection({ start: time, end: time });
    setDraggingSelection(true);
    seek(time / Math.max(1, selectedLength));
  }

  function updateWaveSelection(event: React.MouseEvent<HTMLDivElement>) {
    if (!draggingSelection || !selectedClip) return;
    const time = timeFromWaveEvent(event);
    setSelection(prev => prev ? { ...prev, end: time } : { start: time, end: time });
  }

  function stopWaveSelection() {
    if (!draggingSelection) return;
    setDraggingSelection(false);
    if (normalizedSelection && normalizedSelection.end - normalizedSelection.start > 0.08) {
      setLoopStart(normalizedSelection.start);
      setLoopEnd(normalizedSelection.end);
      setStatus(`Sélection prête : ${formatTime(normalizedSelection.start)} → ${formatTime(normalizedSelection.end)}. Tu peux copier, couper ou boucler.`);
    }
  }

  function setLoopFromSelection() {
    if (!normalizedSelection || normalizedSelection.end - normalizedSelection.start < 0.08) return setStatus('Fais d’abord une sélection sur la waveform.');
    setLoopStart(normalizedSelection.start);
    setLoopEnd(normalizedSelection.end);
    setLoopEnabled(true);
    setStatus(`Boucle A/B activée : ${formatTime(normalizedSelection.start)} → ${formatTime(normalizedSelection.end)}.`);
  }

  function setLoopStartAtPlayhead() {
    setLoopStart(position);
    if (loopEnd <= position) setLoopEnd(selectedLength);
    setStatus(`Point A placé à ${formatTime(position)}.`);
  }

  function setLoopEndAtPlayhead() {
    setLoopEnd(Math.max(position, loopStart + 0.1));
    setStatus(`Point B placé à ${formatTime(Math.max(position, loopStart + 0.1))}.`);
  }

  function copySelection() {
    if (!selectedClip || !normalizedSelection || normalizedSelection.end - normalizedSelection.start < 0.08) return setStatus('Aucune sélection audio à copier.');
    const copied: Clip = {
      ...selectedClip,
      id: crypto.randomUUID(),
      name: `${selectedClip.name} sélection`,
      start: selectedClip.start + normalizedSelection.start,
      end: selectedClip.start + normalizedSelection.end
    };
    setClipboardClip(copied);
    setStatus(`Sélection copiée : ${formatTime(normalizedSelection.start)} → ${formatTime(normalizedSelection.end)}.`);
  }

  function pasteSelection() {
    if (!clipboardClip) return setStatus('Presse COPIER avant de coller une sélection.');
    pushHistory();
    const pasted: Clip = { ...clipboardClip, id: crypto.randomUUID(), name: `${clipboardClip.name} collé`, trackId: selectedTrackId };
    setClips(prev => [...prev, pasted]);
    setSelectedId(pasted.id);
    setStatus('Sélection collée comme nouveau clip dans la timeline.');
  }

  function deleteSelectedRegion() {
    if (!selectedClip || !normalizedSelection || normalizedSelection.end - normalizedSelection.start < 0.08) return setStatus('Aucune région sélectionnée à supprimer.');
    const absoluteStart = selectedClip.start + normalizedSelection.start;
    const absoluteEnd = selectedClip.start + normalizedSelection.end;
    if (absoluteStart <= selectedClip.start + 0.05 && absoluteEnd >= selectedClip.end - 0.05) return deleteClip();
    pushHistory();
    const pieces: Clip[] = [];
    if (absoluteStart > selectedClip.start + 0.05) pieces.push({ ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} avant`, end: absoluteStart });
    if (absoluteEnd < selectedClip.end - 0.05) pieces.push({ ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} après`, start: absoluteEnd });
    setClips(prev => prev.flatMap(c => c.id === selectedClip.id ? pieces : [c]));
    setSelectedId(pieces[0]?.id ?? null);
    setSelection(null);
    setStatus('Région supprimée : le clip a été recoupé proprement.');
  }

  function cutSelectionToClipboard() {
    copySelection();
    deleteSelectedRegion();
  }

  function zoomWave(delta: number) {
    setWaveformZoom(prev => clamp(Number((prev + delta).toFixed(2)), 1, 6));
  }

  function updateMaster(value: number) {
    setMasterVolume(value);
    if (audioRef.current && selectedClip) audioRef.current.volume = clamp(value * selectedClip.volume * effectiveTrackGain(selectedClip.trackId), 0, 1);
  }

  function duplicateClip() {
    if (!selectedClip) return;
    pushHistory();
    const duplicate = { ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} copie`, timelineStart: (selectedClip.timelineStart ?? 0) + Math.max(0.25, timelineStep) };
    setClips(prev => [...prev, duplicate]);
    setSelectedId(duplicate.id);
  }

  function deleteClip() {
    if (!selectedClip) return;
    pushHistory();
    setClips(prev => prev.filter(c => c.id !== selectedClip.id));
    setSelectedId(null);
    stop();
  }

  function cutAtPlayhead() {
    if (!selectedClip) return;
    const cutTime = selectedClip.start + position;
    if (cutTime <= selectedClip.start + 0.15 || cutTime >= selectedClip.end - 0.15) return setStatus('Place la tête de lecture au milieu du clip pour couper.');
    pushHistory();
    const left: Clip = { ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} A`, end: cutTime };
    const right: Clip = { ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} B`, start: cutTime };
    setClips(prev => prev.flatMap(c => c.id === selectedClip.id ? [left, right] : [c]));
    setSelectedId(right.id);
    setStatus('CUT réel : le clip est divisé en deux segments.');
  }

  function trimStart() {
    if (!selectedClip) return;
    const newStart = clamp(selectedClip.start + 1, 0, selectedClip.end - 0.25);
    updateClip(selectedClip.id, { start: newStart });
    setStatus('Trim début appliqué.');
  }

  function trimEnd() {
    if (!selectedClip) return;
    const newEnd = clamp(selectedClip.end - 1, selectedClip.start + 0.25, selectedClip.duration);
    updateClip(selectedClip.id, { end: newEnd });
    setStatus('Trim fin appliqué.');
  }

  function undo() {
    const last = history.length ? history[history.length - 1] : undefined;
    if (!last) return setStatus('Rien à annuler.');
    setClips(last);
    setHistory(prev => prev.slice(0, -1));
    setStatus('Annulation appliquée.');
  }

  async function saveProject() {
    const savedClips: SavedClip[] = clips.map(({ url, waveform, ...clip }) => ({ ...clip, hasAudioFile: false }));
    const project = { version: '33.0.0', bpm, targetBpm, detectedKey, keyConfidence, beatGridOffset, beatDivision, beatGridLocked, arrangementMarkers, masterTempo, masterVolume, tracks, clips: savedClips, savedAt: new Date().toISOString() };
    const result = await window.fmBridge?.saveProject(project);
    setStatus(result?.ok ? `Projet sauvegardé : ${result.filePath}` : 'Sauvegarde annulée.');
  }

  async function exportSelectedWav() {
    if (!selectedClip) return setStatus('Aucun clip à exporter.');
    setStatus('Export WAV en cours...');
    try {
      const blob = await renderClipToWav(selectedClip, effectiveTrackGain(selectedClip.trackId) * masterVolume);
      downloadBlob(blob, selectedClip.name.replace(/\.[^.]+$/, '') + '-FM-V30.wav');
      setStatus('Export WAV réel terminé. Note : Master Tempo conserve la tonalité en lecture, pas encore en rendu offline.');
    } catch (error) {
      console.error(error);
      setStatus('Export impossible sur ce fichier. Essaie un WAV/MP3 local standard.');
    }
  }



  async function exportMixWav() {
    if (!clips.length) return setStatus('Aucun clip à exporter en mix.');
    setStatus('Export mix WAV en cours...');
    try {
      const blob = await renderProjectMixToWav(clips, tracks, masterVolume);
      downloadBlob(blob, 'FM-Remix-Forge-Studio-V33-mix-multipiste.wav');
      setStatus('Export mix V35 terminé : positions timeline, pistes, mute/solo, reverse, normalize, fades et volumes inclus.');
    } catch (error) {
      console.error(error);
      setStatus('Export mix impossible sur ce projet. Vérifie les fichiers audio importés.');
    }
  }


  async function analyzeSelectedBpm() {
    if (!selectedClip) return setStatus('Importe un morceau avant de lancer l’analyse BPM.');
    setStatus('Analyse BPM + tonalité + marqueurs en cours...');
    try {
      const buffer = await decodeClip(selectedClip);
      const detected = estimateBpmFromBuffer(buffer);
      const key = estimateKeyFromBuffer(buffer);
      const markers = detectTransientMarkers(buffer, selectedLength || buffer.duration);
      setBpm(detected);
      setDetectedKey(key.key);
      setKeyConfidence(key.confidence);
      setBeatGridOffset(0);
      setArrangementMarkers(markers);
      const recipe = styleRecipes[selectedStyle] ?? styleRecipes['Kompa Gouyad'];
      setTargetBpm(recipe.bpm);
      setAnalysisText(`BPM détecté : ${detected} · tonalité : ${key.key} (${key.confidence}%) · ${markers.length} marqueur(s) · style cible ${selectedStyle} à ${recipe.bpm} BPM.`);
      setStatus(`Analyse V32 terminée : ${detected} BPM · ${key.key} · grille calée au début.`);
    } catch (error) {
      console.error(error);
      setStatus('Analyse complète impossible sur ce fichier. Essaie un MP3/WAV standard ou utilise TAP + GRILLE AU CURSEUR.');
    }
  }

  function setGridAtPlayhead() {
    if (!selectedClip) return setStatus('Importe un morceau avant de caler la grille.');
    setBeatGridOffset(clamp(position, 0, Math.max(0, selectedLength - 0.1)));
    setStatus(`Beat-grid recalée sur ${formatTime(position)}. Les marqueurs de temps suivent ce point.`);
  }

  function addArrangementMarker(type: ArrangementMarker['type'] = 'cue') {
    if (!selectedClip) return setStatus('Importe un morceau avant d’ajouter un marqueur.');
    const labelByType: Record<ArrangementMarker['type'], string> = { cue: 'CUE', intro: 'INTRO', drop: 'DROP', break: 'BREAK', outro: 'OUTRO' };
    const marker: ArrangementMarker = { id: crypto.randomUUID(), label: labelByType[type], time: position, type };
    setArrangementMarkers(prev => [...prev, marker].sort((a, b) => a.time - b.time));
    setStatus(`Marqueur ${marker.label} ajouté à ${formatTime(position)}.`);
  }

  function removeLastMarker() {
    setArrangementMarkers(prev => prev.slice(0, -1));
    setStatus('Dernier marqueur supprimé.');
  }

  function quantizeSelectionToGrid() {
    if (!normalizedSelection || !selectedClip) return setStatus('Sélectionne une zone avant de quantifier.');
    const snapTime = (time: number) => beatGridOffset + Math.round((time - beatGridOffset) / beatInterval) * beatInterval;
    const start = clamp(snapTime(normalizedSelection.start), 0, selectedLength);
    const end = clamp(snapTime(normalizedSelection.end), start + 0.05, selectedLength);
    setSelection({ start, end });
    setStatus(`Sélection quantifiée : ${formatTime(start)} → ${formatTime(end)}.`);
  }

  function prepareAutoRemix() {
    if (!selectedClip) return setStatus('Importe d’abord une musique à convertir.');
    const recipe = styleRecipes[selectedStyle] ?? styleRecipes['Kompa Gouyad'];
    setTargetBpm(recipe.bpm);
    setMasterTempo(true);
    setEqLow(selectedStyle.includes('Kompa') || selectedStyle.includes('Zouk') ? 2 : 0);
    setEqMid(selectedStyle.includes('Amapiano') || selectedStyle.includes('Afro') ? 1 : 0);
    setEqHigh(selectedStyle.includes('Techno') || selectedStyle.includes('Bouyon') ? 2 : 0);
    setDelayMix(selectedStyle.includes('Deep') || selectedStyle.includes('Zouk') ? 0.18 : 0.08);
    setCompressorOn(true);
    setAnalysisText(`Recette ${selectedStyle} : ${recipe.drum}, ${recipe.bass}, ${recipe.melody}, groove ${recipe.groove}.`);
    setStatus(makeRemixNotes(selectedStyle, bpm));
  }

  function tapTempo() {
    const now = performance.now();
    const next = [...tapTimes.filter(t => now - t < 5000), now].slice(-6);
    setTapTimes(next);
    if (next.length >= 2) {
      const intervals = next.slice(1).map((t, i) => t - next[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tappedBpm = clamp(60000 / avg, 50, 220);
      setBpm(Number(tappedBpm.toFixed(2)));
      setTargetBpm(Number(tappedBpm.toFixed(2)));
      setStatus(`Tap Tempo détecté : ${tappedBpm.toFixed(2)} BPM`);
    } else {
      setStatus('Tape plusieurs fois pour calculer le BPM.');
    }
  }

  const pianoNotes = ['C6','B5','A#5','A5','G#5','G5','F#5','F5','E5','D#5','D5','C#5','C5','B4','A#4','A4','G#4','G4','F#4','F4','E4','D#4','D4','C#4','C4'];
  const pianoPitchTop = 84;
  const pianoStep = { '1/4': 1, '1/8': 0.5, '1/16': 0.25, '1/32': 0.125 }[quantizeValue];
  const pianoBeats = 16;

  function quantizeBeat(value: number): number {
    return clamp(Math.round(value / pianoStep) * pianoStep, 0, pianoBeats - pianoStep);
  }

  function midiToFreq(pitch: number): number {
    return 440 * Math.pow(2, (pitch - 69) / 12);
  }

  function playMidiNote(note: MidiNote) {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const instrumentType: OscillatorType = pianoInstrument.includes('Basse') ? 'sawtooth' : pianoInstrument.includes('Lead') ? 'square' : 'triangle';
    osc.type = instrumentType;
    osc.frequency.value = midiToFreq(note.pitch);
    filter.type = 'lowpass';
    filter.frequency.value = pianoInstrument.includes('Pad') ? 1200 : 4200;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(clamp(note.velocity / 127, 0.05, 1) * 0.26, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + Math.max(0.08, note.duration * 0.35));
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + Math.max(0.1, note.duration * 0.35));
    setStatus(`Piano Roll : note ${note.pitch} jouée avec ${pianoInstrument}.`);
  }

  function selectMidiNote(id: string) {
    setSelectedMidiId(id);
    setMidiNotes(prev => prev.map(note => ({ ...note, selected: note.id === id })));
  }

  function createMidiNoteFromPointer(event: React.MouseEvent<HTMLDivElement>) {
    if (!pianoRollRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest('.midi-note')) return;
    const rect = pianoRollRef.current.getBoundingClientRect();
    const xRatio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 0.999);
    const start = quantizeBeat(xRatio * pianoBeats);
    const pitch = clamp(pianoPitchTop - Math.floor(yRatio * pianoNotes.length), 60, pianoPitchTop);
    const note: MidiNote = { id: crypto.randomUUID(), pitch, start, duration: pianoStep * 2, velocity: 90, selected: true };
    setMidiNotes(prev => [...prev.map(n => ({ ...n, selected: false })), note]);
    setSelectedMidiId(note.id);
    playMidiNote(note);
    setStatus('Piano Roll V38 : note créée. Glisse les contrôles ◀ ▶ pour la déplacer ou changer sa durée.');
  }

  function moveMidiNote(id: string, delta: number) {
    setMidiNotes(prev => prev.map(note => note.id === id ? { ...note, start: quantizeBeat(note.start + delta), selected: true } : { ...note, selected: false }));
    setSelectedMidiId(id);
  }

  function resizeMidiNote(id: string, delta: number) {
    setMidiNotes(prev => prev.map(note => note.id === id ? { ...note, duration: clamp(note.duration + delta, pianoStep, 8), selected: true } : note));
    setSelectedMidiId(id);
  }

  function updateMidiVelocity(id: string, velocity: number) {
    setMidiNotes(prev => prev.map(note => note.id === id ? { ...note, velocity } : note));
  }

  function deleteSelectedMidiNote() {
    if (!selectedMidiId) return setStatus('Sélectionne une note MIDI à supprimer.');
    setMidiNotes(prev => prev.filter(note => note.id !== selectedMidiId));
    setSelectedMidiId(null);
    setStatus('Piano Roll : note supprimée.');
  }

  function duplicateSelectedMidiNote() {
    const selected = midiNotes.find(note => note.id === selectedMidiId);
    if (!selected) return setStatus('Sélectionne une note MIDI à dupliquer.');
    const copy: MidiNote = { ...selected, id: crypto.randomUUID(), start: quantizeBeat(selected.start + pianoStep), selected: true };
    setMidiNotes(prev => [...prev.map(note => ({ ...note, selected: false })), copy]);
    setSelectedMidiId(copy.id);
    setStatus('Piano Roll : note dupliquée.');
  }

  function quantizeMidiNotes() {
    setMidiNotes(prev => prev.map(note => ({ ...note, start: quantizeBeat(note.start), duration: Math.max(pianoStep, Math.round(note.duration / pianoStep) * pianoStep) })));
    setStatus(`Piano Roll : notes quantifiées en ${quantizeValue}.`);
  }

  function playPianoPattern() {
    if (pianoPlaying) {
      setPianoPlaying(false);
      setPianoCursor(0);
      return;
    }
    setPianoPlaying(true);
    setStatus('Lecture Piano Roll lancée.');
    const sorted = [...midiNotes].sort((a, b) => a.start - b.start);
    const beatMs = 60000 / Math.max(1, targetBpm);
    sorted.forEach(note => window.setTimeout(() => playMidiNote(note), note.start * beatMs));
    window.setTimeout(() => setPianoPlaying(false), (pianoBeats + 0.5) * beatMs);
  }


  function previewInstrument(instrument: InstrumentDefinition) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    master.connect(ctx.destination);
    const pattern = instrument.engine === 'kit' ? [1, 1.5, 2, 2.75] : [1, 1.25, 1.5, 2];
    pattern.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = instrument.tone;
      osc.frequency.setValueAtTime(instrument.baseFreq * ratio, ctx.currentTime + index * 0.16);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(instrument.engine === 'kit' ? 0.22 : 0.16, ctx.currentTime + index * 0.16 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.16 + (instrument.engine === 'kit' ? 0.13 : 0.32));
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime + index * 0.16);
      osc.stop(ctx.currentTime + index * 0.16 + 0.38);
    });
    setStatus(`Banque V38 : préécoute ${instrument.name} · ${instrument.category} · ${instrument.tags.join(', ')}.`);
  }

  function selectInstrument(instrument: InstrumentDefinition) {
    setSelectedInstrumentId(instrument.id);
    const pianoMap: Record<string, PianoInstrument> = {
      'piano-grand': 'Piano', rhodes: 'Rhodes', 'orgue-kompa': 'Orgue', 'basse-ronde': 'Basse', 'guitare-palm': 'Guitare', 'strings-soft': 'Strings', 'pad-air': 'Pad', 'lead-tropical': 'Lead', 'kit-kompa': 'Kompa Kit', 'kit-gouyad': 'Kompa Kit', 'kit-afro': 'Afro Kit', 'kit-amapiano': 'Afro Kit', kayamb: 'Maloya Kit', rouler: 'Maloya Kit', 'sega-kit': 'Sega Kit', 'bouyon-kit': 'Bouyon Kit', djembe: 'Afro Kit', kalimba: 'Pad'
    };
    setPianoInstrument(pianoMap[instrument.id] ?? 'Piano');
    if (instrument.bpm) setTargetBpm(instrument.bpm);
    setStatus(`Instrument sélectionné : ${instrument.name}. Piano Roll réglé sur ${pianoMap[instrument.id] ?? 'Piano'}${instrument.bpm ? ` · BPM ${instrument.bpm}` : ''}.`);
  }

  function toggleInstrumentFavorite(id: string) {
    setInstrumentLibrary(prev => prev.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item));
  }

  function sendInstrumentToPad(instrument: InstrumentDefinition) {
    const targetPad = samplerPads.find(pad => pad.id === selectedPadId) ?? samplerPads[0];
    setSamplerPads(prev => prev.map(pad => pad.id === targetPad.id ? {
      ...pad,
      label: instrument.name.replace(/[^A-Za-zÀ-ÿ0-9]/g, ' ').trim().toUpperCase().slice(0, 10) || 'INST',
      fileName: `Instrument V38 · ${instrument.category}`,
      url: undefined,
      pitch: instrument.baseFreq > 500 ? 7 : instrument.baseFreq < 140 ? -5 : 0,
      volume: instrument.engine === 'kit' ? 0.9 : 0.72,
      waveform: Array.from({ length: 20 }, (_, i) => 0.18 + Math.abs(Math.sin((i + instrument.baseFreq / 100) * 0.47)) * 0.78)
    } : pad));
    setStatus(`Instrument envoyé vers le pad ${targetPad.label} : ${instrument.name}.`);
  }

  function playPad(label: string) {
    const pad = samplerPads.find(item => item.label === label) ?? samplerPads.find(item => item.id === selectedPadId);
    if (pad?.url) {
      const audio = new Audio(pad.url) as PreservedAudio;
      audio.volume = clamp(pad.volume, 0, 1);
      audio.playbackRate = clamp(Math.pow(2, pad.pitch / 12), 0.25, 4);
      applyTonalitéPreservation(audio);
      audio.play().catch(() => setStatus('Pad audio bloqué : clique dans la fenêtre puis relance.'));
      setStatus(`Sampler V38 : lecture du pad ${pad.label} · ${pad.fileName ?? 'sample chargé'}.`);
      return;
    }
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = label.includes('KICK') ? 70 : label.includes('SNARE') ? 190 : label.includes('BASS') ? 110 : label.includes('HIHAT') ? 6500 : label.includes('PIANO') ? 523 : 440;
    osc.type = label.includes('BASS') ? 'sawtooth' : label.includes('HIHAT') ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq * Math.pow(2, (pad?.pitch ?? 0) / 12), ctx.currentTime);
    const attack = pad?.attack ?? 0.01;
    const release = pad?.release ?? 0.22;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.24 * (pad?.volume ?? 1), ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + Math.max(attack + 0.04, release));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + Math.max(0.08, release));
    setStatus(`Sampler V38 : préécoute pad ${label}.`);
  }

  async function loadSampleIntoPad(file: File, padId = selectedPadId) {
    const url = URL.createObjectURL(file);
    const waveform = await makeWaveform(url, 20);
    setSamplerPads(prev => prev.map(pad => pad.id === padId ? { ...pad, url, fileName: file.name, waveform } : pad));
    setSelectedPadId(padId);
    setStatus(`Sampler V38 : sample chargé dans le pad · ${file.name}`);
  }

  function onPadFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|flac|ogg|m4a|aiff|aif)$/i.test(file.name)) {
      setStatus('Sampler V38 : choisis un fichier audio valide.');
      return;
    }
    void loadSampleIntoPad(file);
  }

  function assignSelectedClipToPad() {
    const pad = samplerPads.find(item => item.id === selectedPadId);
    if (!selectedClip || !pad) return setStatus('Sélectionne un clip audio et un pad avant d’assigner.');
    setSamplerPads(prev => prev.map(item => item.id === pad.id ? { ...item, url: selectedClip.url, fileName: selectedClip.name, waveform: selectedClip.waveform.slice(0, 20) } : item));
    setStatus(`Sampler V38 : clip assigné au pad ${pad.label}.`);
  }

  function updateSelectedPad(patch: Partial<SamplerPad>) {
    setSamplerPads(prev => prev.map(pad => pad.id === selectedPadId ? { ...pad, ...patch } : pad));
  }

  function renameSelectedPad(label: string) {
    setSamplerPads(prev => prev.map(pad => pad.id === selectedPadId ? { ...pad, label: label.toUpperCase().slice(0, 10) || 'PAD' } : pad));
  }

  function clearSelectedPad() {
    setSamplerPads(prev => prev.map(pad => pad.id === selectedPadId ? { ...pad, url: undefined, fileName: undefined, waveform: defaultSamplerPads[0].waveform } : pad));
    setStatus('Sampler V38 : pad vidé.');
  }


  function toggleSequenceStep(row: SequenceRowName, step: number) {
    setSequence(prev => ({
      ...prev,
      [row]: prev[row].map((active, index) => index === step ? !active : active)
    }));
    setStatus(`Séquenceur : ${row} pas ${step + 1} ${sequence[row][step] ? 'désactivé' : 'activé'}.`);
  }

  function playSequenceStep(step: number) {
    sequenceRows.forEach(row => {
      if (sequence[row][step]) playPad(row.toUpperCase());
    });
  }

  function resetSequence() {
    setSequence(defaultSequence);
    setSequencerStep(0);
    setStatus('Séquenceur remis sur un groove propre de base.');
  }

  function applyStyleSequence() {
    const recipe = styleRecipes[selectedStyle] ?? styleRecipes['Kompa Gouyad'];
    const isKompa = selectedStyle.includes('Kompa') || selectedStyle.includes('Zouk');
    const isAfro = selectedStyle.includes('Afro') || selectedStyle.includes('Amapiano');
    const next: SequenceGrid = {
      Kick: isKompa ? [true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false] : [true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false],
      'Caisse claire': isKompa ? [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false] : [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],
      Clap: isAfro ? [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false] : [false,false,false,false,false,false,false,false,false,false,false,false,true,false,false,false],
      Charley: isAfro ? [true,false,true,true,true,false,true,false,true,false,true,true,true,false,true,false] : [true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false],
      Basse: isKompa ? [true,false,false,true,false,true,false,false,true,false,false,true,false,true,false,false] : [true,false,false,false,false,false,true,false,true,false,false,false,false,false,true,false],
      Percu: isAfro || isKompa ? [false,true,false,false,false,true,false,true,false,true,false,false,false,true,false,true] : [false,false,true,false,false,true,false,false,false,false,true,false,false,true,false,false]
    };
    setSequence(next);
    setTargetBpm(recipe.bpm);
    setStatus(`Séquenceur configuré pour ${selectedStyle} à ${recipe.bpm} BPM.`);
  }

  function exportSequenceWav() {
    const sampleRate = 44100;
    const bars = 4;
    const stepDuration = 60 / Math.max(1, targetBpm) / 4;
    const totalSteps = 16 * bars;
    const totalSamples = Math.ceil(totalSteps * stepDuration * sampleRate);
    const out = new Float32Array(totalSamples);
    const addTone = (startSec: number, freq: number, dur: number, gainValue: number, kind: OscillatorType) => {
      const start = Math.floor(startSec * sampleRate);
      const len = Math.floor(dur * sampleRate);
      for (let i = 0; i < len && start + i < out.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * (kind === 'sine' ? 10 : 18));
        const wave = kind === 'square' ? Math.sign(Math.sin(2 * Math.PI * freq * t)) : kind === 'sawtooth' ? 2 * ((freq * t) % 1) - 1 : Math.sin(2 * Math.PI * freq * t);
        out[start + i] += wave * env * gainValue;
      }
    };
    for (let sidx = 0; sidx < totalSteps; sidx++) {
      const step = sidx % 16;
      const time = sidx * stepDuration;
      if (sequence.Kick[step]) addTone(time, 65, 0.22, 0.65, 'sine');
      if (sequence['Caisse claire'][step]) addTone(time, 190, 0.16, 0.28, 'sine');
      if (sequence.Clap[step]) addTone(time, 900, 0.08, 0.18, 'square');
      if (sequence.Charley[step]) addTone(time, 6500, 0.05, 0.09, 'square');
      if (sequence.Basse[step]) addTone(time, 110, 0.28, 0.32, 'sawtooth');
      if (sequence.Percu[step]) addTone(time, 420, 0.09, 0.16, 'sine');
    }
    let peak = 0;
    for (const sample of out) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0.98) for (let i = 0; i < out.length; i++) out[i] = out[i] / peak * 0.98;
    downloadBlob(encodeWav(out, sampleRate), `sequence-${selectedStyle.replace(/\s+/g, '-')}-V30.wav`);
    setStatus('Export WAV du séquenceur terminé.');
  }

  function moveClipToTrack(trackId: string) {
    setSelectedTrackId(trackId);
    if (selectedClip) updateClip(selectedClip.id, { trackId });
  }


  function snapTimelineTime(value: number): number {
    if (!snap) return Number(clamp(value, 0, timelineDuration).toFixed(2));
    return Number((Math.round(value / timelineStep) * timelineStep).toFixed(3));
  }

  function moveSelectedClip(seconds: number) {
    if (!selectedClip) return setStatus('Sélectionne un clip dans la timeline.');
    const next = snapTimelineTime((selectedClip.timelineStart ?? 0) + seconds);
    updateClip(selectedClip.id, { timelineStart: next });
    setStatus(`Clip déplacé à ${formatTime(next)} sur la timeline.`);
  }

  function setSelectedClipTimelineStart(value: number) {
    if (!selectedClip) return;
    const next = snapTimelineTime(value);
    updateClip(selectedClip.id, { timelineStart: next });
    setStatus(`Position timeline : ${formatTime(next)}.`);
  }

  function resizeSelectedClip(edge: 'start' | 'end', seconds: number) {
    if (!selectedClip) return setStatus('Sélectionne un clip à redimensionner.');
    if (edge === 'start') {
      const nextStart = clamp(selectedClip.start + seconds, 0, selectedClip.end - 0.25);
      const delta = nextStart - selectedClip.start;
      updateClip(selectedClip.id, { start: nextStart, timelineStart: snapTimelineTime((selectedClip.timelineStart ?? 0) + delta) });
      setStatus('Bord gauche du clip ajusté.');
    } else {
      const nextEnd = clamp(selectedClip.end + seconds, selectedClip.start + 0.25, selectedClip.duration);
      updateClip(selectedClip.id, { end: nextEnd });
      setStatus('Bord droit du clip ajusté.');
    }
  }


  function zoomTimeline(delta: number) {
    setTimelineZoom(prev => clamp(Number((prev + delta).toFixed(1)), 4, 28));
    setStatus(`Zoom timeline : ${clamp(Number((timelineZoom + delta).toFixed(1)), 4, 28).toFixed(1)} px/s.`);
  }

  function startDragClip(event: React.MouseEvent, clip: Clip) {
    event.stopPropagation();
    setSelectedId(clip.id);
    setSelectedTrackId(clip.trackId);
    setProjectPosition(clip.timelineStart ?? 0);
    setDragClip({ id: clip.id, startX: event.clientX, originalStart: clip.timelineStart ?? 0 });
    setStatus('Déplacement clip actif : glisse à gauche/droite puis relâche la souris.');
  }

  function trimClipByHandle(event: React.MouseEvent, clip: Clip, edge: 'start' | 'end') {
    event.stopPropagation();
    const amount = event.shiftKey ? -timelineStep : timelineStep;
    setSelectedId(clip.id);
    setSelectedTrackId(clip.trackId);
    if (edge === 'start') {
      const nextStart = clamp(clip.start + amount, 0, clip.end - 0.25);
      const delta = nextStart - clip.start;
      updateClip(clip.id, { start: nextStart, timelineStart: snapTimelineTime((clip.timelineStart ?? 0) + delta) });
      setStatus(event.shiftKey ? 'Poignée gauche : début reculé.' : 'Poignée gauche : début avancé.');
    } else {
      const nextEnd = clamp(clip.end + (event.shiftKey ? timelineStep : -timelineStep), clip.start + 0.25, clip.duration);
      updateClip(clip.id, { end: nextEnd });
      setStatus(event.shiftKey ? 'Poignée droite : fin allongée.' : 'Poignée droite : fin raccourcie.');
    }
  }

  function quickFadeClip(clip: Clip) {
    setSelectedId(clip.id);
    const fade = Math.min(1.5, Math.max(0.1, (clip.end - clip.start) * 0.06));
    updateClip(clip.id, { fadeIn: fade, fadeOut: fade });
    setStatus(`Fondus rapides appliqués : ${fade.toFixed(1)}s entrée/sortie.`);
  }


  useEffect(() => {
    if (!sequencerPlaying) return;
    const stepMs = (60 / Math.max(1, targetBpm) / 4) * 1000;
    const timer = window.setInterval(() => {
      setSequencerStep(prev => {
        const next = (prev + 1) % 16;
        playSequenceStep(next);
        return next;
      });
    }, stepMs);
    playSequenceStep(sequencerStep);
    return () => window.clearInterval(timer);
  }, [sequencerPlaying, targetBpm, sequence]);

  useEffect(() => {
    if (!dragClip) return;
    const onMove = (event: MouseEvent) => {
      const deltaSeconds = (event.clientX - dragClip.startX) / timelineZoom;
      const next = snapTimelineTime(dragClip.originalStart + deltaSeconds);
      setClips(prev => prev.map(clip => clip.id === dragClip.id ? { ...clip, timelineStart: next } : clip));
      setProjectPosition(next);
    };
    const onUp = () => {
      setStatus('Déplacement clip terminé.');
      setDragClip(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragClip, timelineZoom, timelineStep, snap]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'Space') { event.preventDefault(); playPause(); }
      if (event.key.toLowerCase() === 's' && event.ctrlKey) { event.preventDefault(); void saveProject(); }
      if (event.key.toLowerCase() === 'z' && event.ctrlKey) { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === 'x') cutAtPlayhead();
      if (event.key.toLowerCase() === 'l') setLoopEnabled(v => !v);
      if (event.key.toLowerCase() === 'c' && event.ctrlKey) { event.preventDefault(); copySelection(); }
      if (event.key.toLowerCase() === 'v' && event.ctrlKey) { event.preventDefault(); pasteSelection(); }
      if (event.key.toLowerCase() === 'm') setMasterTempo(v => !v);
      if (event.key === 'Delete') deleteClip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return <main className={`app ${dropActive ? 'drop-active' : ''}`} onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDropActive(true); }} onDragLeave={e => { if (e.currentTarget === e.target) setDropActive(false); }}>
    <section className="topbar">
      <div className="logo">FM</div>
      <div className="tempo-card"><span>TEMPO MAÎTRE</span><button className={masterTempo ? 'on' : ''} onClick={() => setMasterTempo(v => !v)}>{masterTempo ? 'ON' : 'OFF'}</button><small>{masterTempo ? 'Tonalité conservée' : 'Mode vinyle'}</small></div>
      <div className="tempo-card big"><span>BPM SOURCE</span><strong>{bpm.toFixed(2)}</strong><input type="range" min="60" max="180" value={bpm} onChange={e => setBpm(Number(e.target.value))}/></div>
      <div className="tempo-card big"><span>BPM CIBLE</span><strong>{targetBpm.toFixed(2)}</strong><input type="range" min="60" max="200" value={targetBpm} onChange={e => setTargetBpm(Number(e.target.value))}/></div>
      <button className="sync" onClick={() => setStatus(`Master Tempo ${masterTempo ? 'ON' : 'OFF'} · vitesse x${tempoRatio.toFixed(2)} · ${masterTempo ? 'tonalité gardée' : 'tonalité type vinyle'}`)}>CALER</button><button className="sync" onClick={tapTempo}>TAP</button><button className={snap ? 'sync on' : 'sync'} onClick={() => setSnap(v => !v)}>{snap ? 'GRILLE ON' : 'GRILLE OFF'}</button>
      <div className="project-actions"><input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aiff,.aif" multiple hidden onChange={e => e.target.files && loadFiles(e.target.files)}/><button onClick={() => fileInputRef.current?.click()}>Importer audio</button><button onClick={saveProject}>Sauvegarder projet</button><button onClick={exportSelectedWav}>Exporter clip</button><button onClick={exportMixWav}>Exporter mix</button></div>
    </section>

    <section className="layout">
      <aside className="browser panel">
        <div className="tabs"><button>BANQUE</button><button className="active">INSTRUMENTS</button><button>ÉCHANTILLONS</button><button>PRÉRÉGLAGES</button></div>
        <input className="search" placeholder="Rechercher un son, instrument, style..." value={sampleQuery} onChange={e => setSampleQuery(e.target.value)} />
        <select className="track-select" value={selectedTrackId} onChange={e => moveClipToTrack(e.target.value)}>{tracks.map(t => <option value={t.id} key={t.id}>Piste : {t.name}</option>)}</select>
        <div className="playlist"><h3>PLAYLIST AUDIO</h3>{clips.length ? clips.map((clip, index) => <button key={clip.id} className={selectedId === clip.id ? 'active' : ''} onClick={() => { stop(); setSelectedId(clip.id); setSelectedTrackId(clip.trackId); }}><b>{index + 1}. {clip.name}</b><small>{formatTime(clip.end - clip.start)} · {tracks.find(t => t.id === clip.trackId)?.name}</small></button>) : <p>Aucun audio importé.</p>}</div>
        <div className="library-v38"><div className="library-head"><h3>BANQUE INSTRUMENTS V38</h3><span>{filteredInstrumentLibrary.length} sons</span></div><div className="category-row-v38">{instrumentCategories.map(cat => <button key={cat} className={instrumentCategory === cat ? 'active' : ''} onClick={() => setInstrumentCategory(cat)}>{cat}</button>)}</div><div className="instrument-grid-v38">{filteredInstrumentLibrary.map(instrument => <button key={instrument.id} className={`instrument-card-v38 ${selectedInstrumentId === instrument.id ? 'sel' : ''} ${instrument.favorite ? 'fav' : ''}`} onClick={() => selectInstrument(instrument)} onDoubleClick={() => previewInstrument(instrument)}><strong>{instrument.name}</strong><small>{instrument.category} · {instrument.bpm ? `${instrument.bpm} BPM` : instrument.key ?? 'Libre'}</small><em>{instrument.tags.slice(0, 3).map(tag => <i key={tag}>{tag}</i>)}</em><span><b onClick={e => { e.stopPropagation(); previewInstrument(instrument); }}>▶</b><b onClick={e => { e.stopPropagation(); sendInstrumentToPad(instrument); }}>PAD</b><b onClick={e => { e.stopPropagation(); toggleInstrumentFavorite(instrument.id); }}>{instrument.favorite ? '★' : '☆'}</b></span></button>)}</div></div>
        <div className="sample-card"><h3>{selectedClip?.name ?? 'Dépose ta musique ici'}</h3><div className="miniwave">{(selectedClip?.waveform ?? []).slice(0, 48).map((bar, i) => <i key={i} style={{ height: `${bar * 100}%` }} />)}</div><div className="tag-row">{sampleTags.slice(0,4).map(tag => <span key={tag}>{tag}</span>)}</div><div className="knobs"><span>Attaque</span><span>Relâchement</span><span>Tonalité</span><span>Volume</span></div></div>
      </aside>

      <section className="center">
        <div className="deck panel">
          <div><h2>{selectedClip?.name ?? 'Aucun morceau chargé'}</h2><p>{selectedClip ? `${formatTime(position)} / ${formatTime(selectedLength)} · ${selectedTrack?.name} · tempo x${tempoRatio.toFixed(2)} · projet ${formatTime(projectPosition)}` : 'Glisse-dépose un MP3/WAV/FLAC/OGG ici'}</p></div>
          <div className="main-wave" onWheel={e => { e.preventDefault(); zoomWave(e.deltaY < 0 ? 0.25 : -0.25); }} onMouseDown={startWaveSelection} onMouseMove={updateWaveSelection} onMouseUp={stopWaveSelection} onMouseLeave={stopWaveSelection} onDoubleClick={e => seek(ratioFromWaveEvent(e))}>
            <div className="wave-scroll" style={{ width: `${Math.max(100, waveformZoom * 100)}%` }}>{(selectedClip?.waveform ?? []).map((bar, i) => <i key={i} style={{ height: `${bar * 100}%` }} />)}{beatMarkers.map((left, i) => <b className={`beat ${beatDivision === '1/1' ? 'bar' : ''}`} key={i} style={{ left: `${left}%` }} />)}{visibleArrangementMarkers.map(marker => <button className={`arrangement-marker ${marker.type}`} key={marker.id} style={{ left: `${(marker.time / Math.max(1, selectedLength)) * 100}%` }} onClick={e => { e.stopPropagation(); seek(marker.time / Math.max(1, selectedLength)); }}>{marker.label}</button>)}{loopEnabled && selectedClip && <><b className="loop-zone" style={{ left: `${loopStartPercent}%`, width: `${Math.max(0, loopEndPercent - loopStartPercent)}%` }} /><b className="loop-marker a" style={{ left: `${loopStartPercent}%` }}>A</b><b className="loop-marker b" style={{ left: `${loopEndPercent}%` }}>B</b></>}{normalizedSelection && <b className="selection-zone" style={{ left: `${selectionLeftPercent}%`, width: `${selectionWidthPercent}%` }} />}<div className="playhead" style={{left: selectedClip && selectedLength > 0 ? `${Math.min(100, (position / selectedLength) * 100)}%` : '0%'}}/></div>
          </div>
        </div>

        <div className="toolbar panel"><button onClick={undo}>ANNULER</button><button onClick={analyzeSelectedBpm}>ANALYSE V35</button><button onClick={setGridAtPlayhead}>GRILLE AU CURSEUR</button><button onClick={() => addArrangementMarker('cue')}>MARQUEUR</button><button onClick={() => addArrangementMarker('drop')}>DROP</button><button onClick={removeLastMarker}>SUPPR. MARQ.</button><button onClick={duplicateClip}>DUPLIQUER</button><button onClick={deleteClip}>SUPPRIMER</button><button onClick={() => selectedClip && updateClip(selectedClip.id, { reversed: !selectedClip.reversed })}>INVERSER</button><button onClick={cutAtPlayhead}>COUPER</button><button onClick={() => selectedClip && updateClip(selectedClip.id, { normalized: !selectedClip.normalized })}>NORMALISER</button><button onClick={setLoopStartAtPlayhead}>A</button><button onClick={setLoopEndAtPlayhead}>B</button><button onClick={() => setLoopEnabled(v => !v)}>{loopEnabled ? 'LOOP ON' : 'LOOP OFF'}</button><button onClick={setLoopFromSelection}>LOOP SÉLECTION</button><button onClick={copySelection}>COPIER</button><button onClick={cutSelectionToClipboard}>COUPER SÉL.</button><button onClick={pasteSelection}>COLLER</button><button onClick={deleteSelectedRegion}>SUPPRIMER SÉL.</button><button onClick={() => zoomWave(-0.5)}>ZOOM WAVE -</button><button onClick={() => zoomWave(0.5)}>ZOOM WAVE +</button><button onClick={() => zoomTimeline(-1)}>ZOOM TL -</button><button onClick={() => zoomTimeline(1)}>ZOOM TL +</button><button onClick={trimStart}>TRIM ◀</button><button onClick={trimEnd}>TRIM ▶</button><button onClick={() => setMetronome(v => !v)}>{metronome ? 'MÉTRONOME ON' : 'MÉTRONOME OFF'}</button><span>{status}</span></div>

        {selectedClip && <div className="toolbar panel clip-editor">
          <label>Piste <select value={selectedClip.trackId} onChange={e => moveClipToTrack(e.target.value)}>{tracks.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
          <label>Volume <input type="range" min="0" max="1.5" step="0.01" value={selectedClip.volume} onChange={e => updateClip(selectedClip.id, { volume: Number(e.target.value) })}/></label>
          <label>Tonalité {selectedClip.pitch} st <input type="range" min="-12" max="12" step="1" value={selectedClip.pitch} onChange={e => updateClip(selectedClip.id, { pitch: Number(e.target.value) })}/></label>
          <label>Fondu entrée {selectedClip.fadeIn.toFixed(1)}s <input type="range" min="0" max="5" step="0.1" value={selectedClip.fadeIn} onChange={e => updateClip(selectedClip.id, { fadeIn: Number(e.target.value) })}/></label>
          <label>Fondu sortie {selectedClip.fadeOut.toFixed(1)}s <input type="range" min="0" max="5" step="0.1" value={selectedClip.fadeOut} onChange={e => updateClip(selectedClip.id, { fadeOut: Number(e.target.value) })}/></label><label>Position {formatTime(selectedClip.timelineStart ?? 0)}<input type="range" min="0" max={timelineDuration} step={timelineStep} value={selectedClip.timelineStart ?? 0} onChange={e => setSelectedClipTimelineStart(Number(e.target.value))}/></label><button onClick={() => moveSelectedClip(-timelineStep)}>◀ CLIP</button><button onClick={() => moveSelectedClip(timelineStep)}>CLIP ▶</button><button onClick={() => resizeSelectedClip('start', timelineStep)}>DÉBUT +</button><button onClick={() => resizeSelectedClip('end', -timelineStep)}>FIN -</button><label>Grille <select value={beatDivision} onChange={e => setBeatDivision(e.target.value as BeatDivision)}><option value="1/1">Mesure</option><option value="1/2">1/2 temps</option><option value="1/4">1/4 temps</option><option value="1/8">1/8 temps</option></select></label><label>Offset {formatTime(beatGridOffset)}<input type="range" min="0" max={Math.max(0.1, selectedLength)} step="0.01" value={beatGridOffset} onChange={e => setBeatGridOffset(Number(e.target.value))}/></label><button onClick={quantizeSelectionToGrid}>QUANTIFIER SÉL.</button>
        </div>}

        <div className="timeline panel timeline-v33 timeline-v34 timeline-v35" onWheel={e => { if (e.ctrlKey) { e.preventDefault(); zoomTimeline(e.deltaY > 0 ? -1 : 1); } }} onClick={e => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left + e.currentTarget.scrollLeft - 88;
          seekProjectTime(x / timelineZoom);
        }}>
          <div className="timeline-canvas" style={{ width: `${timelineDuration * timelineZoom}px` }}>
            <div className="project-cursor" style={{ left: `${projectPosition * timelineZoom}px` }} />
            <div className="ruler" style={{ width: `${timelineDuration * timelineZoom}px` }}>{Array.from({ length: Math.ceil(timelineDuration / 4) + 1 }).map((_, i) => <span key={i}>{formatTime(i * 4)}</span>)}</div>
            {tracks.map((track) => <div className="track" key={track.id}><button className={`track-name ${selectedTrackId === track.id ? 'sel' : ''}`} onClick={() => setSelectedTrackId(track.id)}>{track.name}</button><div className="clips timeline-clips" style={{ width: `${timelineDuration * timelineZoom}px` }}>{clips.filter(clip => clip.trackId === track.id).map((clip) => <button key={`${track.id}-${clip.id}`} onMouseDown={e => startDragClip(e, clip)} onDoubleClick={e => { e.stopPropagation(); quickFadeClip(clip); }} className={`clip clip-v35 ${selectedId === clip.id ? 'sel' : ''}`} style={{ width: `${Math.max(70, Math.max(0.25, clip.end - clip.start) * timelineZoom)}px`, left: `${Math.max(0, clip.timelineStart ?? 0) * timelineZoom}px` }} title={`Glisser = déplacer · double-clic = fondus rapides · Shift+poignée = inverser le sens · début ${formatTime(clip.timelineStart ?? 0)} · durée ${formatTime(clip.end - clip.start)}`}><i className="clip-handle left" onMouseDown={e => trimClipByHandle(e, clip, 'start')} /> <span>{clip.name}</span><i className="clip-handle right" onMouseDown={e => trimClipByHandle(e, clip, 'end')} /></button>)}</div></div>)}
          </div>
        </div>

        <div className="bottom-grid">
          <div className="panel piano piano-v36"><div className="piano-head"><h3>PIANO ROLL V38</h3><select value={pianoInstrument} onChange={e => setPianoInstrument(e.target.value as PianoInstrument)}>{(['Piano','Piano électrique','Rhodes','Orgue','Basse','Guitare','Strings','Brass','Pad','Lead','Kompa Kit','Afro Kit','Maloya Kit','Sega Kit','Bouyon Kit'] as PianoInstrument[]).map(inst => <option key={inst} value={inst}>{inst}</option>)}</select><select value={quantizeValue} onChange={e => setQuantizeValue(e.target.value as QuantizeValue)}><option value="1/4">1/4</option><option value="1/8">1/8</option><option value="1/16">1/16</option><option value="1/32">1/32</option></select><button onClick={playPianoPattern}>{pianoPlaying ? 'STOP MIDI' : 'JOUER MIDI'}</button><button onClick={quantizeMidiNotes}>QUANTIFIER</button><button onClick={duplicateSelectedMidiNote}>DUPLIQUER</button><button onClick={deleteSelectedMidiNote}>SUPPRIMER</button></div><div className="piano-grid-wrap"><div className="piano-keys">{pianoNotes.map(note => <span key={note}>{note}</span>)}</div><div className="piano-grid-v36" ref={pianoRollRef} onDoubleClick={createMidiNoteFromPointer}>{Array.from({ length: 16 }).map((_, i) => <b key={i} className="piano-beat" style={{ left: `${(i / 16) * 100}%` }}>{i + 1}</b>)}{midiNotes.map(note => <button key={note.id} className={`midi-note ${note.selected ? 'sel' : ''}`} onClick={e => { e.stopPropagation(); selectMidiNote(note.id); playMidiNote(note); }} style={{ left: `${(note.start / pianoBeats) * 100}%`, top: `${((pianoPitchTop - note.pitch) / pianoNotes.length) * 100}%`, width: `${(note.duration / pianoBeats) * 100}%` }} title="Clic = écouter/sélectionner"><span>{note.pitch}</span><i onClick={e => { e.stopPropagation(); moveMidiNote(note.id, -pianoStep); }}>◀</i><i onClick={e => { e.stopPropagation(); resizeMidiNote(note.id, pianoStep); }}>▶</i></button>)}</div></div><div className="velocity-lane">{midiNotes.map(note => <label key={note.id} className={note.selected ? 'sel' : ''} style={{ left: `${(note.start / pianoBeats) * 100}%`, width: `${Math.max(3, (note.duration / pianoBeats) * 100)}%` }}><input type="range" min="1" max="127" value={note.velocity} onChange={e => updateMidiVelocity(note.id, Number(e.target.value))}/><span>{note.velocity}</span></label>)}</div><p className="piano-help">Double-clic dans la grille = créer une note · Clic note = écouter · ◀ déplacer · ▶ allonger · vélocité en bas.</p></div>
          <div className="panel sequencer"><h3>SÉQUENCEUR</h3><div className="seq-actions"><button onClick={() => setSequencerPlaying(v => !v)}>{sequencerPlaying ? 'STOP SÉQUENCE' : 'JOUER SÉQUENCE'}</button><button onClick={applyStyleSequence}>GROOVE STYLE</button><button onClick={resetSequence}>RESET</button><button onClick={exportSequenceWav}>EXPORTER LOOP</button></div>{sequenceRows.map(r => <div className="seq-row" key={r}><span>{r}</span>{Array.from({length:16}).map((_,i)=><button key={i} onClick={() => toggleSequenceStep(r, i)} className={`${sequence[r][i] ? 'on' : ''} ${sequencerPlaying && sequencerStep === i ? 'play' : ''}`}/>)}</div>)}</div>
          <div className="panel sampler-v37"><div className="sampler-head"><h3>SAMPLER V38</h3><button onClick={() => padFileInputRef.current?.click()}>CHARGER</button><button onClick={assignSelectedClipToPad}>CLIP → PAD</button><button onClick={clearSelectedPad}>VIDER</button><input ref={padFileInputRef} type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aiff,.aif" hidden onChange={e => onPadFileSelected(e.target.files)}/></div><div className="pad-grid-v37">{samplerPads.map(pad => <button key={pad.id} className={`sample-pad ${selectedPadId === pad.id ? 'sel' : ''} ${pad.url ? 'loaded' : ''}`} onClick={() => { setSelectedPadId(pad.id); playPad(pad.label); }}><strong>{pad.label}</strong><span>{pad.fileName ? pad.fileName.replace(/\.[^.]+$/, '').slice(0, 16) : 'synth interne'}</span><em>{pad.waveform.map((bar, i) => <i key={i} style={{ height: `${bar * 100}%` }} />)}</em></button>)}</div>{samplerPads.find(pad => pad.id === selectedPadId) && <div className="pad-editor-v37"><label>Nom<input value={samplerPads.find(pad => pad.id === selectedPadId)?.label ?? ''} onChange={e => renameSelectedPad(e.target.value)}/></label><label>Volume<input type="range" min="0" max="1" step="0.01" value={samplerPads.find(pad => pad.id === selectedPadId)?.volume ?? 1} onChange={e => updateSelectedPad({ volume: Number(e.target.value) })}/></label><label>Pitch {samplerPads.find(pad => pad.id === selectedPadId)?.pitch ?? 0} st<input type="range" min="-12" max="12" step="1" value={samplerPads.find(pad => pad.id === selectedPadId)?.pitch ?? 0} onChange={e => updateSelectedPad({ pitch: Number(e.target.value) })}/></label><label>Attaque<input type="range" min="0.01" max="0.5" step="0.01" value={samplerPads.find(pad => pad.id === selectedPadId)?.attack ?? 0.01} onChange={e => updateSelectedPad({ attack: Number(e.target.value) })}/></label><label>Relâchement<input type="range" min="0.05" max="1.5" step="0.01" value={samplerPads.find(pad => pad.id === selectedPadId)?.release ?? 0.22} onChange={e => updateSelectedPad({ release: Number(e.target.value) })}/></label></div>}<p className="sampler-help">Clique un pad pour l’écouter · CHARGER = importer un sample · CLIP → PAD = utiliser le clip sélectionné.</p></div>
        </div>
      </section>

      <aside className="right">
        <div className="panel analyzer"><h3>ANALYSE V35</h3><strong>{bpm.toFixed(2)} BPM</strong><p>Tonalité : {detectedKey} · confiance {keyConfidence}%</p><p>Grille : {beatDivision} · offset {formatTime(beatGridOffset)} · {beatGridLocked ? 'verrouillée' : 'libre'}</p><button onClick={() => setBeatGridLocked(v => !v)}>{beatGridLocked ? 'DÉVERROUILLER GRILLE' : 'VERROUILLER GRILLE'}</button><div className="marker-list">{visibleArrangementMarkers.length ? visibleArrangementMarkers.map(marker => <button key={marker.id} onClick={() => seek(marker.time / Math.max(1, selectedLength))}>{marker.label} · {formatTime(marker.time)}</button>) : <span>Aucun marqueur.</span>}</div></div>
        <div className="panel converter"><h3>🔥 REMIX AUTOMATIQUE</h3><select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)}>{styles.map(s => <option key={s}>{s}</option>)}</select><button onClick={prepareAutoRemix}>METTRE LE FEU</button><p className="analysis-note">{analysisText}</p><div className="chips">{styles.map(s => <span key={s} onClick={() => setSelectedStyle(s)}>{s}</span>)}</div></div>
        <div className="panel mixer"><h3>MIXEUR</h3>{tracks.slice(0,6).map((track, i) => <div className="strip" key={track.id}><label>{track.name}</label><input type="range" min="0" max="1" step="0.01" value={track.id === selectedTrack?.id ? selectedTrack.volume : track.volume} onChange={e => updateTrack(track.id, { volume: Number(e.target.value) })}/><div className="meter"><i style={{height:`${track.mute ? 0 : 35+i*8}%`}}/></div><button className={track.mute ? 'active' : ''} onClick={() => updateTrack(track.id, { mute: !track.mute })}>M</button><button className={track.solo ? 'active' : ''} onClick={() => updateTrack(track.id, { solo: !track.solo })}>S</button></div>)}<div className="master-strip"><label>MASTER</label><input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={e => updateMaster(Number(e.target.value))}/></div></div>
        <div className="panel effects"><h3>EFFETS MASTER</h3><div className="eqline"/><label>GRAVE {eqLow} dB<input type="range" min="-12" max="12" step="1" value={eqLow} onChange={e => setEqLow(Number(e.target.value))}/></label><label>MÉDIUM {eqMid} dB<input type="range" min="-12" max="12" step="1" value={eqMid} onChange={e => setEqMid(Number(e.target.value))}/></label><label>AIGU {eqHigh} dB<input type="range" min="-12" max="12" step="1" value={eqHigh} onChange={e => setEqHigh(Number(e.target.value))}/></label><label>ÉCHO {delayMix.toFixed(2)}<input type="range" min="0" max="0.7" step="0.01" value={delayMix} onChange={e => setDelayMix(Number(e.target.value))}/></label><button className={compressorOn ? 'active' : ''} onClick={() => setCompressorOn(v => !v)}>COMPRESSEUR {compressorOn ? 'ON' : 'OFF'}</button></div>
      </aside>
    </section>

    <section className="transport"><button onClick={() => selectRelativeClip(-1)}>⏮</button><button onClick={stop}>■</button><button className="play" onClick={playPause}>{playing ? 'PAUSE' : 'PLAY'}</button><button onClick={() => selectRelativeClip(1)}>⏭</button><strong>{formatTime(projectPosition)}</strong><input className="transport-progress" type="range" min="0" max={timelineDuration} step="0.01" value={projectPosition} onChange={e => seekProjectTime(Number(e.target.value))}/><span>Projet {formatTime(projectPosition)} / {formatTime(timelineDuration)} · {bpm.toFixed(1)} → {targetBpm.toFixed(1)} BPM · mixer actif · V38 banque instruments</span></section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
