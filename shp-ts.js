'use strict';

var parser = require('binary-buffer-parser');

exports.toString = function() { return 'ts'; }

exports.isLoaderFor = function(filename, buff) {
    let readBuff = new parser(buff);
    let start = readBuff.tell();

    let first2Bytes = readBuff.uint16();
    if (first2Bytes !== 0) {
        let pos = readBuff.tell();
        readBuff.seek(start);
        return false;
    }

    readBuff.skip(4);
    let frameCount = readBuff.uint16();
    let pos = readBuff.tell();
    if (pos + 24 * frameCount > buff.length) {
        readBuff.seek(start);
        return false;
    }

    readBuff.skip(4);
    let width, height, frameNum, typeVal = 0;
    do {
        width = readBuff.uint16();
        height = readBuff.uint16();
        typeVal = readBuff.uint16();
    } while (width == 0 && height == 0 && frameNum++ < frameCount);

    readBuff.seek(start);
    return true;
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
        x: Math.trunc(x + (dataWidth / size.width) / 2),
        y: Math.trunc(y + (dataHeight / size.width) / 2),
    };

    frame.size = {
        width: dataWidth,
        height: dataHeight
    };

    let format = readBuff.byte();
    readBuff.skip(11);
    let fileOffset = readBuff.uint32();

    if (fileOffset === 0)
        return frame;

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
        for (let i = 0; i < height; i++) {
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
    let readBuff = new parser(rawBuff);
    let start = readBuff.tell();

    readBuff.skip(2);
    let width = readBuff.uint16(),
        height = readBuff.uint16(),
        size = { width, height },
        frameCount = readBuff.uint16();

    let frames = Array(frameCount);
    for (let i = 0; i < frameCount; i++)
        frames[i] = parseFrame(rawBuff, readBuff, size);

    readBuff.seek(start);
    return frames;
}
