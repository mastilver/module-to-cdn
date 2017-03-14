'use strict';

const modules = require('./modules');

module.exports = function (moduleName, version) {
    const module = Object.assign({
        name: moduleName,
        url: `https://cdnjs.cloudflare.com/ajax/libs/${moduleName}/[version]/${moduleName}.min.js`
    }, modules[moduleName]);

    module.url = module.url.replace('[version]', version);

    return module;
};
