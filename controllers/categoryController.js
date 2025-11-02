// controllers/categoryController.js
const Category = require('../models/Category');
const slugify = require('slugify');

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const slug = slugify(name, { lower: true });
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(400).json({ message: 'Category exists' });

    const cat = await Category.create({ name, slug, description });
    res.status(201).json({ category: cat });
  } catch (err) { next(err); }
};

exports.getCategories = async (req, res, next) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json({ categories: cats });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const slug = name ? slugify(name, { lower: true }) : undefined;
    const updated = await Category.findByIdAndUpdate(id, { name, description, ...(slug && { slug }) }, { new: true });
    res.json({ category: updated });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select('name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};