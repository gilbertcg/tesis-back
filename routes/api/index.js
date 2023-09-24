const router = require('express').Router();

router.use('/', require('./client'));
router.use('/admin/', require('./admin'));

module.exports = router;
