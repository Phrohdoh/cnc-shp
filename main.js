#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    binaryParser = require('binary-buffer-parser');

var args = process.argv.slice(2);

String.prototype.f = function() {
    var util = require('util')
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.valueOf());
    return util.format.apply(util, args);
}

function parseBuffer(filename, stats, fd, rawBuff, readBuff) {
    var validity = isValidShpTS(filename, stats, fd, rawBuff, readBuff);
    if (!validity.isValid)
        console.log('%s is invalid:\n%s'.f(filename, validity.msg));
}

function isValidShpTS(filename, stats, fd, rawBuff, readBuff) {
    var start = readBuff.tell();

    var first2Bytes = readBuff.uint16();
    if (first2Bytes !== 0) {
        var pos = readBuff.tell();
        readBuff.seek(start);
        return {
            isValid: false,
            msg: 'At %s:\nexpected %s got %s'.f(pos, 0, first2Bytes)
        };
    }

    readBuff.skip(4);
    var frameCount = readBuff.uint16();
    var pos = readBuff.tell();
    if (pos + 24 * frameCount > rawBuff.length) {
        readBuff.seek(start);
        return {
            isValid: false,
            msg: 'At %s:\nexpected (%s + 24 * %s <= %s)'.f(pos, pos, frameCount, rawBuff.length)
        };
    }

    readBuff.skip(4);
    let width, height, frameNum, typeVal = 0;
    do {
        width = readBuff.uint16();
        height = readBuff.uint16();
        typeVal = readBuff.uint16();
    } while (width == 0 && height == 0 && frameNum++ < frameCount);

    readBuff.seek(start);
    return {
        isValid: typeVal < 4,
        msg: null
    };
}

function readFile(filename, stats, fd) {
    var rawBuff = new Buffer(stats.size);
    fs.read(fd, rawBuff, 0, rawBuff.length, null, function(err, bytesRead, readBuff) {
        parseBuffer(filename, stats, fd, rawBuff, new binaryParser(readBuff));
    });
}

function openFile(filename, stats) {
    fs.open(filename, 'r', function(err, fd) {
        if (err) throw err;
        readFile(filename, stats, fd);
    });
}

function parseShp(filename) {
    fs.exists(filename, function(exists) {
        if (!exists)
            throw new Error('%s does not exist.'.f(filename));

        fs.stat(filename, function(err, stats) {
            if (err) throw err;
            openFile(filename, stats);
        });
    });
}

for (let i = 0; i < args.length; i++) {
    var filename = args[i];
    console.log('Testing %s'.f(filename));
    parseShp(filename);
}
