const midi = require('midi');
const readline = require('readline');

const output = new midi.Output();
var portCount = output.getPortCount();
const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

var notes = [];
var currentStep = 1;
var maxSteps = 4;
var stepDelay = 250;
const midiEvent = 144;

console.log("Available MIDI devices:");
for (var i = 0; i < portCount; i++) {
  console.log(i + ': ' + output.getPortName(i));
}

// Set the appropriate device number here
var deviceNumber = 0;
output.openPort(deviceNumber);

console.log('Opened ' + output.getPortName(deviceNumber) +  '. Waiting for input.');

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

input.on('line', (input) =>{
  console.log('Received: ' + input);
  notes[currentStep] = input;

  // Parse the input into a set of notes
  // 144 is channel 1 out
  // Map from C2 - C6
  notes[0] = Math.round(scale(input.substr(0, 2), 0, 100, 36, 84));
  notes[1] = Math.round(scale(input.substr(2, 2), 0, 100, 36, 84));
  notes[2] = Math.round(scale(input.substr(4, 2), 0, 100, 36, 84));
  notes[3] = Math.round(scale(input.substr(6, 2), 0, 100, 36, 84));

  console.log('1:' + notes[0] + ' 2:' + notes[1] + ' 3:' + notes[2] + ' 4:' + notes[3]);
});

const start = async () => {
  await asyncLoop(notes, async (num) => {
    await waitFor(stepDelay);

    var previousStep = currentStep - 1;
    if (previousStep < 0) {
      previousStep = maxSteps - 1;
    }

    // Stop previous note
    output.sendMessage([midiEvent, notes[previousStep], 0]);

    // Play note stored at the position in the array
    output.sendMessage([midiEvent, notes[currentStep], num]);
    // console.log(num);
  });
}


// output.sendMessage([176,22,1]);
// output.closePort();

const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

async function asyncLoop(array, callback) {
  do {
    await callback(array[currentStep - 1], currentStep - 1, notes);
    currentStep += 1;
    if (currentStep > maxSteps) {
      currentStep = 1;
    }
  } while (true);
}

start();