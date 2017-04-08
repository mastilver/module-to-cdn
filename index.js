'use strict';

const modules = require('./modules');

module.exports = function (moduleName, version) {
    if (typeof moduleName !== 'string') {
        throw new TypeError('Expected \'moduleName\' to be a string');
    }

    if (typeof version !== 'string') {
        throw new TypeError('Expected \'version\' to be a string');
    }

    const isModuleAvailable = moduleName in modules;
    if (!isModuleAvailable) {
        throw new Error(`'${moduleName}' is not available through cdn, add it to https://github.com/mastilver/module-to-cdn/blob/master/modules.json if you think it should`);
    }

    const module = Object.assign({
        name: moduleName
    }, modules[moduleName]);

    module.url = module.url.replace('[version]', version);

    return module;
};
