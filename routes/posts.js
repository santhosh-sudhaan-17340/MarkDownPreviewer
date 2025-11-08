const express = require('express');
const router = express.Router();
const passport = require('passport');
const postsController = require('../controllers/posts_controller');
const { uploadPost } = require('../config/multer');

router.post('/create', passport.checkAuthentication, uploadPost, postsController.create);
router.get('/destroy/:id', passport.checkAuthentication, postsController.destroy);
router.post('/update/:id', passport.checkAuthentication, uploadPost, postsController.update);

module.exports = router;
