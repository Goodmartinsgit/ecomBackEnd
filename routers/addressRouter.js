const express = require('express');
const addressRouter = express.Router();
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { isUser } = require('../middlewares/auth');

// Routes: /api/addresses
addressRouter.get('/', isUser, getAddresses);
addressRouter.post('/', isUser, createAddress);
addressRouter.patch('/:addressId', isUser, updateAddress);
addressRouter.delete('/:addressId', isUser, deleteAddress);
addressRouter.patch('/:addressId/set-default', isUser, setDefaultAddress);

module.exports = addressRouter;
