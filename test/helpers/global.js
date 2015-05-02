'use strict';

GLOBAL.expect = require('chai').expect;

var sinon = require('sinon');
GLOBAL.stub = sinon.stub.bind(sinon);

GLOBAL.Disque = require('../..');
GLOBAL.MockServer = require('./mock_server');
