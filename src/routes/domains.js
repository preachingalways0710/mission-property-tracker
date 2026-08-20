const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res) => {
  const domains = await query('SELECT * FROM task_domains ORDER BY is_active DESC, name');
  res.render('domains/index', { title: 'Domains', domains });
});

router.post('/', async (req, res) => {
  await query('INSERT INTO task_domains (name) VALUES (:name)', { name: req.body.name });
  req.flash('success', 'Domain added.');
  res.redirect('/domains');
});

router.patch('/:id/toggle', async (req, res) => {
  await query('UPDATE task_domains SET is_active = NOT is_active WHERE id = :id', { id: req.params.id });
  req.flash('success', 'Domain updated.');
  res.redirect('/domains');
});

module.exports = router;
