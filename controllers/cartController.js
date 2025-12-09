const { prisma } = require('../config/database');
const { validateCartItem, parseId, validateRequired } = require('../utils/validation');

// Add to cart
exports.addToCart = async (req, res) => {
    try {
        const { userId, productId, selectedColor, selectedSize, quantity } = req.validatedData; // Already validated by middleware

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!"
            });
        }
        
        const existingCart = await prisma.cart.upsert({
            where: { userId },
            update: {},
            create: { userId },
        })


        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product does not exist!"
            });
        }

        // Check if product already in cart with same size/color
        const existingCartItem = await prisma.productCart.findFirst({ where: { productId: productId, cartId: existingCart.id, selectedSize: selectedSize || null, selectedColor: selectedColor || null } });

        let cartItem;
        if (existingCartItem) { cartItem = await prisma.productCart.update({ where: { id: existingCartItem.id }, data: { quantity: existingCartItem.quantity + quantity } }); } else {
            // Add product to cart if it doesn't exist
            cartItem = await prisma.productCart.create({
                data: {
                    product: { connect: { id: productId } },
                    cart: { connect: { id: existingCart.id } },
                    selectedColor: selectedColor || null,
                    selectedSize: selectedSize || null,
                    quantity
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: existingCartItem ? "Cart quantity updated successfully" : "Item added to cart successfully",
            data: cartItem
        });

    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error!"
        });
    }
};


// Update cart
exports.updateCart = async (req, res) => {
    try {
        const { userid, productid, size, color, quantity } = req.body;
        
        validateRequired(userid, 'User ID');
        validateRequired(productid, 'Product ID');
        
        const userId = parseId(userid, 'User ID');
        const productId = parseId(productid, 'Product ID');
        const userCart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!userCart) {
            return res.status(404).json({
                success: false,
                message: "Cart does not exist!"
            });
        }

        const cartItem = await prisma.productCart.findFirst({ where: { productId: productId, cartId: userCart.id, selectedSize: size || null, selectedColor: color || null } });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart!"
            });
        }

        const payload = {};
        if (quantity !== undefined) {
            payload.quantity = parseId(quantity, 'Quantity');
        }
        if (size) {
            payload.selectedSize = size.toString().trim();
        }
        if (color) {
            payload.selectedColor = color.toString().trim();
        }

        const updatedCart = await prisma.productCart.update({ where: { id: cartItem.id },
            data: payload,
            include: { product: true }
        });

        return res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            data: updatedCart
        });

    } catch (error) {
        console.error("Update cart error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error!"
        });
    }
};


// Delete cart item
exports.deleteCart = async (req, res) => {
    try {
        const { userid: userId } = req.params; // Already validated by middleware
        const { productid } = req.body;
        
        validateRequired(productid, 'Product ID');
        const productId = parseId(productid, 'Product ID');
        const existingCart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!existingCart) {
            return res.status(404).json({
                success: false,
                message: "User cart does not exist!"
            });
        }

        const existingCartItem = await prisma.productCart.findFirst({ where: { productId: productId, cartId: existingCart.id } });

        if (!existingCartItem) {
            return res.status(404).json({
                success: false,
                message: "Cart item does not exist!"
            });
        }

        const deletedCartItem = await prisma.productCart.delete({ where: { id: existingCartItem.id } });

        return res.status(200).json({
            success: true,
            message: "Cart item deleted successfully",
            data: deletedCartItem
        });

    } catch (error) {
        console.error("Delete cart error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error!"
        });
    }
};


// Get cart
exports.getCart = async (req, res) => {
    try {
        const { userid: userId } = req.params; // Already validated by middleware
        // Check if user is authenticated and authorized
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        // Check if user is accessing their own cart
        if (req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only access your own cart."
            });
        }

        const userCart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                productCarts: {
                    include: { product: true }
                }
            }
        });

        if (!userCart) {
            // Create empty cart if it doesn't exist
            const newCart = await prisma.cart.create({
                data: { userId },
                include: {
                    productCarts: {
                        include: { product: true }
                    }
                }
            });
            
            return res.status(200).json({
                success: true,
                message: "Empty cart created",
                data: newCart
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cart fetched successfully",
            data: userCart
        });

    } catch (error) {
        console.error("Get cart error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error!",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
