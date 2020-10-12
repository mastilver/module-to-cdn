'use strict';

const semver = require('semver');
const pathModule = require('path');
const {getURL, setURL} = require('./url');
const cache = require('./cache');

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

    const moduleConf = modules[moduleName];
    const range = Object.keys(moduleConf.versions).find(range => semver.satisfies(version, range));
    const config = moduleConf.versions[range];
    const styleConfig = moduleConf['style-versions'] && moduleConf['style-versions'][range];

    if (config == null) {
        return null;
    }

    let path = env === 'development' ? config.development : config.production;
    let stylePath;
    if (styleConfig) {
        stylePath = env === 'development' ? styleConfig.development : styleConfig.production;
    }

    let url;
    let styleUrl;
    let root;
    if (path.startsWith('/')) {
        url = getURL({
            name: moduleName,
            version,
            path
        });
        styleUrl =
            stylePath &&
            getURL({
                name: moduleName,
                version,
                path: stylePath
            });
        try {
            const mainPath = require.resolve(moduleName);
            const splited = mainPath.split('node_modules');
            splited.pop();
            root = pathModule.join(splited.join('node_modules'), 'node_modules', moduleName, path);
        } catch {}
    } else {
        url = path.replace('[version]', version);
        styleUrl = stylePath && stylePath.replace('[version]', version);
        path = undefined;
    }

    return {
        name: moduleName,
        var: modules[moduleName].var || modules[moduleName].versions[range].var,
        url,
        version,
        path,
        local: root,
        styleUrl,
        stylePath
    };
}

function getAllModules() {
    return modules;
}

main.configure = setURL;
main.unpkg = getURL;
main.add = add;
main.getAllModules = getAllModules;
main.cache = cache;
module.exports = main;
