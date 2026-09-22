export const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const SCALES={
  chromatic:{name:'Chromatic',intervals:[0,1,2,3,4,5,6,7,8,9,10,11]},
  major:{name:'Major',intervals:[0,2,4,5,7,9,11]},
  minor:{name:'Natural minor',intervals:[0,2,3,5,7,8,10]},
  harmonicMinor:{name:'Harmonic minor',intervals:[0,2,3,5,7,8,11]},
  dorian:{name:'Dorian',intervals:[0,2,3,5,7,9,10]},
  mixolydian:{name:'Mixolydian',intervals:[0,2,4,5,7,9,10]},
  lydian:{name:'Lydian',intervals:[0,2,4,6,7,9,11]},
  phrygian:{name:'Phrygian',intervals:[0,1,3,5,7,8,10]},
  majorPent:{name:'Major pentatonic',intervals:[0,2,4,7,9]},
  minorPent:{name:'Minor pentatonic',intervals:[0,3,5,7,10]},
  blues:{name:'Blues',intervals:[0,3,5,6,7,10]},
  wholeTone:{name:'Whole tone',intervals:[0,2,4,6,8,10]},
};
const solfege=['DO','RA','RE','ME','MI','FA','FI','SO','LE','LA','TE','TI'];
export const SPECTRUM=['#ff5145','#ff7036','#ff9d31','#ffc13a','#f4e34d','#9cdd4b','#4bcb7d','#33b8cd','#4088e5','#6262dd','#8c5cde','#b855da','#e363d2'];
export function normalizeGrid(value={}){
  return {scale:SCALES[value?.scale]?value.scale:'chromatic',root:Number.isInteger(value?.root)&&value.root>=0&&value.root<12?value.root:0,octave:Number.isInteger(value?.octave)&&value.octave>=2&&value.octave<=5?value.octave:3};
}
export function scalePads(settings){
  const {scale,root,octave}=normalizeGrid(settings),steps=SCALES[scale].intervals;
  return Array.from({length:13},(_,i)=>{
    const interval=steps[i%steps.length],offset=(octave-4)*12+root+interval+12*Math.floor(i/steps.length);
    const midi=60+offset,pitch=midi%12;
    return {offset,name:NOTE_NAMES[pitch],octave:Math.floor(midi/12)-1,solfege:solfege[interval],color:SPECTRUM[i],sharp:[1,3,6,8,10].includes(pitch)};
  });
}
