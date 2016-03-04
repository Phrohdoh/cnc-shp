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

 function rleDecodeInto(srcArr, destArr, destIndex) {
    for (let i = 0; i < srcArr.length; i++) {
        let cmd = srcArr[i++];
        if (cmd === 0) {
            let count = srcArr[i++];
            while (count-- > 0)
                destArr[destIndex++] = 0;
        }
        else
            destArr[destIndex++] = cmd;
    }
}

function parseFrame(rawBuff, readBuff, size) {
    let frame = {
        size: {
            width: 0,
            height: 0
        },
        offset: {
            x: 0,
            y: 0
        },
        data: undefined,
    };

    let x = readBuff.uint16(),
        y = readBuff.uint16(),
        width = readBuff.uint16(),
        height = readBuff.uint16();

    let dataWidth = width,
        dataHeight = height;

    if (dataWidth % 2 === 1)
        dataWidth += 1;

    if (dataHeight % 2 === 1)
        dataHeight += 1;

    frame.offset = {
        x: x + (dataWidth / size.width) / 2,
        y: x + (dataHeight / size.width) / 2,
    };

    frame.size = {
        width: dataWidth,
        height: dataHeight
    };

    let format = readBuff.byte();
    readBuff.skip(11);
    let fileOffset = readBuff.uint32();

    if (fileOffset === 0)
        return;

    let headerPos = readBuff.tell();
    readBuff.seek(fileOffset);

    let data = Array(dataWidth * dataHeight);
    if (format === 3) {
        for (let i = 0; i < height; i++) {
            let len = readBuff.uint16() - 2;
            rleDecodeInto(readBuff.byte(len), data, dataWidth * i);
        }
    }
    else {
        let len = format === 2 ? readBuff.uint16() - 2 : width;
        for (let i = 0; i < len; i++) {
            let bytes = readBuff.byte(len);
            for (let bi = 0; bi < bytes.length; bi++)
                data[dataWidth * i + bi] = bytes[bi];
        }
    }

    frame.data = data;
    readBuff.seek(headerPos);
    return frame;
}

exports.parseFrames = function(rawBuff) {
    var readBuff = new parser(rawBuff);
    var start = readBuff.tell();

    readBuff.skip(2);
    var width = readBuff.uint16(),
        height = readBuff.uint16(),
        size = { width: width, height: height },
        frameCount = readBuff.uint16();

    var frames = Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
        let frame = parseFrame(rawBuff, readBuff, size);
        frames[i] = frame;
    }

    readBuff.seek(start);
    return frames;
}
