'use strict';

var parser = require('@phrohdoh/binary-buffer-parser');

class BuffPos {
    constructor(buff, pos) {
        this.buff = buff;
        this.pos = pos;
    }
}

class ShpFileHeader {
    constructor(fullWidth, fullHeight, frameCount) {
        this.width = fullWidth;
        this.height = fullHeight;
        this.frameCount = frameCount;
    }

    static from(buffPos) {
        let r = parser(BuffPos.buff);
        r.skip(2);
        let w = r.uint16(),
            h = r.uint16(),
            f = r.uint16();

        buffPos.pos = r.tell();
        return new ShpFileHeader(w, h, f);
    }
}

module.exports = {
    BuffPos,
    ShpFileHeader
}
