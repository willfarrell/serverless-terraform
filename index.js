const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const webpack = require('webpack');

const options = require('./options');

// conversion modules
const output = require('./parsers/output');
const iam = require('./parsers/iam');
const functions = require('./parsers/functions');
const variables = require('./parsers/variables');

const self = {};
module.exports = self;

self.init = () => {
    // clear folder
    fs.readdir(options.get('output'), (err, files) => {
        if (err) throw new Error('Output directory doesn\'t exist');

        for (const file of files) {
            fs.unlink(path.join(options.get('output'), file), err => {
                if (err) throw err;
            });
        }
    });
};

self.convert = () => {
    console.log(options.getAll());
    const config = fs.readFileSync(options.get('source'), {encoding: 'utf-8'})
        .replace(/opt:region/g, 'var.aws_region')
        .replace(/opt:stage/g, 'var.env')
        .replace(/self:provider\.stage/g, 'var.env');

    let serverless = yaml.safeLoad(config);

    // TODO
    // replace file() w/ data
    // merge w/. defaults

    runWebpack(serverless, (err, stats) => {
        if (err) {
            return console.error(err);
        }
        output(serverless);
        variables(serverless);
        iam(serverless);
        functions(serverless);
    });
};

const runWebpack = (serverless, cb) => {
    if (!serverless.functions) return;

    const entry = {};
    Object.keys(serverless.functions).forEach((key) => {
        const file = serverless.functions[key].handler;
        entry[key] = path.resolve(options.get('cwd'), file.substr(0,file.lastIndexOf('.'))+'.js');
    });
    webpack({
        entry: entry,
        output: {
            filename: '[name].js',
            path: path.resolve(options.get('cwd'), 'terraform')
        }
    }, cb);
};
