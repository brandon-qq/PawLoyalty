const jwt = require('jsonwebtoken');

// Middleware for checking the token and role
function checkRole(roleIds) {
  return function (req, res, next) {
    const headerToken = req.header('Authorization');

    if (!headerToken) {
      return res.status(401).send({ message: 'No token provided' });
    }

    // if the token is sent as 'Bearer <token>'
    const tokenParts = headerToken.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).send({ message: 'Unauthorized: Token is not in proper format' });
    }

    const token = tokenParts[1];

    jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
      if (err) {
        return res.status(401).send({ message: 'Unauthorized: Invalid token' });
      }
      // Check if the role ID is one of the acceptable role IDs
      if (!roleIds.includes(decoded.role_id)) {
        return res.status(403).send({ message: 'Forbidden: User does not have the right role' });
      }

      // Token and role are valid
      req.user = decoded; // attach user to request object
      console.log(`User logged in!`);
      next(); // proceed to the next middleware/route handler
    });
  };
}

module.exports = checkRole;