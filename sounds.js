import {createSoundEngine} from './sound-engine.js';
const engine=createSoundEngine({makeContext:()=>{const Audio=window.AudioContext||window.webkitAudioContext;return Audio?new Audio({latencyHint:'interactive'}):null;},visible:()=>document.visibilityState!=='hidden'});
export const primeSound=()=>engine.prime();
export const setSoundEnabled=value=>engine.setEnabled(value);
export const playSound=(kind='tap')=>engine.play(kind);
