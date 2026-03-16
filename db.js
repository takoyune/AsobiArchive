const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'hsr_audio.sqlite');

let dbInstance = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Create schema
    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            character TEXT,
            game TEXT,
            chapter TEXT,
            version TEXT,
            category TEXT,
            audioUrl TEXT,
            thumbnailUrl TEXT,
            tags TEXT
        );


    `);


    return dbInstance;
}

module.exports = { getDb };
