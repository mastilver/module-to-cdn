'use strict';

const semver = require('semver');
const modules = require('./modules');

/**
 * Exchanges a CDN url from a passed module name and its specified version, and passed environment.
 * @Param {string} moduleName
 * @Param {string} version
 * @Param {object} property 'env' for optional environment which defaults to 'development'.
 * @returns {object} null if the module name or no matching semantic version is not found, or an object containing the name, var, url, and version properties
 */
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

    let url = env === 'development' ? config.development : config.production;
    url = url.replace('[version]', version);

    return {
        name: moduleName,
        var: modules[moduleName].var,
        url,
        version
    };
};
