'use strict';

const modules = require('./modules');

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

    let url = env === 'development' ? modules[moduleName].development : modules[moduleName].production;
    url = url.replace('[version]', version);

    return {
        name: moduleName,
        var: modules[moduleName].var,
        url
    };
};
