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

// --- 1. Logging Setup (Winston) ---
// Note: Create a 'logs' directory if it doesn't exist
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

// Also log to console in non-production
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}


// --- 2. Security & Performance Middleware ---

// Basic Security Headers (Helmet)
// Disabling contentSecurityPolicy temporarily to ensure local audio/images load without strict config.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS Policy (Allow all origins for now, restrict in production if needed)
app.use(cors());

// Compression (Gzip responses for faster loading)
app.use(compression());

// HTTP Request Logging (Morgan)
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));

// Body Parsing
app.use(bodyParser.json());
app.use(express.json());


// --- 3. Rate Limiting (Anti-Scraping) ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});


// --- 4. Static Files & Audio Routing ---

// Serve audio files with proper Cache-Control and Range Request Support
app.get(/\.(ogg|mp3|wav|flac|m4a)$/i, (req, res, next) => {
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Cache layer: Audio files rarely change, cache them aggressively in the browser
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.setHeader('Accept-Ranges', 'bytes');
    
    next(); // Let express.static handle the actual file serving and any 404s natively
});

// Serve frontend assets (HTML, CSS, JS, Img) from current directory cache them for a day
app.use(express.static(__dirname, {
    maxAge: '1d', // 1 day caching for static assets
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            // Don't cache HTML to ensure users get the latest version
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));


// --- 5. API Endpoints ---

// API: Health Check (For Server Monitoring tools / VPS)
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
        // Parse the JSON tags string back into an array for the frontend
        const tracks = rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }));
        res.json(tracks);
    } catch (error) {
        // Pass error to the central error handler
        next(error);
    }
});

// API: Update Track
app.post('/api/update-track', apiLimiter, async (req, res, next) => {
    const { id, character, tags } = req.body;
    
    // File/Input Sanitization: Basic check to ensure ID exists
    if (!id) return res.status(400).json({ success: false, message: 'Track ID is required.' });

    try {
        const db = await getDb();

        let query = 'UPDATE tracks SET ';
        const params = [];
        if (character !== undefined) { query += 'character = ?, '; params.push(character); }
        if (tags !== undefined) { query += 'tags = ?, '; params.push(JSON.stringify(tags)); }

        // Remove trailing comma
        query = query.slice(0, -2) + ' WHERE id = ?';
        params.push(id); // Parameterized query protects against SQL Injection

        await db.run(query, params);
        res.json({ success: true, message: 'Track updated successfully.' });

    } catch (error) {
        // Pass error to the central error handler
        next(error);
    }
});


// --- 6. Custom Error Pages ---

// 404 Not Found Handler (Catch-all for undefined routes)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: "404 Not Found",
        message: `The endpoint ${req.originalUrl} does not exist.`
    });
});

// 500 Internal Server Error Handler (Centralized error logger)
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    console.error(err.stack); // Print stack to console for local debugging

    res.status(err.status || 500).json({
        success: false,
        error: "Internal Server Error",
        message: "An unexpected error occurred. Please try again later."
    });
});


// --- 7. Start Server ---
app.listen(PORT, () => {
    logger.info(`Server started securely on port ${PORT}`);
    console.log(`🚀 Production Server running at http://localhost:${PORT}`);
    console.log(`🩺 Health Check API available at http://localhost:${PORT}/api/health`);
});
