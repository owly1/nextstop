import fs from 'node:fs';
import {buildCandidates} from '../dist/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const corridors=buildCandidates(read('ttc-network.json'),read('ttc-stops.json'));
if(!process.argv[2])throw new Error('Pass an output JSON path');
fs.writeFileSync(process.argv[2],JSON.stringify(corridors.map(c=>({id:c.id,coordinates:c.coordinates}))));
