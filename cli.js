#!/usr/bin/env node

'use strict';

let args = require('yargs')
    .help('h').alias('h', 'help')
    .usage('Usage: $0 [flags] <file1.shp> [file2.shp [file3.shp [... ]]]')
    .epilogue('Copyright Taryn Hill <Phrohdoh@gmail.com> 2016')

    .alias('e', 'export').array('e')
    .describe('export', 'Output JSON for the given properties\n  for each frame parsed')
    .example('$0 <myfile.shp> -e size offset data')
    .argv,

    Promise = require('bluebird'),
    shp = require('./cnc-shp');

console.log(args.e);

Promise.map(args._, function(filename) {
    return shp.parseShpAsync(filename)
}).then(files => {
    files.forEach(function(file) {
        file.forEach(function(frame) {
            args.e.forEach(function(prop) {
                if (frame[prop])
                    console.log(JSON.stringify(frame[prop]));
            });
        });
    });
}).catch(err => {
    console.log('ERR: ' + err)
});
