'use strict';

let parser = require('@phrohdoh/binary-buffer-parser'),
    _ = require('./classes'),
    ShpFileHeader = _.ShpFileHeader,
    BuffPos = _.BuffPos;

//exports.toString = function() { return 'ts'; }
let toString = () => 'ts';

let isLoaderFor = function(filename, buffPos) {
//exports.isLoaderFor = function(filename, buff) {
    let buff = new parser(buff);
    let start = buff.tell();

    let first2Bytes = buff.uint16();
    if (first2Bytes !== 0) {
        let pos = buff.tell();
        buff.seek(start);
        return false;
    }

    buff.skip(4);
    let frameCount = buff.uint16();
    let pos = buff.tell();
    if (pos + 24 * frameCount > buff.length) {
        buff.seek(start);
        return false;
    }

    buff.skip(4);
    let width, height, frameNum, typeVal = 0;
    do {
        width = buff.uint16();
        height = buff.uint16();
        typeVal = buff.uint16();
    } while (width == 0 && height == 0 && frameNum++ < frameCount);

    buff.seek(start);
    return true;
}

/**
 * Decode data from the srcArr into the destArr starting at destIndex
 * @param {Array.<Number>} srcArr
 * @param {Array.<Number>} destArr
 * @param {Number} destIndex
 * @returns {Number} bytesRead
 */
function rleDecodeInto(srcArr, destArr, destIndex) {
    let i = 0;
    while (i < srcArr.length) {
        let cmd = srcArr[i++];
        if (cmd === 0) {
            let count = srcArr[i++];
            while (count-- > 0)
                destArr[destIndex++] = 0;
        }
        else
            destArr[destIndex++] = cmd;
    }

    return i;
}

/**
 * @param {Buffer.<Number>} rawBuff
 * @param {Buffer.<Number>} buff
 * @param {{width: Number, height: Number}} size
 */
function parseFrame(buffPos size) {
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

    let buff = buffPos.buff;

    let x = buff.uint16(),
        y = buff.uint16(),
        width = buff.uint16(),
        height = buff.uint16();

    let dataWidth = width,
        dataHeight = height;

    if (dataWidth % 2 === 1)
        dataWidth += 1;

    if (dataHeight % 2 === 1)
        dataHeight += 1;

    frame.offset = {
        x: Math.trunc(x + (dataWidth / size.width) / 2),
        y: Math.trunc(y + (dataHeight / size.height) / 2),
    };

    frame.size = {
        width: dataWidth,
        height: dataHeight
    };

    let format = buff.byte();
    buff.skip(11);
    let fileOffset = buff.uint32();
    let data = Array(dataWidth * dataHeight);

    if (fileOffset === 0)
        return frame;

    let headerPos = buff.tell();
    buff.seek(fileOffset);

    if (format === 3) {
        for (let i = 0; i < height; i++) {
            let len = buff.uint16() - 2;
            rleDecodeInto(buff.byte(len), data, dataWidth * i);
        }
    }
    else {
        let len = format === 2 ? buff.uint16() - 2 : width;
        for (let i = 0; i < height; i++) {
            let bytes = buff.byte(len);
            for (let bi = 0; bi < bytes.length; bi++)
                data[dataWidth * i + bi] = bytes[bi];
        }
    }

    frame.data = data;
    buff.seek(headerPos);
    return frame;
}

let parseFrames = function(buffPos) {
    let buff = buffPos.buff;
    let start = buff.tell();

    buff.skip(2);
    let width = buff.uint16(),
        height = buff.uint16(),
        size = { width, height },
        frameCount = buff.uint16();

    let frames = Array(frameCount);
    for (let i = 0; i < frameCount; i++)
        frames[i] = parseFrame(rawBuff, buff, size);

    buff.seek(start);
    return frames;
}
