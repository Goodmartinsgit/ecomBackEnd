const { prisma } = require('../config/database');
const { sanitize, validateRequired, parseId } = require('../utils/validation');

exports.createCategory = async (req, res) => {
    let { name } = req.body;

    try {
        // Sanitize and validate input
        name = sanitize(name);
        validateRequired(name, 'Category name');

        // Check if category already exists
        const existingCategory = await prisma.category.findUnique({
            where: { name }
        });

        if (existingCategory) {
            return res.status(409).json({ success: false, message: "Category already exists!" });
        }

        const newCategory = await prisma.category.create({
            data: { name },
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: newCategory
        });

    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error, please try again later!",
            error: error.message
        });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const allCategory = await prisma.category.findMany();
        if (!allCategory) {
            return res.status(400).json({ success: false, message: "Unable to get categories!" });
        }
        res.status(200).json({
            success: true,
            message: "Categories retrived successfully",
            data: allCategory
        });

    } catch (error) {
        console.error("Error", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error, please try again later!",
            error: error.message
        });
    }
};

exports.getSingleCategory = async (req, res) => {
    let { name } = req.params;
    try {
        // Sanitize input
        name = sanitize(name);
        validateRequired(name, 'Category name');
        
        const singleCategory = await prisma.category.findUnique({
            where: { name }
        });
        if (!singleCategory) {
            return res.status(400).json({ success: false, message: "Category not found!" });
        }
        res.status(200).json({
            success: true,
            message: "Category retrived successfully",
            data: singleCategory
        });
    } catch (error) {
        console.log("error", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error, please try again later!",
            error: error.message
        });
    }
};

exports.updateCategory = async (req, res) => {
    let { name, id } = req.body;

    try {
        // Sanitize and validate inputs
        name = sanitize(name);
        validateRequired(name, 'Category name');
        validateRequired(id, 'Category ID');
        const parsedId = parseId(id, 'Category ID');
        
        //check if category exists
        const existingCategory = await prisma.category.findUnique({
            where: { id: parsedId }
        });

        if (!existingCategory) {
            return res.status(400).json({ success: false, message: "Category does not exist in database!" });
        }
        const updatedCategory = await prisma.category.update({
            where: { id: parsedId },
            data: { name },
        });
        
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory
        });
    } catch (error) {
        console.log("error", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error, please try again later!",
            error: error.message
        });
    }
};

exports.deleteCategory = async (req, res) => {
    const { id } = req.body;

    try {
        // Validate input
        validateRequired(id, 'Category ID');
        const parsedId = parseId(id, 'Category ID');
        
        const existingCategory = await prisma.category.findUnique({
            where: { id: parsedId }
        });

        if (!existingCategory) {
            return res.status(400).json({ success: false, message: "Category does not exist in database!" });
        }

        const deletedCategory = await prisma.category.delete({
            where: { id: parsedId }
        });
        
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: deletedCategory
        });
    } catch (error) {
        console.log("error", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error, please try again later!",
            error: error.message
        });
    }
};
