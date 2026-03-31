const env = require("../config/env");
const mongoDb = require("./mongo");
const mySqlDb = require("./mysql");
const memoryDb = require("./memory");

const adapters = {
	mongo: mongoDb,
	mysql: mySqlDb,
	memory: memoryDb,
};

let selectedProvider = env.DB_PROVIDER;
const hasExplicitDbProvider = Object.prototype.hasOwnProperty.call(process.env, "DB_PROVIDER");

if (selectedProvider === "mongo" && !env.MONGO_URI) {
	selectedProvider = "memory";
	if (hasExplicitDbProvider) {
		console.warn("DB_PROVIDER is set to mongo but MONGO_URI is missing. Falling back to in-memory database.");
	}
}

const adapter = adapters[selectedProvider] || memoryDb;

module.exports = adapter;
