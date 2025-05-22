const {Client} = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'showroom_project',
    password: '12345', // ✅ Use actual password
    port: 5432,
});

async function check() {
    await client.connect()
    .then(() => console.log('Successfully Connected to Database'))
    .catch(err => console.log('Could Not Connect to Database'));
}

check();

module.exports = client;