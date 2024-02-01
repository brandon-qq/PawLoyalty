var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database');

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('This is the AUTH API');
});

// You might want to move this to a more secure place
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/login', async function (req, res) {
    const { email, password, cardNumber } = req.body;

    if (!password || (!email && !cardNumber)) {
        return res.status(400).json({ error: 'Password and either email or card number are required' });
    }

    try {
        let userQuery = ``;
        let queryParam = [];

        if (email) {
            userQuery = `SELECT 
            user.id AS user_id, 
            userrole.id AS userrole_id, 
            user.email, 
            user.password, 
            user.firstname, 
            user.infix, 
            user.lastname, 
            user.phonenumber, 
            userrole.role_id
        FROM users AS user
        LEFT JOIN userrole AS userrole ON user.id = userrole.user_id
        WHERE user.email = ?;
            `;
            queryParam = [email];
        } else if (cardNumber) {
            userQuery = `SELECT 
            user.id AS user_id, 
            cards.id AS card_id, 
            userrole.id AS userrole_id, 
            user.email, 
            user.password, 
            user.firstname, 
            user.infix, 
            user.lastname, 
            user.phonenumber, 
            cards.cardNumber, 
            cards.state, 
            userrole.role_id
        FROM cards AS cards
        JOIN users AS user ON user.id = cards.user_id
        LEFT JOIN userrole AS userrole ON user.id = userrole.user_id
        WHERE cards.cardNumber = ? AND cards.state = 1;
            `;
            queryParam = [cardNumber];
        }

        // Retrieve the user from the database
        db.query(userQuery, queryParam, async function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (result.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result[0];

            // Compare password
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Password is correct, create JWT
            const token = jwt.sign({ email: user.email, userrole_id: user.userrole_id, user_id: user.user_id, role_id: user.role_id }, JWT_SECRET, {
                expiresIn: '48h' // expires in 48 hours
            });

            // Send the JWT to the client
            res.json({ message: 'Authentication successful', user: { email: user.email, userrole_id: user.userrole_id, user_id: user.user_id, role_id: user.role_id }, token });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('firstname').isLength({ min: 2 }),
    body('lastname').isLength({ min: 2 }),
    body('phonenumber').isLength({ min: 6 }),
    body('cardNumber').isLength({ min: 10 }),
], async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstname, infix, lastname, phonenumber, cardNumber } = req.body;

    if (!cardNumber) {
        return res.status(400).json({ error: 'CardNumber is required!' });
    }

    if (!cardNumber.startsWith('2401160930')) {
        return res.status(400).json({ error: 'cardNumber doesnt start with 2401160930!' });
    }

    const sum = String(cardNumber)
        .split('')
        .map(digit => parseInt(digit, 10))
        .reduce((num, val) => num + val, 0);

    const result = sum / 13;
    const isInt = Number.isInteger(result);

    if (!isInt) {
        return res.status(400).json({ error: 'Invalid cardNumber!' });
    }

    db.query('SELECT * FROM cards WHERE cardNumber = ?', [cardNumber], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    
        if (result.length > 0 && result[0].user_id !== null) {
            return res.status(400).json({ error: 'cardNumber already in use!' });
        }
    });

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        db.query('SELECT * FROM users WHERE email = ?', [email], async function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (result.length) {
                return res.status(409).json({ error: 'Email is already taken' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Store the new user in the database
            db.query('INSERT INTO users (email, password, firstname, infix, lastname, phonenumber) VALUES (?, ?, ?, ?, ?, ?)', [email, hashedPassword, firstname, infix, lastname, phonenumber], function (err, userresult) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                db.query('INSERT INTO userrole (user_id, role_id) VALUES (?, ?)', [userresult.insertId, 1], function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    const query = "UPDATE cards SET user_id = ?, state = ? WHERE cardNumber = ?";
                    db.query(query, [userresult.insertId, 1, cardNumber], function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Internal server error 1' });
                        }
                        res.status(201).json({ message: 'active User created successfully', data: { user_id: userresult.insertId, role_id: 1 } });

                    });
                });
            });
        });
    } catch (error) {
        // Handle possible errors
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/decrypt', async function (req, res, next) {
    const headerToken = req.header('Authorization');

    if (!headerToken) {
        return res.status(401).send({ message: 'No token provided' });
    }

    const tokenParts = headerToken.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).send({ message: 'Unauthorized: Token is not in proper format' });
    }

    const token = tokenParts[1];

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(201).json({ decoded: decoded });
    } catch (error) {
        console.error(error);
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(400).json({ error: 'Invalid Token' });
        } else if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token has expired' });
        } else {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;
