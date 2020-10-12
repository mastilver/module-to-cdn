const test = require('ava');
const pathModule = require('path');
const modules = require('./modules');
const fn = require('.');
const {cachedGet, getModuleInfo, getAllVersions, getRangeEdgeVersions} = require('./cache');

const moduleNames = Object.keys(modules);

test('basic', t => {
    t.deepEqual(fn('react', '15.0.0', {env: 'development'}), {
        name: 'react',
        var: 'React',
        url: 'https://unpkg.com/react@15.0.0/dist/react.js',
        version: '15.0.0',
        path: '/dist/react.js',
        local: pathModule.join(__dirname, 'node_modules', 'react', '/dist/react.js'),
        stylePath: undefined,
        styleUrl: undefined
    });
});

test('getAllModules', t => {
    t.deepEqual(fn.getAllModules(), modules);
});

test('unpkg', t => {
    t.is(
        fn.unpkg({
            name: 'react',
            version: '15.0.0',
            path: '/foo/bar'
        }),
        'https://unpkg.com/react@15.0.0/foo/bar'
    );
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

test('module not installed', t => {
    t.deepEqual(fn('react-dom', '15.0.0', {env: 'development'}), {
        name: 'react-dom',
        var: 'ReactDOM',
        url: 'https://unpkg.com/react-dom@15.0.0/dist/react-dom.js',
        version: '15.0.0',
        path: '/dist/react-dom.js',
        local: undefined,
        stylePath: undefined,
        styleUrl: undefined
    });
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
        test.serial(
            `prod: ${moduleName}@${version}`,
            testModule,
            moduleName,
            version,
            'production'
        );
        test.serial(
            `dev: ${moduleName}@${version}`,
            testModule,
            moduleName,
            version,
            'development'
        );
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

    const cdnConfig = fn(moduleName, nextVersion, {env});

    if (!cdnConfig) {
        return t.pass(`no next support for ${moduleName}`);
    }

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
                    content.includes(`${cdnConfig.var}=`) ||
                    content.includes(`function${cdnConfig.var}(`)
            );
        }
    }, cdnConfig.url);
}

// https://stackoverflow.com/a/31625466/3052444
function isValidVarName(name) {
    try {
        if (name.includes('.')) {
            // E.g. ng.core would cause errors otherwise:
            name = name.split('.').join('_');
        }

        if (name.includes('-')) {
            name = `"${name}"`;
            // eslint-disable-next-line no-eval
            return eval(`(function() { a = {${name}:1}; a[${name}];}); true`);
        }

        if (name.includes('}')) {
            return false;
        }

        // eslint-disable-next-line no-eval
        return eval(`(function() { a = {${name}:1}; a.${name}; var ${name}; }); true`);
    } catch (error) {
        console.error(error);
        return false;
    }
}
