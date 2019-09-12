const midi = require('midi');
const readline = require('readline');

const output = new midi.Output();
var portCount = output.getPortCount();
const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

var stepDelay = 1000;
const midiEvent = 144;

console.log("Available MIDI devices:");
for (var i = 0; i < portCount; i++) {
  console.log(i + ': ' + output.getPortName(i));
}

// Set the appropriate device number here
var deviceNumber = 1;
output.openPort(deviceNumber);

console.log('Opened ' + output.getPortName(deviceNumber) +  '. Waiting for input.');

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

input.on('line', (input) =>{
  // Parse the input into a set of notes
  // 144 is channel 1 out
  // Map from C2 - C6
  var seq = {};
  seq.notes = [];
  seq.step = 0;

  // Create a sequence between 3 and 6 steps long, fill it up with mapped midi data from the scan
  seq.length = getRandom(3, 7);

  for (var x = 0; x < seq.length; x++) {
    seq.notes[x] = Math.round(scale(input.substr(x + 4, 2), 0, 100, 48, 84));
  }

  start(seq);
});

const start = async (seq) => {
  console.log('Starting sequence:');
  console.log(seq);

  await asyncLoop(seq, async (note, step) => {
    await waitFor(stepDelay);

    if (note) {
      // Play note stored at the position in the array
      console.log('Playing step ' + step + ': ' + note);

      output.sendMessage([midiEvent, note, 127]);
      setTimeout(noteOff, 5, note); // 5 millisecond delay? Not sure if this is acceptable.
    }
  });
}

function noteOff(note) {
  output.sendMessage([128, note, 0]);
}

// output.sendMessage([176,22,1]);
// output.closePort();

// Return a random integer between min (inclusive) and max (exclusive)
function getRandom(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

async function asyncLoop(seq, callback) {
  do {
    await callback(seq.notes[seq.step], seq.step);
    seq.step += 1;
    if (seq.step == seq.length) {
      seq.step = 0;
    }
  } while (true);
}