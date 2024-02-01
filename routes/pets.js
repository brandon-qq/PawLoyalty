var express = require('express');
var router = express.Router();
const db = require('../database');
const { body, validationResult } = require('express-validator');
const checkRole = require('../middleware')

router.get('/', function (req, res, next) {
    res.send('respond with pet resource');
});

router.get('/getuserpet', checkRole([1, 3]), function (req, res) {
    const decoded = req.user; // Get the decoded token information

    // Prepare SQL query with conditional joins
    const sqlQuery = `
        SELECT 
            pets.id AS pet_id,
            pets.name AS pet_name,
            pets.DOB AS pet_DOB,
            pets.userrole_id AS pet_userrole_id,
            
            breedfoods.id AS breedfood_id,
            -- Include other breedfoods columns as needed, with aliases
            
            -- Join with brands only if breedfoods.brand_id is not NULL
            CASE
                WHEN breedfoods.brand_id IS NOT NULL THEN brands.id
                ELSE NULL
            END AS brand_id,
            brands.name AS brand_name,
            brands.price AS brand_price,
            brands.description AS brand_description,
            
            -- Join with types only if brands.type_id is not NULL
            CASE
                WHEN brands.type_id IS NOT NULL THEN types.id
                ELSE NULL
            END AS type_id,
            types.name AS type_name,
            
            -- Join with species only if breedfoods.species_id is not NULL
            CASE
                WHEN breedfoods.species_id IS NOT NULL THEN species.id
                ELSE NULL
            END AS species_id,
            species.name AS species_name,
            
            -- Join with breeds only if species.breed_id is not NULL
            CASE
                WHEN species.breed_id IS NOT NULL THEN breeds.id
                ELSE NULL
            END AS breed_id,
            breeds.name AS breed_name
        FROM 
            pets
        LEFT JOIN breedfoods ON breedfoods.id = pets.breedfood_id
        LEFT JOIN brands ON breedfoods.brand_id = brands.id AND breedfoods.brand_id IS NOT NULL
        LEFT JOIN types ON brands.type_id = types.id AND brands.type_id IS NOT NULL
        LEFT JOIN species ON breedfoods.species_id = species.id AND breedfoods.species_id IS NOT NULL
        LEFT JOIN breeds ON species.breed_id = breeds.id AND species.breed_id IS NOT NULL
        WHERE pets.userrole_id = ?;
    `;

    // Query the database, passing the userrole_id from the decoded token
    db.query(sqlQuery, [decoded.userrole_id], function (err, result) {
        if (err) {
            console.error('SQL Error: ', err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ result }); // Send the query result as the response
        }
    });
});

router.get('/pets', checkRole([3]), function (req, res) {
    db.query('SELECT * FROM pets', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({ result });
    });
});

router.get('/lookup', checkRole([3]), function (req, res) {
    const user_id = req.body.user_id;
    db.query('SELECT * FROM pets WHERE userrole_id = ?', [user_id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({ result });
    });
});

router.post('/create', checkRole([1, 3]), [
    body('name').isLength({ max: 30 }),
    body('DOB').isLength({ max: 30 }),
], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { species_id, brand_id, name, DOB } = req.body;
    const decoded = req.user; // Get the decoded token information

    const dobDate = new Date(DOB * 1000);
    const currentDate = new Date();
    if (dobDate > currentDate) {
        return res.status(400).json({ error: 'DOB cannot be in the future' });
    }

    db.query('INSERT INTO breedfoods (species_id, brand_id) VALUES (?, ?)', [species_id, brand_id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const breedfood_id = result.insertId;

        db.query('INSERT INTO pets (name, DOB, userrole_id, breedfood_id) VALUES (?, ?, ?, ?)', [name, DOB, decoded.userrole_id, breedfood_id], function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(200).json({ result });
        });
    });
});

router.post('/remove', checkRole([1, 3]), function (req, res) {
    const id = req.body.id;

    const query = "DELETE FROM pets WHERE id = ?";
    db.query(query, id, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({ result });
    });
});

router.post('/edit', checkRole([1, 3]), [
    body('name').isLength({ max: 30 }),
    body('DOB').isLength({ max: 30 }),
], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, DOB, id } = req.body;

    const query = "UPDATE pets SET name = ?, DOB = ? WHERE id = ?";
    db.query(query, [name, DOB, id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found' });
        } else {
            return res.status(200).json({ result });
        }
    });
});

router.get('/breedfoods', checkRole([1, 3]), function (req, res) {
    const query = `
    SELECT 
        breedfoods.id AS breedfoods_id, 
        breedfoods.species_id, 
        breedfoods.brand_id, 
        brands.id AS brand_id, 
        brands.type_id AS brand_type_id, 
        brands.name AS brand_name, 
        brands.price AS brand_price, 
        brands.description AS brand_description, 
        brands.image_cdn AS brand_image_cdn,
        types.id AS type_id, 
        types.name AS type_name, 
        species.id AS species_id, 
        species.name AS species_name, 
        species.breed_id AS species_breed_id, 
        breeds.id AS breed_id, 
        breeds.name AS breed_name
    FROM breedfoods
    LEFT JOIN brands ON breedfoods.brand_id = brands.id 
    LEFT JOIN types ON brands.type_id = types.id 
    LEFT JOIN species ON breedfoods.species_id = species.id 
    LEFT JOIN breeds ON species.breed_id = breeds.id`;

    db.query(query, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            return res.status(200).json({ result });
        }
    });
});

module.exports = router;
