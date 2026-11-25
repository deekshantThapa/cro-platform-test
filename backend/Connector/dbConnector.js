const mongoose = require("mongoose");

const connections = {
    experiments: mongoose.createConnection(),
    users: mongoose.createConnection(),
};

const getConfigs = () => [
    {
        name: "experiments",
        uri: process.env.MONGO_URI,
        dbName: process.env.EXPERIMENTS_DB_NAME || "experiments",
    },
    {
        name: "users",
        uri: process.env.USERS_MONGO_URI || process.env.MONGO_URI,
        dbName: process.env.USERS_DB_NAME || "users",
    },
];

const connectOne = async ({ name, uri, dbName }) => {
    try {
        await connections[name].openUri(uri, {
            dbName,
            serverSelectionTimeoutMS: 30000,
        });
        console.log(`Connected to "${dbName}" (${name})`);
    } catch (err) {
        console.error(`Connection failed for "${name}":`, err.message);

        if (err.reason && err.reason.servers) {
            for (const [host, desc] of err.reason.servers) {
                console.error(host, "->", desc.error);
            }
        }

        throw err;
    }
};

const connectAll = async () => {
    try {
        await Promise.all(getConfigs().map(connectOne));
    } catch (err) {
        await Promise.allSettled(
            Object.values(connections).map((conn) => conn.close())
        );
        throw err;
    }
};

module.exports = { connections, connectAll };