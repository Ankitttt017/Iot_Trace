const express = require("express");
const { getMachines, getMachineStatusHistory } = require("../controllers/machineController");

const router = express.Router();

router.get("/machines", getMachines);
router.get("/machines/:id/status-history", getMachineStatusHistory);

module.exports = router;
