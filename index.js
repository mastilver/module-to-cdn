'use strict';

const semver = require('semver');

const modules = require('./modules');
const {getURL} = require('./url');

module.exports = function (moduleName, version, options) {
    options = options || {};
    const env = options.env || 'development';

    if (typeof moduleName !== 'string') {
        throw new TypeError('Expected \'moduleName\' to be a string');
    }

    if (typeof version !== 'string') {
        throw new TypeError('Expected \'version\' to be a string');
    }

    const isModuleAvailable = moduleName in modules;
    if (!isModuleAvailable) {
        return null;
    }

    const range = Object.keys(modules[moduleName].versions)
        .find(range => semver.satisfies(version, range));
    const config = modules[moduleName].versions[range];

    if (config == null) {
        return null;
    }

    const path = env === 'development' ? config.development : config.production;
    let url;
    if (path.startsWith('/')) {
        url = getURL({
            name: moduleName,
            version,
            path
        });
    } else {
        url = path.replace('[version]', version);
    }

    return {
        name: moduleName,
        var: modules[moduleName].var || modules[moduleName].versions[range].var,
        url,
        version
    };
};
