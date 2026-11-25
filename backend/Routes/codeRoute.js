const router = require("express").Router();
const authMiddleware = require("../middlewares/authentication");
const {getAllExperiment, getOneExperiment, createNewExperiment, updateExistingCode, deleteVariation, deleteExperiment, updateProbabilities} = require("../Controllers/codeControllers");

router.use(authMiddleware);

router.route("/").post(createNewExperiment).get(getAllExperiment);
router.route("/:id").get(getOneExperiment).patch(updateExistingCode).delete(deleteExperiment);
router.route("/:id/probability").patch(updateProbabilities);
router.route("/:id/variation/:variationKey").delete(deleteVariation);

module.exports = router; 