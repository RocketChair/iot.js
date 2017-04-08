const SerialPort = require('serialport');
const WebSocket = require('ws');
const ZdrowietonMessagingClient = require('zdrowieton');

//
// Init libs
//
const ws = new WebSocket('wss://rocket-chair.herokuapp.com');
const mc = new ZdrowietonMessagingClient({ appId: 'RocketChair' });
const sp = new SerialPort('/dev/cu.usbmodem1411', {
    parser: SerialPort.parsers.readline('\n'),
    baudRate: 115200
});



//
// Init global variables
//
let socketReady = 0;
let serialReady = 0;
let lastNotifySend = (new Date()).getTime();
let lastAlertGet = (new Date()).getTime();


//
// Checking for tips
//

const sendTips = (tip) => {
    ws.send(JSON.stringify({ type: 'tips', data: tip }));
    sp.write(new Buffer('CMD:ALERT\n'));
    console.log('TIPS -> ' + tip);
    lastNotifySend = (new Date()).getTime();
}

const checkIsTemperatureGood = (temperature) => {
    if (temperature < 18) {
        sendTips('TO_COLD');
    }

    if (temperature > 30) {
        sendTips('TO_HOT');
    }
}

const checkLightIsGood = (light) => {
    if (light < 100) {
        sendTips('TO_DARK');
    }

    if (light > 1000) {
        sendTips('TO_BRIGHT');
    }
}

//
// Utils
//

const canRunAlert = () => {
    return lastAlertGet + (1000 * 60 * 1) < (new Date()).getTime();
}

const canSendTips = () => {
    return lastNotifySend + (1000 * 60 * 1) < (new Date()).getTime();
}

const sendDataToSocket = (data) => {
    data = JSON.parse(data);
    data.timestamp = (new Date()).getTime();

    if (canSendTips()) {
        checkIsTemperatureGood(data.temperature);
        checkLightIsGood(data.light);
    }

    let result = { type: 'data', source: 'iot', data };
    ws.send(JSON.stringify(result));
    mc.sendMessage('sensors', JSON.stringify(result));
}

//
// Read messages from socket
//
ws.on('message', function incoming(data, flags) {
    data = JSON.parse(data);

    if (data.message === 'PING') {
        console.log('WS-> PING');
        sp.write(new Buffer('CMD:READ\n'));
    }

    if (data.type === 'ALERT') {
        if (canRunAlert()) {
            console.log('WS-> ALERT');
            sp.write(new Buffer('CMD:ALERT\n'));
            lastAlertGet = (new Date()).getTime();
        }
    }
});

//
// Open serial port and then open socket
//
sp.on('open', () => {
    console.log('Serial port Opened');
    serialReady = 1;
    ws.on('open', () => {
        socketReady = 1;
        console.log('Socket open');
    });
});

//
// Wait for data on serial port
//
sp.on('data', (data) => {
    if (data.indexOf('{') === 0) {
        sendDataToSocket(data);
    } else {
        console.log('CMD -> ', data);
    }
});