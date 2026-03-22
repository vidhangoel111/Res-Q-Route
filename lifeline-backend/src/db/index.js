const env = require("../config/env");
const mongoDb = require("./mongo");
const mySqlDb = require("./mysql");

const adapter = env.DB_PROVIDER === "mysql" ? mySqlDb : mongoDb;

module.exports = adapter;
