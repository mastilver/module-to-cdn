const test = require('ava');
const axios = require('axios');
const execa = require('execa');
const semver = require('semver');
const axiosRetry = require('axios-retry');
const fs = require('fs');
const modules = require('./modules');
const fn = require('.');

const CACHE_BASE_PATH = '.test-cache';
if (!fs.existsSync(CACHE_BASE_PATH)) {
    console.log(`Setup cache for testing`);
    fs.mkdirSync(CACHE_BASE_PATH);
}

const CACHE_NPM_PATH = `${CACHE_BASE_PATH}/.npm-cache-info.json`;
const CACHE_NPM = {
    __last: Date.now(),
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
    fs.mkdirSync(AXIOS_CACHE_PATH)
}

const moduleNames = Object.keys(modules);
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

test('basic', t => {
    t.deepEqual(fn('react', '15.0.0', {env: 'development'}), {
        name: 'react',
        var: 'React',
        url: 'https://unpkg.com/react@15.0.0/dist/react.js',
        version: '15.0.0'
    });
});

test('unknown module', t => {
    t.is(fn('qwerty', '1.0.0'), null);
});

test('default to development', t => {
    t.deepEqual(fn('react', '15.0.0', {env: 'development'}), fn('react', '15.0.0'));
    t.notDeepEqual(fn('react', '15.0.0', {env: 'production'}), fn('react', '15.0.0'));
});

test('out of range module', t => {
    t.is(fn('react', '0.10.0'), null);
});

function limit(m) {
    if (process.env.LIMIT) {
        return process.env.LIMIT.includes(`;${m};`);
    }

    return true;
}

for (const moduleName of moduleNames.filter(m => limit(m))) {
    const versionRanges = Object.keys(modules[moduleName].versions);

    test.serial(`prod: ${moduleName}@next`, testNextModule, moduleName, 'production');
    test.serial(`dev: ${moduleName}@next`, testNextModule, moduleName, 'development');

    const allVersions = getAllVersions(moduleName);
    const testVersions = [].concat(...versionRanges.map(getRangeEdgeVersions(allVersions)));
    console.log(moduleName, testVersions);
    testVersions.forEach(version => {
        test.serial(`prod: ${moduleName}@${version}`, testModule, moduleName, version, 'production');
        test.serial(`dev: ${moduleName}@${version}`, testModule, moduleName, version, 'development');
    });
}

async function testModule(t, moduleName, version, env) {
    const cdnConfig = fn(moduleName, version, {env});

    await testCdnConfig(t, cdnConfig, moduleName, version);
}

async function testNextModule(t, moduleName, env) {
    const tags = getModuleInfo(moduleName)['dist-tags'];

    if (!tags.next) {
        return t.pass();
    }

    const nextVersion = tags.next;
    const futureVersion = removePrereleaseItentifiers(nextVersion);

    const cdnConfig = fn(moduleName, futureVersion, {env});

    if (!cdnConfig) {
        return t.pass(`no next support for ${moduleName}`);
    }

    cdnConfig.url = cdnConfig.url.replace(futureVersion, nextVersion);

    await testCdnConfig(t, cdnConfig, moduleName, nextVersion);
}

async function testCdnConfig(t, cdnConfig, moduleName, version) {
    t.notDeepEqual(cdnConfig, null);

    t.is(cdnConfig.name, moduleName);
    t.truthy(cdnConfig.url);
    t.true(cdnConfig.url.includes(version));

    await t.notThrowsAsync(async () => {
        let data;
        try {
            const response = await cachedGet(cdnConfig.url);
            data = response.data;
        } catch (error) {
            throw new Error(error.message);
        }

        if (cdnConfig.var) {
            t.true(isValidVarName(cdnConfig.var));

            const content = data.replace(/ /g, '');
            t.true(
                content.includes(`.${cdnConfig.var}=`) ||
                content.includes(`["${cdnConfig.var}"]=`) ||
                content.includes(`['${cdnConfig.var}']=`) ||
                // Immutable 3 is clear, the script is global and just do Immutable =
                content.includes(`${cdnConfig.var}=`)
            );
        }
    }, cdnConfig.url);
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

// https://stackoverflow.com/a/31625466/3052444
function isValidVarName(name) {
    try {
        if (name.includes('.')) {
            // E.g. ng.core would cause errors otherwise:
            name = name.split('.').join('_');
        }

        // eslint-disable-next-line no-eval
        return !name.includes('}') && eval('(function() { a = {' + name + ':1}; a.' + name + '; var ' + name + '; }); true');
    } catch (error) {
        console.error(error);
        return false;
    }
}

function removePrereleaseItentifiers(version) {
    return `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}`;
}
