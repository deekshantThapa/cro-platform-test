const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const codeModel = require("../Models/codeModel");
const MIN_VARIATIONS = 2;

const getAllExperiment = async (req, res) => {
    const result = await codeModel.find({});
    res.status(StatusCodes.OK).json({ result });
};

const getOneExperiment = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `'${id}' is not a valid experiment id` });
    }

    const result = await codeModel.findById(id);

    if (!result) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `No experiment found with id ${id}` });
    }

    res.status(StatusCodes.OK).json({ result });
};

const createNewExperiment = async (req, res) => {
    const result = await codeModel.create({ ...req.body });
    res.status(StatusCodes.CREATED).json({ result });
};

const updateExistingCode = async (req, res) => {
    const { id } = req.params;
    const { variation, code } = req.body;

    if (!mongoose.isValidObjectId(id)) { 
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `'${id}' is not a valid experiment id` });
    }
    if (typeof variation !== "string" || !variation.trim()) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: "variation (key) is required" });
    }
    if (typeof code !== "string" || !code.trim()) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: "code is required and must be a non-empty string" });
    }

    const result = await codeModel.findOneAndUpdate(
        { _id: id, "variations.key": variation },
        { $set: { "variations.$.code": code } },
        { returnDocument: "after", runValidators: true }
    );

    if (!result) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `Experiment '${id}' or variation '${variation}' not found` });
    }

    res.status(StatusCodes.OK).json({ result });
};

const updateProbabilities = async (req, res) => {
    const { id } = req.params;
    const { variations } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `'${id}' is not a valid experiment id` });
    }

    if (!Array.isArray(variations) || variations.length === 0) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: "variations must be a non-empty array of { key, probability }" });
    }

    for (const item of variations) {
        if (!item || typeof item.key !== "string" || !item.key.trim()) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ msg: "Every item needs a non-empty string key" });
        }
        if (!Number.isInteger(item.probability) || item.probability < 0 || item.probability > 100) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                msg: `probability for '${item.key}' must be a whole number from 0 to 100`,
            });
        }
    }

    const requestedKeys = variations.map((v) => v.key);
    if (new Set(requestedKeys).size !== requestedKeys.length) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: "Each variation key can appear only once" });
    }

    const total = variations.reduce((sum, v) => sum + v.probability, 0);
    if (total !== 100) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `Probabilities must add up to 100 (received ${total})` });
    }

    const experiment = await codeModel.findById(id);
    if (!experiment) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `No experiment found with id ${id}` });
    }

    const existingKeys = experiment.variations.map((v) => v.key);

    const unknown = requestedKeys.filter((k) => !existingKeys.includes(k));
    if (unknown.length > 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            msg: `Variation(s) not found in this experiment: ${unknown.join(", ")}`,
        });
    }

    const missing = existingKeys.filter((k) => !requestedKeys.includes(k));
    if (missing.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            msg: `Include every variation of the experiment. Missing: ${missing.join(", ")}`,
        });
    }

    const probabilityByKey = new Map(variations.map((v) => [v.key, v.probability]));
    experiment.variations.forEach((v) => {
        v.probability = probabilityByKey.get(v.key);
    });

    try {
        await experiment.save();
    } catch (err) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }

    res.status(StatusCodes.OK).json({ result: experiment });
};

const deleteVariation = async (req, res) => {
    const { id, variationKey } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `'${id}' is not a valid experiment id` });
    }

    const experiment = await codeModel.findById(id);
    if (!experiment) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `No experiment found with id ${id}` });
    }

    const index = experiment.variations.findIndex((v) => v.key === variationKey);
    if (index === -1) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `Variation '${variationKey}' not found in this experiment` });
    }

    if (experiment.variations.length <= MIN_VARIATIONS) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `An experiment must keep at least ${MIN_VARIATIONS} variations` });
    }

    experiment.variations.splice(index, 1);

    const remaining = experiment.variations;
    const total = remaining.reduce((sum, v) => sum + v.probability, 0);

    if (total === 0) {
        const even = Math.floor(100 / remaining.length);
        remaining.forEach((v) => (v.probability = even));
    } else {
        remaining.forEach((v) => {
            v.probability = Math.round((v.probability / total) * 100);
        });
    }

    const newTotal = remaining.reduce((sum, v) => sum + v.probability, 0);
    remaining[remaining.length - 1].probability += 100 - newTotal;

    try {
        await experiment.save();
    } catch (err) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }

    res.status(StatusCodes.OK).json({ result: experiment });
};

const deleteExperiment = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `'${id}' is not a valid experiment id` });
    }

    const result = await codeModel.findByIdAndDelete(id);

    if (!result) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ msg: `No experiment found with id ${id}` });
    }

    res.status(StatusCodes.OK).json({ msg: "Experiment deleted successfully", result });
};

module.exports = { getAllExperiment, getOneExperiment, createNewExperiment, updateExistingCode, deleteVariation, deleteExperiment, updateProbabilities};