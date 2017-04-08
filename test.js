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

    const content = await axios.get(cdnConfig.url).then(x => x.data);

    if (cdnConfig.var != null) {
        t.true(content.includes(`.${cdnConfig.var}=`));
    }
}

async function getLatestVersion(moduleName) {
    return await axios.get(`https://unpkg.com/${moduleName}/package.json`)
                      .then(x => x.data.version);
}
