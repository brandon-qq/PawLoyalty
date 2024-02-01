var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
require('dotenv').config(); // Load the environment variables from the .env file

const multer = require('multer');
const db = require('./database'); // Import the database connection
const checkRole = require('./middleware'); // Import the middleware connection

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var cardsRouter = require('./routes/cards');
var petsRouter = require('./routes/pets');
var authRouter = require('./routes/auth');
var typesRouter = require('./routes/types');
var breedsRouter = require('./routes/breeds');
var speciesRouter = require('./routes/species');
var petsRouter = require('./routes/pets');
var brandsRouter = require('./routes/brands');

var app = express();
app.use(cors()); // Enable CORS

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for general use
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB upload limit
});

// Configure multer specifically for image uploads
const { v4: uuidv4 } = require('uuid');

const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Set the destination
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4() + path.extname(file.originalname); // Generate a unique suffix
        cb(null, file.fieldname + '-' + uniqueSuffix); // Set the file name
    }
});

// File filter to accept images only
const imageFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const imageUpload = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB upload limit
});

// Upload endpoint for images
app.patch('/brands/upload', checkRole([3]), imageUpload.single('brand-image'), (req, res) => {
    if (!req.file || !req.body.id) {
        let errorMessage = '';
    
        // Construct an error message based on what is missing
        if (!req.file) {
            errorMessage += 'No image uploaded. ';
        }
        if (!req.body.id) {
            errorMessage += 'No brand ID provided. ';
        }
    
        // Return a 400 status with the constructed error message
        return res.status(400).json({ error: errorMessage.trim() });
    }

    // Assuming the brand ID is passed through the request (e.g., in the body or as a query parameter)
    const brandId = req.body.id;

    // Update the image CDN path in the database
    db.query("UPDATE `brands` SET `image_cdn` = ? WHERE `brands`.`id` = ?", [`http://localhost:3000/uploads/${req.file.filename}`, brandId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({
                message: 'Image uploaded successfully!',
                file: req.file,
                cdn: `http://localhost:3000/uploads/${req.file.filename}`,
                result
            });
        }
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            // This error code is used when the field name is not expected
            return res.status(400).json({ error: "Invalid field name for file upload." });
        }
    } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(400).json({ error: err.message });
    }

    // If this middleware was reached without an error, pass control to the next middleware
    next();
});

// Cache and serve files from 'uploads'
app.use('/uploads', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Apply multer's none() method globally after defining the /upload route
app.use(upload.none());

// Other routes
app.use('/', indexRouter);
app.use('/middleware', checkRole([1, 2, 3]), indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/cards', cardsRouter);
app.use('/pets', petsRouter);
app.use('/types', typesRouter);
app.use('/breeds', breedsRouter);
app.use('/brands', brandsRouter);
app.use('/species', speciesRouter);
app.use('/pets', petsRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
    // Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
