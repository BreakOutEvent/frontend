'use strict';

const multer = require('multer');
const ProfileController = require('../controller/page-controller/ProfileController');
const Router = require('co-router');

const sponsoring = requireLocal('controller/page-controller/sponsoring');
const profile = requireLocal('controller/page-controller/profile');
const session = requireLocal('controller/session');

const upload = multer({inMemory: true});
const router = new Router();

router.get('/sponsoring', session.isUser, sponsoring.showSponsorings);

router.get('/profile', session.isUser, ProfileController.showProfile);

router.post('/sponsoring/create', session.isUser, upload.single('contract'), sponsoring.create);

router.post('/sponsoring/accept', session.isUser, sponsoring.accept);

router.post('/sponsoring/reject', session.isUser, sponsoring.reject);

router.post('/sponsoring/delete', session.isUser, sponsoring.delete);

router.post('/challenge/create', session.isUser, upload.single('contract'), sponsoring.challenge.create);

router.post('/challenge/accept', session.isUser, sponsoring.challenge.accept);

router.post('/challenge/reject', session.isUser, sponsoring.challenge.reject);

router.post('/challenge/delete', session.isUser, sponsoring.challenge.delete);

router.put('/profile/team', session.hasTeam, upload.single('teamPic'), profile.putTeam);

module.exports = router;