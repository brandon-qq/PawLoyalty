var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', checkRole([1, 2, 3]), function(req, res, next) {
    res.send('respond with a species resource');
  });


router.get('/all', checkRole([1, 3]), function(req, res) {
    db.query('SELECT * FROM species', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/join', checkRole([1, 3]), function(req, res) {
    db.query(`SELECT species.id, species.breed_id, species.name as species_name, breeds.name as breed_name 
    FROM species 
    LEFT JOIN breeds ON species.breed_id = breeds.id;`, 
    function (err, rows) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            let speciesResult = {};

            // Loop over each row and organize by species name
            rows.forEach(row => {
                let speciesName = row.species_name.toLowerCase();
                if (!speciesResult[speciesName]) {
                    speciesResult[speciesName] = [];
                }
                if (row.breed_id !== null) { // Only add if there's a breed_id
                    speciesResult[speciesName].push({
                        id: row.id,
                        breed_id: row.breed_id,
                        name: row.breed_name
                    });
                }
            });

            // Convert the result object to the desired array format
            let speciesArray = Object.keys(speciesResult).map(speciesName => {
                let speciesObject = {};
                speciesObject[speciesName] = speciesResult[speciesName];
                return speciesObject;
            });

            res.status(200).json({ "species": speciesArray });
        }
    });
});

router.post('/create', checkRole([3]), function(req, res) {
    const { species_name } = req.body;

    const query = "INSERT INTO `species` (`name`) VALUES (?);";
    db.query(query, [species_name], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ result });
        }
    });
});


router.post('/remove', checkRole([3]), function(req, res) {
    const name = req.body.name;

    // Corrected DELETE SQL query
    const query = "DELETE FROM species WHERE name = ?";
    db.query(query, name, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            // Respond with the result of the DELETE operation
            res.status(200).json({ result });
        }
    });
});

module.exports = router;
