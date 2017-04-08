const SerialPort = require('serialport');

const port = new SerialPort('/dev/cu.usbmodem1411', {
    parser: SerialPort.parsers.readline('\n')
});

port.on('open', function() {
    console.log('Serial port Opened');
});

port.on('data', (data) => {
    console.log('data -> ', data);
});