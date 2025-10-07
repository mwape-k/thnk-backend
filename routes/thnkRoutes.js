const express = require("express"); 
const router = express.Router();
const { deepDive } = require("../controllers/thnkController");

router.post("/deep-dive", deepDive); 

module.exports = router;