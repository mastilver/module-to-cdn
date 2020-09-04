const axios = require('axios');
const axiosRetry = require('axios-retry');
const fs = require('fs');
const execa = require('execa');
const semver = require('semver');

const CACHE_BASE_PATH = '.test-cache';
if (!fs.existsSync(CACHE_BASE_PATH)) {
    console.log('Setup cache for testing');
    fs.mkdirSync(CACHE_BASE_PATH);
}

const CACHE_NPM_PATH = `${CACHE_BASE_PATH}/.npm-cache-info.json`;
const CACHE_NPM = {
    __last: Date.now()
};

if (fs.existsSync(CACHE_NPM_PATH)) {
    const cache = require(`./${CACHE_NPM_PATH}`);
    if (Date.now() - cache.__last < 1000 * 60 * 60) {
        console.log('use cache on NPM');
        Object.assign(CACHE_NPM, cache);
    } else {
        console.log('reset NPM cache');
    }
}

const AXIOS_CACHE_INDEX_PATH = `${CACHE_BASE_PATH}/axios.json`;
const AXIOS_CACHE_PATH = `${CACHE_BASE_PATH}/axios`;
const AXIOS_CACHE = {};

if (fs.existsSync(AXIOS_CACHE_INDEX_PATH)) {
    Object.assign(AXIOS_CACHE, require(`./${AXIOS_CACHE_INDEX_PATH}`));
} else {
    console.log(`Setup cache index for axios request in ${AXIOS_CACHE_INDEX_PATH}`);
    fs.writeFileSync(AXIOS_CACHE_INDEX_PATH, '{}');
}

if (!fs.existsSync(AXIOS_CACHE_PATH)) {
    console.log(`Setup cache folder for axios request in ${AXIOS_CACHE_PATH}`);
    fs.mkdirSync(AXIOS_CACHE_PATH);
}

axiosRetry(axios, {retries: 3});

function cachedGet(url) {
    if (AXIOS_CACHE[url]) {
        return Promise.resolve({data: fs.readFileSync(AXIOS_CACHE[url]).toString()});
    }

    return axios.get(url).then(response => {
        AXIOS_CACHE[url] = `./${AXIOS_CACHE_PATH}/cache-${Math.random().toFixed(10)}.js`;
        fs.writeFileSync(AXIOS_CACHE[url], response.data);
        fs.writeFileSync(AXIOS_CACHE_INDEX_PATH, JSON.stringify(AXIOS_CACHE, null, 2));
        return response;
    });
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
    getModuleInfo,
    getAllVersions,
    getRangeEdgeVersions
};
