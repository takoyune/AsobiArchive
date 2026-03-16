const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Production Packages
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging Setup (Winston)

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ]
});


if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}


// Security & Performance Middleware

// Helmet Security

app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors());

// Compression
app.use(compression());

// HTTP Logging
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));

// Body Parsing
app.use(bodyParser.json());
app.use(express.json());


// Rate Limiting (Anti-Scraping)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});


// Static Files & Audio Routing

// Audio files
app.get(/\.(ogg|mp3|wav|flac|m4a)$/i, (req, res, next) => {
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    
    res.setHeader('Cache-Control', 'public, max-age=86400'); 
    res.setHeader('Accept-Ranges', 'bytes');
    
    next(); 
});

// Static Assets
app.use(express.static(__dirname, {
    maxAge: '1d', 
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));


// API Endpoints

// Health API
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'UP', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API: Get all tracks
app.get('/api/tracks', apiLimiter, async (req, res, next) => {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM tracks');
        // Parse JSON tags
        const tracks = rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }));
        res.json(tracks);
    } catch (error) {
        
        next(error);
    }
});

// API: Update Track
app.post('/api/update-track', apiLimiter, async (req, res, next) => {
    const { id, character, tags } = req.body;
    
    
    if (!id) return res.status(400).json({ success: false, message: 'Track ID is required.' });

    try {
        const db = await getDb();

        let query = 'UPDATE tracks SET ';
        const params = [];
        if (character !== undefined) { query += 'character = ?, '; params.push(character); }
        if (tags !== undefined) { query += 'tags = ?, '; params.push(JSON.stringify(tags)); }

        
        query = query.slice(0, -2) + ' WHERE id = ?';
        params.push(id); 

        await db.run(query, params);
        res.json({ success: true, message: 'Track updated successfully.' });

    } catch (error) {
        
        next(error);
    }
});


// Custom Error Pages

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: "404 Not Found",
        message: `The endpoint ${req.originalUrl} does not exist.`
    });
});

// 500 Handler
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    console.error(err.stack); 

    res.status(err.status || 500).json({
        success: false,
        error: "Internal Server Error",
        message: "An unexpected error occurred. Please try again later."
    });
});


// Start Server
app.listen(PORT, () => {
    logger.info(`Server started securely on port ${PORT}`);
    console.log(`🚀 Production Server running at http://localhost:${PORT}`);
    console.log(`🩺 Health Check API available at http://localhost:${PORT}/api/health`);
});
