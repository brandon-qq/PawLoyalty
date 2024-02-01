var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', checkRole([1, 2, 3]), function(req, res, next) {
    res.send('respond with a breeds resource');
  });

router.get('/all', checkRole([1, 3]), function(req, res) {
    db.query('SELECT * FROM breeds', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.post('/create', checkRole([3]), function(req, res) {
    const { breeds_name, species_name } = req.body;

    db.beginTransaction(function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // Use INSERT IGNORE to avoid inserting duplicate breeds
        db.query("INSERT IGNORE INTO breeds (name) VALUES (?)", [breeds_name], function (err, breedsResult) {
            if (err) {
                return db.rollback(function() {
                    console.error(err);
                    res.status(500).json({ error: 'Internal server error' });
                });
            }

            // After attempting to insert the breed, get its ID (whether newly inserted or existing)
            db.query("SELECT id FROM breeds WHERE name = ?", [breeds_name], function (err, breedSearchResult) {
                if (err) {
                    return db.rollback(function() {
                        console.error(err);
                        res.status(500).json({ error: 'Internal server error' });
                    });
                }

                if (breedSearchResult.length === 0) {
                    return db.rollback(function() {
                        res.status(500).json({ error: 'Breed not found and could not be inserted' });
                    });
                }

                const breeds_id = breedSearchResult[0].id;

                // Insert into the species table
                db.query("INSERT INTO species (name, breed_id) VALUES (?, ?)", [species_name, breeds_id], function (err, speciesResult) {
                    if (err) {
                        return db.rollback(function() {
                            console.error(err);
                            res.status(500).json({ error: 'Internal server error' });
                        });
                    }

                    db.commit(function(err) {
                        if (err) {
                            return db.rollback(function() {
                                console.error(err);
                                res.status(500).json({ error: 'Internal server error' });
                            });
                        }
                        res.status(200).json({ breedsResult, speciesResult });
                    });
                });
            });
        });
    });
});

module.exports = router;
