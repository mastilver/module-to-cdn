# module-to-cdn [![Build Status](https://travis-ci.org/mastilver/module-to-cdn.svg?branch=master)](https://travis-ci.org/mastilver/module-to-cdn)

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
    var: 'React',
    url: 'https://unpkg.com/react@15.3.0/dist/react.min.js'
}
*/
```


## API

### moduleToCdn(moduleName, version)

return the result `Object` or null (if module couldn't be find)

#### moduleName

Type: `string`

The name of the module

#### version

Type: `string`

The version of the module

### Result

* `name`: name of the module
* `var`: name of the global variable exposing the module
* `url`: url where the module is available


## License

MIT © [Thomas Sileghem](http://mastilver.com)
