var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', checkRole([1, 2, 3]), function(req, res, next) {
    res.send('respond with a brands resource');
  });


router.get('/all', checkRole([1, 3]), function(req, res) {
    db.query('SELECT * FROM brands', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/alltype', checkRole([1, 3]), function(req, res) {
    db.query('SELECT brands.*, types.name AS type_name FROM brands AS brands INNER JOIN types AS types ON brands.type_id = types.id', function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            // New logic to reformat the result
            let reformattedResult = {};
            result.forEach(item => {
                // Check if the brand is already added
                if (!reformattedResult[item.name]) {
                    reformattedResult[item.name] = [];
                }
                // Add the item to the brand
                reformattedResult[item.name].push({
                    id: item.id,
                    type_id: item.type_id,
                    price: item.price,
                    description: item.description,
                    image_cdn: null, // Set to null as per your example
                    type_name: item.type_name
                });
            });

            // Convert the object to an array of objects
            let brandsArray = [];
            for (const brand in reformattedResult) {
                let brandObj = {};
                brandObj[brand] = reformattedResult[brand];
                brandsArray.push(brandObj);
            }

            res.status(200).json({ brands: brandsArray });
        }
    });
});

router.get('/join', checkRole([1, 3]), function(req, res) {
    db.query(`SELECT brands.id, brands.image_cdn, brands.type_id, brands.name as brands_name, brands.price, brands.description, types.name as types_name FROM brands LEFT JOIN types ON brands.type_id = types.id;`, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/join/:id', checkRole([1, 3]), function(req, res) {
    const brandId = req.params.id; // Get the ID from the URL parameters

    // Updated query with a WHERE clause to filter by the provided brand ID
    db.query(`SELECT brands.id, brands.image_cdn, brands.type_id, brands.name as brands_name, brands.price, brands.description, types.name as types_name FROM brands LEFT JOIN types ON brands.type_id = types.id WHERE brands.id = ?;`, [brandId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({result});
        }
    });
});

router.post('/create', checkRole([3]), function(req, res) {
    const { name, price, type_id, description } = req.body;

    const query = "INSERT INTO brands (name, price, type_id, description) VALUES (?, ?, ?, ?)";
    db.query(query, [name, price, type_id, description], function (err, result) {
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

    const query = "DELETE FROM brands WHERE name = ?";
    db.query(query, name, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ result });
        }
    });
});

router.post('/edit', checkRole([3]), function(req, res) {
    const { name, price, type_id, description, id } = req.body;

    const query = "UPDATE brands SET name = ?, price = ?, type_id = ?, description = ? WHERE id = ?";
    db.query(query, [name, price, type_id, description, id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ result });
        }
    });
});

module.exports = router;
