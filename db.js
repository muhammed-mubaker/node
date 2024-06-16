// db.js
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Use your MySQL username
    password: '', // Use your MySQL password
    database: 'chat_app'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to the MySQL server.');
});

module.exports = connection;
