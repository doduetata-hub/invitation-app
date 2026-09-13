const env = require('../../config/env');
const localStorage = require('./localStorage');
const s3Storage = require('./s3Storage');

const drivers = { local: localStorage, s3: s3Storage };

module.exports = drivers[env.storageDriver] || localStorage;
