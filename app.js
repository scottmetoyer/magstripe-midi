const midi = require('midi');
const readline = require('readline');

var outputMidiDeviceNumber = 0;
var inputMidiDeviceNumber = 1;

const midiOutput = new midi.Output();
const midiInput = new midi.Input();
const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
var stepDelay = 1000;
var isPlaying = false;
var lastClockPulse = new Date();
const midiEvent = 144;

console.log("Available MIDI output devices:");
enumerateMidiDevices(midiOutput);
console.log("Available MIDI input devices:");
enumerateMidiDevices(midiInput);

// Initialize MIDI inputs and outputs
midiOutput.openPort(outputMidiDeviceNumber);
midiInput.openPort(inputMidiDeviceNumber);

// Enable MIDI clock
midiInput.ignoreTypes(true, false, true);

console.log('Opened ' + midiOutput.getPortName(outputMidiDeviceNumber) +  ' for output.');
console.log('Opened ' + midiInput.getPortName(inputMidiDeviceNumber) +  ' for input.');

// Configure a MIDI input callback
midiInput.on('message', (deltaTime, message) => {
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  // console.log(`m: ${message} d: ${deltaTime}`);

  // Handle MIDI clock
  if (message == 248) {
    var currentTime = new Date();
    var elapsed = currentTime - lastClockPulse;
    stepDelay = elapsed * 24; // Multiply by 24 to get quarter note time from ppqn
    lastClockPulse = currentTime;
  }

  // Handle start and continue
  if (message == 250 || message == 251) {
    console.log('Sequencer is playing')
    isPlaying = true;
  }

  // Handle stop
  if (message == 252) {
    console.log('Sequencer is stopped')
    isPlaying = false;
  }
});

const consoleInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

consoleInput.on('line', (input) =>{
  // Parse the input into a set of notes
  // 144 is channel 1 out
  // Map from C2 - C6
  var seq = initSequence();

  // Fill the sequence with notes mapped from the input string
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

    if (note && isPlaying) {
      // Play note stored at the position in the array
      console.log('Playing step ' + step + ': ' + note);

      midiOutput.sendMessage([midiEvent, note, 127]);
      // setTimeout(noteOff, 10, note); // 5 millisecond delay? Not sure if this is acceptable.
    }
  });
}

function enumerateMidiDevices(device) {
  var portCount = device.getPortCount();

  for (var i = 0; i < portCount; i++) {
    console.log(i + ': ' + device.getPortName(i));
  }
}

function noteOff(note) {
  midiOutput.sendMessage([128, note, 0]);
}

function initSequence() {
  var seq = {};
  seq.notes = [];
  seq.step = 0;
  seq.probability = 100;

  // Create a sequence between 3 and 6 steps long, fill it up with mapped midi data from the scan
  seq.length = getRandom(3, 7);

  return seq;
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