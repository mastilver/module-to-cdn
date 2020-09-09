'use strict';

const semver = require('semver');
const pathModule = require('path');
const {getURL, setURL} = require('./url');

const modules = {...require('./modules')};

/**
 * Add new entries in the modules.
 * obj must be of the following shape:
 * {
 *   'moduleName': {
 *     'var': 'ModuleNameGlobalVar',
 *     'versions' : {
 *       '>= 0.0.0': {
 *         'development: '/dist/module.js',
 *         'production': '/dist/module.min.js'
 *       }
 *     }
 *   }
 * }
 */
function add(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        throw new Error('ValueError: not an object', config);
    }

    Object.keys(config).forEach(key => {
        modules[key] = config[key];
    });
}

function main(moduleName, version, options) {
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

    let path = env === 'development' ? config.development : config.production;
    let url;
    let root;
    if (path.startsWith('/')) {
        url = getURL({
            name: moduleName,
            version,
            path
        });
        try {
            const mainPath = require.resolve(moduleName);
            const splited = mainPath.split('node_modules');
            splited.pop();
            root = pathModule.join(splited.join('node_modules'), 'node_modules', moduleName, path);
        } catch {}
    } else {
        url = path.replace('[version]', version);
        path = undefined;
    }

    return {
        name: moduleName,
        var: modules[moduleName].var || modules[moduleName].versions[range].var,
        url,
        version,
        path,
        local: root
    };
}

function getAllModules() {
    return modules;
}

main.configure = setURL;
main.unpkg = getURL;
main.add = add;
main.getAllModules = getAllModules;
module.exports = main;
