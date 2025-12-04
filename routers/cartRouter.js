const express = require("express");
const { addToCart, getCart, updateCart, deleteCart } = require('../controllers/cartController')
const { isUser } = require("../middlewares/auth");
const cartRouter = express.Router()

// Routes: /api/cart
cartRouter.post('/', isUser, addToCart)
cartRouter.get('/:userid', isUser, getCart)
cartRouter.patch('/', isUser, updateCart)
cartRouter.delete('/:userid', isUser, deleteCart)

module.exports = cartRouter