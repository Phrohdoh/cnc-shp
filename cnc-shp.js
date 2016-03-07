'use strict';

var ts = require('./shp-ts'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs'));

function getLoaderForBuffer(filename, buff) {
    return [ts].find(function(loader, index, thisArr) {
        return loader.isLoaderFor(filename, buff);
    });
}

exports.parseShpAsync = function(filename) {
    return fs.readFileAsync(filename).then(buff => {
        let loader = getLoaderForBuffer(filename, buff);
        if (!loader)
            throw Error('Could not find a loader for ' + filename);

        return loader.parseFrames(buff);
    });
}
