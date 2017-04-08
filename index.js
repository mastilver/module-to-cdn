'use strict';

const modules = require('./modules');

module.exports = function (moduleName, version) {
    const module = Object.assign({
        name: moduleName
    }, modules[moduleName]);

    module.url = module.url.replace('[version]', version);

    return module;
};
