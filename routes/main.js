/**
 * Router for /
 */
'use strict';

const express = require('express');
const co = require('co');
const teamController = requireLocal('controller/page-controller/team');
const staticController = requireLocal('controller/page-controller/static');
const renderer = requireLocal('services/renderer');

const router = express.Router();

router.get('/:language([a-zA-Z]{2})/team', teamController);

router.get('/:language([a-zA-Z]{2})/:path', (req, res, next) =>
  staticController.prerendered(req.params.language, req.params.path, res, next));

router.get('/live/:language([a-zA-Z]{2})/:path', (req, res, next) =>
  staticController.live(req.params.language, req.params.path, res, next));

router.get('/live/test', (req, res) => co(function*() {
  yield renderer.renderAndSavePageByID('56c897d0d0c4c4fc3b281320');
  res.send('Mh');
}));

module.exports = router;
