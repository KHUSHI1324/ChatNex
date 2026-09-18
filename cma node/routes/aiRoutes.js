const express = require("express");
const router = express.Router();
const {
  askAI,
  translateMessage,
  imagineImage,
  transcribeAudio,
  rewriteMessage,
} = require("../controllers/aiController");

router.post("/chat", askAI);
router.post("/translate", translateMessage);
router.post("/imagine", imagineImage);
router.post("/transcribe", transcribeAudio);
router.post("/rewrite", rewriteMessage);

module.exports = router;
