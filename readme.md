# module-to-cdn [![Build Status](https://travis-ci.org/mastilver/module-to-cdn.svg?branch=master)](https://travis-ci.org/mastilver/module-to-cdn) [![Greenkeeper badge](https://badges.greenkeeper.io/JulianWielga/module-to-cdn.svg)](https://greenkeeper.io/)

> Get cdn config from npm module name


## Install

```
$ npm install --save module-to-cdn
```


## Usage

```js
const moduleToCdn = require('module-to-cdn');

moduleToCdn('react', '15.3.0');
/* => {
    name: 'react',
    var: 'React',
    url: 'https://unpkg.com/react@15.3.0/dist/react.min.js',
    version: '15.3.0'
}
*/
```


## API

### moduleToCdn(moduleName, version, options)

return the result `Object` or null (if module couldn't be find)

#### moduleName

Type: `string`

The name of the module

#### version

Type: `string`

The version of the module

#### options

##### options.env

Type: `string`<br>
Values: `development`, `production`<br>
Default: `development`

### Result

* `name`: name of the module
* `var`: name of the global variable exposing the module
* `url`: url where the module is available
* `version`: the version asked for


## Tests

This module do integration tests so it requests npm / unpkg for every packages on the limit of each version and also it tries to fetch the @next version to be as future proof as possible

So if you want to focus on a given module you can use the LIMIT env variable

```
LIMIT=";ag-grid;ag-grid-community;ag-grid-enterprise;" ava
```

## License

MIT © [Thomas Sileghem](http://mastilver.com)
