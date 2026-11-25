const mongoose = require("mongoose");
const { connections } = require("../Connector/dbConnector");

const userSchema = new mongoose.Schema( 
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },
    },
    { timestamps: true }
);

module.exports = connections.users.model("user", userSchema);