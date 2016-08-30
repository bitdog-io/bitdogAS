﻿// Extension will inherit functions from ExtensionBase
// Make sure the path to extensionBase is correct 
var ExtensionBase = require('../lib/extensionBase.js');
var util = require('util');

// Example Raspberry PI I/O library
var rpio = require('rpio');

// By default the rpio module will use /dev/gpiomem 
// when using simple GPIO access. 
// To access this device, your user will 
// need to be a member of the gpio group, 
// and you may need to configure udev with the following rule (as root):

//$ cat >/etc/udev/rules.d/20-gpiomem.rules << EOF
//SUBSYSTEM=="bcm2835-gpiomem", KERNEL=="gpiomem", GROUP="gpio", MODE="0660"
//EOF

// Create a class called Extension
// This can be any name, give it a good one.
function Extension() {
    // Initialize a variable to hold button state
    this.buttonState = 'unknown';
}

// Extension inherits from ExtensionBase
util.inherits(Extension, ExtensionBase);

// Messages from and to this hub will pass through this function. 
// A good spot to watch for Z-Wave messages
Extension.prototype.onMessage = function (message, configuration, logger) {

    // Messages will go through here, check them and do something.
    //logger.log('User', 'Got message and handling', message);

};

// This function will be called once during initialization.
// Setup command and data capture here.
Extension.prototype.onInitialize = function (configuration, logger) {
    var self = this;

    // Create a custom message schema with one string property.
    var onOffMessageSchema = this.createMessageSchema('OnOff')
        .addStringProperty('value', 'off', { values: ['on', 'off'] });

    // Open a GPIO pin for our LED, initialize to off.
    rpio.open(12, rpio.OUTPUT, rpio.LOW);
    // Open a GPIO pin for our switch
    rpio.open(15, rpio.INPUT, rpio.PULL_DOWN);

    // Create a callback function for the rpio polling routine
    function pollcb(pin) {
        // Read the state of the switch pin
        var newState = rpio.read(pin) ? 'on' : 'off';

        // If the switch pin has transitioned to a new value...
        if (newState !== self.buttonState) {
            // Set the variable 
            self.buttonState = newState;

            // Send a message to the cloud about our new switch state.
            bitdogClient.sendData('Switch Status', onOffMessageSchema, function (message) {
                message.value = self.buttonState;
            });
        }
    }

    // The the rpio library to poll our callback function every 15 milliseconds
    // Just an example way to do it. First way
    rpio.poll(15, pollcb);

    // Add a command to this hub that turns the LED on and off
    this.addCommand('Turn LED on/off', onOffMessageSchema, function (message, configuration, logger) {

        // If the message contains 'off' set the GPIO pin high - depends on how the LED is wired to the GPIO pins
        if (message.value === 'off') {
            rpio.write(12, rpio.HIGH);
        } else {
            // Or turn on the LED by setting the pin low.
            rpio.write(12, rpio.LOW);
        }
        
    });

    // Register data collector and set it to poll every 60 seconds. Second way
    // Set seconds to -1 to not poll at all. 
    this.addDataCollector('Switch Status', onOffMessageSchema, 60000, function (message, configuration, logger) {
        message.value = self.buttonState;
    });
};

// Export your Extension class so it can be loaded by the framework
module.exports = Extension;



