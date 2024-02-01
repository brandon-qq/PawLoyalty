var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', function(req, res, next) {
    res.send('respond with a resource');
  });

router.post('/validate', function(req, res) {
    const cardNumber = req.body.cardNumber;

    if (!cardNumber) {
        return res.status(400).send('CardNumber is required!');
    }

    if (!cardNumber.startsWith('2401160930')) {
        return res.status(400).send('Invalid cardNumber!');
    }

    const sum = String(cardNumber)
        .split('')
        .map(digit => parseInt(digit, 10))
        .reduce((num, val) => num + val, 0);

    const result = sum / 13;
    const isInt = Number.isInteger(result);

    if (!isInt) {
        return res.status(400).send('Invalid cardNumber!');
    }

    db.query('SELECT * FROM cards WHERE cardNumber = ?', [cardNumber], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (result.length) {
            return res.status(200).send('Valid cardNumber!');
        } else {
            return res.status(400).send('Invalid cardNumber!');
        }
    });
});

router.get('/cards', checkRole([3]),function(req, res) {
    db.query('SELECT * FROM cards', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/lookup', checkRole([3]), function(req, res) {
    const user_id = req.body.user_id
    db.query('SELECT * FROM cards WHERE user_id = ?', [user_id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.post('/create', checkRole([3]),function(req, res) {
    const cardNumber = req.body.cardNumber;

    if (!cardNumber) {
        return res.status(400).send('CardNumber is required!');
    }

    const mix = '2401160930' + cardNumber;
    const sum = String(mix)
        .split('')
        .map(digit => parseInt(digit, 10))
        .reduce((num, val) => num + val, 0);

    const result = sum / 13;
    const isInt = Number.isInteger(result);

    if (!isInt) {
        return res.status(400).send('Invalid cardNumber!');
    }

    const query = 'INSERT INTO cards (cardNumber, state) VALUES (?, 2)';
    db.query(query, [mix], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({result});
        }
    });
});

router.post('/state', checkRole([3]), function(req, res) {
    const cardNumber = req.body.cardNumber;
    const state = req.body.state;

    if (!cardNumber || !state) {
        return res.status(400).send('Please give both cardNumber and state!');
    }

    const query = "UPDATE cards SET state = ? WHERE cardNumber = ?";
    db.query(query, [state, cardNumber], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
})

module.exports = router;
