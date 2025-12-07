const express = require("express");
const { addToCart, getCart, updateCart, deleteCart } = require('../controllers/cartController')
const { isUser } = require("../middlewares/auth");
const { validateCartItemData, validateIdParam } = require("../middlewares/validation");
const cartRouter = express.Router()

// Routes: /api/cart
cartRouter.post('/', isUser, validateCartItemData, addToCart)
cartRouter.get('/:userid', isUser, validateIdParam('userid'), getCart)
cartRouter.patch('/', isUser, updateCart)
cartRouter.delete('/:userid', isUser, validateIdParam('userid'), deleteCart)

module.exports = cartRouter