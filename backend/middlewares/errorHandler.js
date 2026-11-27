const { StatusCodes } = require("http-status-codes");

const notFound = (req, res) =>
    res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `Route ${req.method} ${req.originalUrl} not found` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid JSON body" });
    }
    if (err.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }
    if (err.name === "CastError") {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ msg: `Invalid value for '${err.path}'` });
    }

    console.error(err);
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ msg: "Something went wrong, please try again later" });
};

module.exports = { notFound, errorHandler };
