const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Add to cart
exports.addToCart = async (req, res) => {
    const { userid, productid, color, size, quantity } = req.body;
    const userId = parseInt(userid);
    const productId = parseInt(productid);

    try {
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

        // Check if product already in cart
        const existingCartItem = await prisma.productCart.findUnique({
            where: {
                productId_cartId: {
                    productId: productId,
                    cartId: existingCart.id
                }
            }
        });

        let cartItem;
        if (existingCartItem) {
            // Update quantity if item exists
            cartItem = await prisma.productCart.update({
                where: {
                    productId_cartId: {
                        productId: productId,
                        cartId: existingCart.id
                    }
                },
                data: {
                    quantity: existingCartItem.quantity + (quantity ? parseInt(quantity) : 1),
                    selectedColor: color || existingCartItem.selectedColor,
                    selectedSize: size || existingCartItem.selectedSize
                }
            });
        } else {
            // Add product to cart if it doesn't exist
            cartItem = await prisma.productCart.create({
                data: {
                    product: { connect: { id: productId } },
                    cart: { connect: { id: existingCart.id } },
                    selectedColor: color || null,
                    selectedSize: size || null,
                    quantity: quantity ? parseInt(quantity) : 1
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
    const { userid, productid, size, color, quantity } = req.body;
    const userId = Number(userid);
    const productId = Number(productid);

    try {
        const userCart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!userCart) {
            return res.status(404).json({
                success: false,
                message: "Cart does not exist!"
            });
        }

        const cartItem = await prisma.productCart.findUnique({
            where: {
                productId_cartId: {
                    productId: productId,
                    cartId: userCart.id
                }
            }
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart!"
            });
        }

        const payload = {
            ...(quantity !== undefined && { quantity: Number(quantity) }),
            ...(size && { selectedSize: size }),
            ...(color && { selectedColor: color })
        };

        const updatedCart = await prisma.productCart.update({
            where: {
                productId_cartId: {
                    productId: productId,
                    cartId: userCart.id
                }
            },
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
    const { userid } = req.params;
    const { productid } = req.body;

    const userId = parseInt(userid);
    const productId = parseInt(productid);

    try {
        const existingCart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!existingCart) {
            return res.status(404).json({
                success: false,
                message: "User cart does not exist!"
            });
        }

        const existingCartItem = await prisma.productCart.findUnique({
            where: {
                productId_cartId: {
                    productId: productId,
                    cartId: existingCart.id
                }
            }
        });

        if (!existingCartItem) {
            return res.status(404).json({
                success: false,
                message: "Cart item does not exist!"
            });
        }

        const deletedCartItem = await prisma.productCart.delete({
            where: {
                productId_cartId: {
                    productId: productId,
                    cartId: existingCart.id
                }
            }
        });

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
    const { userid } = req.params;
    const userId = parseInt(userid);

    try {
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
