const path = require('path');

const self = {};
module.exports = self;

const options = {
    cwd: './',
    source: './serverless.yml',
    output: './terraform'
};

self.get = (key) => {
    return options[key];
};

self.getAll = () => {
    return options;
};

self.set = (key, value) => {
    options[key] = value;
};

self.setPath = (key, value) => {
    self.set(key, path.resolve(value));
};
