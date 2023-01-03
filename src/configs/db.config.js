const util = require('util');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB_NAME,
});

const query = (sql, args) => {
  return util.promisify(db.query).call(db, sql, args);
};

module.exports = { db, query };
