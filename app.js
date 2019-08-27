const midi = require('midi');
const readline = require('readline');

const output = new midi.Output();
var portCount = output.getPortCount();
const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

var notes = [];
var currentStep = 0;
var maxSteps = 6;
var stepDelay = 250;
const midiEvent = 144;

console.log("Available MIDI devices:");
for (var i = 0; i < portCount; i++) {
  console.log(i + ': ' + output.getPortName(i));
}

// Set the appropriate device number here
var deviceNumber = 2;
output.openPort(deviceNumber);

console.log('Opened ' + output.getPortName(deviceNumber) +  '. Waiting for input.');

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

input.on('line', (input) =>{
  console.log('Received input');

  // Parse the input into a set of notes
  // 144 is channel 1 out
  // Map from C2 - C6
  notes[0] = Math.round(scale(input.substr(4, 2), 0, 100, 48, 84));
  notes[1] = Math.round(scale(input.substr(5, 2), 0, 100, 48, 84));
  notes[2] = Math.round(scale(input.substr(6, 2), 0, 100, 48, 84));
  notes[3] = Math.round(scale(input.substr(7, 2), 0, 100, 48, 84));
  notes[4] = Math.round(scale(input.substr(8, 2), 0, 100, 48, 84));
  notes[5] = Math.round(scale(input.substr(9, 2), 0, 100, 48, 84));

  console.log('1:' + notes[0] + ' 2:' + notes[1] + ' 3:' + notes[2] + ' 4:' + notes[3]);
});

const start = async () => {
  await asyncLoop(notes, async (num) => {
    await waitFor(stepDelay);

    if (notes[currentStep]) {
      // Play note stored at the position in the array
      console.log('Play step ' + currentStep + ': ' + notes[currentStep]);

      output.sendMessage([midiEvent, notes[currentStep], 127]);
      var note = notes[currentStep];
      setTimeout(noteOff, 10, note);
    }
    // console.log(num);
  });
}

function noteOff(note) {
  output.sendMessage([128, note, 0]);
}


// output.sendMessage([176,22,1]);
// output.closePort();

const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

async function asyncLoop(array, callback) {
  do {
    await callback(array[currentStep], currentStep, notes);
    currentStep += 1;
    if (currentStep == maxSteps) {
      currentStep = 0;
    }
  } while (true);
}

start();