const axios = require('axios');
const axiosRetry = require('axios-retry');
const fs = require('fs');
const path = require('path');

const execa = require('execa');
const semver = require('semver');
const mkdirp = require('mkdirp');

const CACHE_BASE_PATH = `${process.cwd()}/.test-cache`;
if (!fs.existsSync(CACHE_BASE_PATH)) {
    console.log('Setup cache for testing');
    fs.mkdirSync(CACHE_BASE_PATH);
}

const CACHE_NPM_PATH = `${CACHE_BASE_PATH}/.npm-cache-info.json`;
const CACHE_NPM = {
    __last: Date.now()
};

if (fs.existsSync(CACHE_NPM_PATH)) {
    const cache = require(CACHE_NPM_PATH);
    if (Date.now() - cache.__last < 1000 * 60 * 60) {
        console.log('use cache on NPM');
        Object.assign(CACHE_NPM, cache);
    } else {
        console.log('reset NPM cache');
    }
}

const AXIOS_CACHE_PATH = `${CACHE_BASE_PATH}/axios`;

if (!fs.existsSync(AXIOS_CACHE_PATH)) {
    console.log(`Setup cache folder for axios request in ${AXIOS_CACHE_PATH}`);
    fs.mkdirSync(AXIOS_CACHE_PATH);
}

axiosRetry(axios, {retries: 3, retryDelay: () => 3000});

function getInfo(url) {
    const info = {};
    const splitted = url.replace('https://unpkg.com/', '').split('/');
    const [packageAndVersion, inCase, ...restPath] = splitted;

    if (packageAndVersion.startsWith('@')) {
        const [n, version] = inCase.split('@');
        info.name = `${packageAndVersion}/${n}`;
        info.version = version;
        info.path = restPath.join('/');
    } else {
        const [n, version] = packageAndVersion.split('@');
        info.name = n;
        info.version = version;
        info.path = [inCase].concat(restPath).join('/');
    }

    return info;
}

function getPathFromURL(url) {
    const info = getInfo(url);
    return `${AXIOS_CACHE_PATH}/${info.name}/${info.version}/${info.path}`;
}

async function cachedGet(url) {
    const pathFromURL = getPathFromURL(url);
    if (fs.existsSync(pathFromURL)) {
        return Promise.resolve({data: fs.readFileSync(pathFromURL).toString()});
    }

    try {
        const response = await axios.get(url);
        if (process.env.DEBUG) {
            console.debug('downloaded', url);
        }

        mkdirp.sync(path.dirname(pathFromURL));
        fs.writeFileSync(pathFromURL, response.data);
        return response;
    } catch (error) {
        console.error('DownloadError', url, error.message);
        return Promise.reject(error);
    }
}

function isInCache(url) {
    return fs.existsSync(getPathFromURL(url));
}

function getModuleInfo(moduleName) {
    if (!CACHE_NPM[moduleName]) {
        const info = JSON.parse(execa.sync('npm', ['info', '--json', `${moduleName}`]).stdout);
        CACHE_NPM[moduleName] = {
            'dist-tags': info['dist-tags'],
            versions: info.versions
        };
        fs.writeFileSync(CACHE_NPM_PATH, JSON.stringify(CACHE_NPM));
    }

    return CACHE_NPM[moduleName];
}

function getAllVersions(moduleName) {
    return getModuleInfo(moduleName).versions;
}

function getRangeEdgeVersions(allVersions) {
    return function (range) {
        const result = [];
        const values = allVersions.filter(version => semver.satisfies(version, range));

        if (values.length > 0) {
            result.push(values[0]);
        }

        if (values.length > 1) {
            result.push(values[values.length - 1]);
        }

        return result;
    };
}

module.exports = {
    cachedGet,
    isInCache,
    getModuleInfo,
    getAllVersions,
    getRangeEdgeVersions,
    getPathFromURL
};
