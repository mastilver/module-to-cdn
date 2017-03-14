import test from 'ava';
import axios from 'axios';

import modules from './modules';
import fn from '.';

const moduleNames = Object.keys(modules);

for (const moduleName of moduleNames) {
    test(moduleName, testModule, moduleName);
}

async function testModule(t, moduleName) {
    const version = await getLatestVersion(moduleName);

    const cdnConfig = fn(moduleName, version);

    t.is(cdnConfig.name, moduleName);
    t.truthy(cdnConfig.url);
    t.true(await checkUrl(cdnConfig.url));
}

async function getLatestVersion(moduleName) {
    return await axios.get(`https://unpkg.com/${moduleName}/package.json`)
                      .then(x => x.data.version);
}

async function checkUrl(url) {
    try {
        await axios.get(url);
        return true;
    } catch (err) {
        return false;
    }
}
