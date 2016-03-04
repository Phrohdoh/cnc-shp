#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    ts = require('./shp-ts');
var args = process.argv.slice(2);

String.prototype.f = function() {
    var util = require('util')
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.valueOf());
    return util.format.apply(util, args);
}

function getLoaderForBuffer(filename, stats, fd, rawBuff) {
    return [ts].find(function(loader, index, thisArr) {
        var validity = loader.isValidShp(filename, stats, fd, rawBuff);
        if (validity.isValid)
            return true;
    });
}

function readFile(filename, stats, fd) {
    var rawBuff = new Buffer(stats.size);
    fs.read(fd, rawBuff, 0, rawBuff.length, null, function(err, bytesRead, rawBuff) {
        let loader = getLoaderForBuffer(filename, stats, fd, rawBuff);
        if (!loader)
            throw new Error('Could not find a loader for %s'.f(filename));

        console.log('Found loader %s for %s'.f(loader, filename));
        let frames = loader.parseFrames(rawBuff);
        console.log('Parsed %s frame(s).'.f(frames.length));
    });
}

function openFile(filename, stats) {
    fs.open(filename, 'r', function(err, fd) {
        if (err) throw err;
        readFile(filename, stats, fd);
    });
}

exports.parseShp = function(filename) {
    fs.exists(filename, function(exists) {
        if (!exists)
            throw new Error('%s does not exist.'.f(filename));

        fs.stat(filename, function(err, stats) {
            if (err) throw err;
            openFile(filename, stats);
        });
    });
}

for (let i = 0; i < args.length; i++)
    parseShp(args[i]);
