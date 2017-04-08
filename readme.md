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

### moduleToCdn(libraryName, libraryVersion)

#### libraryName

Type: `string`

The name of the library

#### libraryVersion

Type: `string`

The version of the library


## License

MIT © [Thomas Sileghem](http://mastilver.com)
