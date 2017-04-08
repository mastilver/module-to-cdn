'use strict';

const modules = require('./modules');

module.exports = function (moduleName, version) {
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
