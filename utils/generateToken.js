const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

function generateToken(user) {
  const { firstname, lastname, email, phone, image, address, role, uuid, id } = user;

  if (!firstname) {
    console.log("Missing firstname field!");
  }
  if (!lastname) {
    console.log("Missing lastname field!");
  }
  if (!email) {
    console.log(" message: Missing email field!");
  }
  if (!phone) {
    console.log("Missing phone field!");
  }
  if (!address) {
    console.log("Missing address field!");
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