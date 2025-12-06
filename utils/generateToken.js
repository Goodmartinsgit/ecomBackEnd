const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

function generateToken(user) {
  const { firstname, lastname, email, phone, image, address, role, uuid, id } = user;

  if (!email || !id) {
    throw new Error("Email and ID are required for token generation");
  }

  const payload = {
    id,
    uuid,
    firstname,
    lastname,
    email,
    phone,
    address,
    image,
    role,
  };

  const option = {
    expiresIn: "2h",
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY, option);
}

module.exports = generateToken;