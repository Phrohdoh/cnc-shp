#!/usr/bin/env node

'use strict';

let args = process.argv.slice(2),
    Promise = require('bluebird'),
    shp = require('./cnc-shp-parser');

Promise.map(args, function(filename) {
    return shp.parseShpAsync(filename)
}).then(files => {
    for (let file of files) {
        console.log(file)
        for (let frame of file)
            console.log(frame.size)
    }
}).catch(err => {
    console.log('ERR: ' + err)
});
