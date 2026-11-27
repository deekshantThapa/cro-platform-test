const mongoose = require('mongoose');
const { connections } = require('../Connector/dbConnector');

const variationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    probability: { type: Number, required: true, min: 0, max: 100 },
    code: { type: String, default: '' } // CHANGED: was required, control needs empty code
  },
  { _id: false }
);

// NEW: goals the snippet will track
const goalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    selector: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const codeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed'],
      default: 'draft'
    },
    trafficAllocation: { type: Number, default: 10000, min: 0, max: 10000 }, // NEW
    goals: { type: [goalSchema], default: [] }, // NEW
    variations: {
      type: [variationSchema],
      validate: [
        {
          validator: (arr) => arr.length >= 2,
          message: 'An experiment needs at least 2 variations'
        },
        {
          validator: (arr) => new Set(arr.map((v) => v.key)).size === arr.length,
          message: 'Variation keys must be unique within an experiment'
        },
        {
          validator: (arr) => arr.reduce((sum, v) => sum + v.probability, 0) === 100,
          message: 'Variation probabilities must add up to 100'
        }
      ]
    }
  },
  { timestamps: true }
);

module.exports = connections.experiments.model('code-model', codeSchema);
