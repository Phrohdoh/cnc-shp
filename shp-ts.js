'use strict';

var parser = require('binary-buffer-parser');

exports.toString = function() { return 'ts'; }

exports.isValidShp = function(filename, stats, fd, rawBuff) {
    var readBuff = new parser(rawBuff);
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
