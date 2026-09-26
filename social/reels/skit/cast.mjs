// The Table Edition cast: Open Peeps (CC0, via DiceBear), one SVG per character per expression.
import { createAvatar } from '@dicebear/core';
import { openPeeps } from '@dicebear/collection';

const peep = (seed, o) => createAvatar(openPeeps, { seed, facialHairProbability: 0, accessoriesProbability: 0, maskProbability: 0, ...o }).toString();
const person = (seed, base, faces) => Object.fromEntries(faces.map((f) => [f, peep(seed, { ...base, face: [f] })]));
const FACES = ['calm', 'smile', 'smileBig', 'explaining', 'fear', 'concernedFear', 'suspicious', 'awe', 'hectic', 'cheeky', 'blank', 'serious', 'lovingGrin1'];

export function cast() {
  return {
    ayesha: person('Ayesha', { head: ['long'], skinColor: ['f2d3b1'], clothingColor: ['b5371f'] }, FACES),
    madam: person('Ayesha', { head: ['bun'], skinColor: ['f2d3b1'], clothingColor: ['1a1714'], accessories: ['glasses4'], accessoriesProbability: 100 }, ['rage', 'veryAngry', 'angryWithFang', 'serious', 'explaining', 'suspicious']),
    sara: person('Sara', { head: ['hijab'], skinColor: ['edb98a'], clothingColor: ['e8a33d'] }, FACES),
    hamza: person('Hamza', { head: ['short2'], skinColor: ['d08b5b'], clothingColor: ['2f5d62'] }, FACES),
    zain: person('Zain', { head: ['short4'], skinColor: ['ae5d29'], clothingColor: ['6b4e9b'], facialHair: ['full'], facialHairProbability: 100 }, FACES),
  };
}
