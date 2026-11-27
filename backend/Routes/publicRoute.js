const router = require('express').Router();
const codeModel = require('../Models/codeModel');

router.get('/experiments', async (req, res) => {
  const list = await codeModel.find({ status: 'running' }).lean();

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    experiments: list.map((e) => ({
      id: String(e._id),
      name: e.name,
      trafficAllocation: e.trafficAllocation ?? 10000,
      goals: e.goals || [],
      variations: e.variations.map((v) => ({
        id: v.key,
        weight: v.probability * 100, // 0-100 -> 0-10000 for the engine
        code: v.code || ''
      }))
    }))
  });
});

module.exports = router;
