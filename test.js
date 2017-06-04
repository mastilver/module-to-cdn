import test from 'ava';
import axios from 'axios';

import modules from './modules';
import fn from '.';

const moduleNames = Object.keys(modules);

test('unknown library', t => {
    t.is(fn('qwerty', '1.0.0'), null);
});

for (const moduleName of moduleNames) {
    test(moduleName, testModule, moduleName);
    test(`prod: ${moduleName}`, testModule, moduleName, 'production');
    test(`dev: ${moduleName}`, testModule, moduleName, 'development');
}

async function testModule(t, moduleName, env) {
    const version = await getLatestVersion(moduleName);

    const cdnConfig = fn(moduleName, version, {env});

    t.is(cdnConfig.name, moduleName);
    t.truthy(cdnConfig.url);
    t.true(cdnConfig.url.includes(version));

    if (env === 'production') {
        t.true(cdnConfig.url.includes('min'));
    } else {
        t.false(cdnConfig.url.includes('min'));
    }

    let content = await axios.get(cdnConfig.url).then(x => x.data);

    if (cdnConfig.var != null) {
        content = content.replace(/ /g, '');

        t.true(
            content.includes(`.${cdnConfig.var}=`) ||
            content.includes(`["${cdnConfig.var}"]=`) ||
            content.includes(`['${cdnConfig.var}']=`)
        );
    }
}

async function getLatestVersion(moduleName) {
    return await axios.get(`https://unpkg.com/${moduleName}/package.json`)
                      .then(x => x.data.version);
}
