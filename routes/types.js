var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', checkRole([1, 2, 3]), function(req, res, next) {
    res.send('respond with a types resource');
  });

router.get('/all', checkRole([1, 3]), function(req, res) {
    db.query('SELECT * FROM types', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.post('/create', checkRole([3]), function(req, res) {
    const { name } = req.body;

    // Corrected SQL query with placeholders for prepared statement
    const query = "INSERT INTO types (name) VALUES (?)";
    db.query(query, [name], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            // Respond with the result of the INSERT operation
            res.status(200).json({ result });
        }
    });
});

router.post('/remove', checkRole([3]), function(req, res) {
    const id = req.body.id;

    // First, set the type_id to NULL in the brands table for the referencing rows
    let query = "UPDATE brands SET type_id = NULL WHERE type_id = ?";
    db.query(query, id, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            // Then, delete the type from the types table
            query = "DELETE FROM types WHERE id = ?";
            db.query(query, id, function (err, result) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Internal server error' });
                } else {
                    // Respond with the result of the DELETE operation
                    res.status(200).json({ result });
                }
            });
        }
    });
});

router.post('/edit', checkRole([3]), function(req, res) {
    const { name, id } = req.body;

    const query = "UPDATE types SET name = ? WHERE types.id = ?;";
    db.query(query, [name, id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

module.exports = router;
