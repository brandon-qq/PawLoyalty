var express = require('express');
var router = express.Router();
const db = require('../database');
const checkRole = require('../middleware')

router.get('/', checkRole([1, 2, 3]), function(req, res, next) {
    res.send('respond with a user resource');
  });


router.get('/all', checkRole([3]), function(req, res) {
    db.query(`SELECT users.id, users.email, users.firstname, users.infix, users.lastname, users.phonenumber FROM users`, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/alluserswithcards', checkRole([3]), function(req, res) {
  db.query(`SELECT 
  users.id, 
  users.email, 
  users.firstname, 
  users.infix, 
  users.lastname, 
  users.phonenumber, 
  cards.*,
  roles.roleName
FROM 
  users
JOIN 
  cards ON cards.user_id = users.id
JOIN 
  userrole ON userrole.user_id = users.id
JOIN 
  roles ON userrole.role_id = roles.id`, function (err, result) {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
      } else res.status(200).json({result});
  });
});

router.get('/lookup', checkRole([3]), function(req, res) {
    const { id } = req.body;
    db.query('SELECT * FROM users WHERE id = ?;', [id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.get('/getaccount', checkRole([1, 3]), function(req, res) {
  const decoded = req.user.user_id;
  db.query(`SELECT
    users.id, 
    users.email, 
    users.firstname, 
    users.infix, 
    users.lastname, 
    users.phonenumber, 
    cards.*

    FROM users 
    
    JOIN cards ON cards.user_id = users.id
    
    WHERE users.id = ?;`, [decoded], function (err, result) {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
      } else res.status(200).json({result});
  });
});

router.post('/edit', checkRole([1, 3]), function(req, res) {
    const { firstname, id } = req.body;

    const query = "UPDATE users SET firstname = ? WHERE id = ?;";
    db.query(query, [firstname, id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
});

router.post('/state', checkRole([3]), function(req, res) {
    const user_id = req.body.user_id;
    const role_id = req.body.role_id;

    if (!user_id || !role_id) {
        return res.status(400).send('Please give both user_id and role_id!');
    }

    const query = "UPDATE userrole SET role_id = ? WHERE user_id = ?";
    db.query(query, [role_id, user_id], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        } else res.status(200).json({result});
    });
})

module.exports = router;
