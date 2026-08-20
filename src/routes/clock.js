const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { formatDateTime, decimalHours } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const where = req.session.user.role === 'admin' ? '' : 'WHERE c.user_id = :userId';
  const [openEvent] = await query('SELECT * FROM clock_events WHERE user_id = :userId AND clock_out IS NULL', {
    userId: req.session.user.id
  });
  const events = await query(
    `SELECT c.*, u.name AS worker_name
     FROM clock_events c
     JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY c.clock_in DESC
     LIMIT 100`,
    { userId: req.session.user.id }
  );
  res.render('clock/index', {
    title: 'Clock',
    openEvent,
    events,
    helpers: { formatDateTime, decimalHours }
  });
});

router.post('/in', async (req, res) => {
  if (req.session.user.role !== 'worker') return res.status(403).redirect('/clock');
  const [openEvent] = await query('SELECT id FROM clock_events WHERE user_id = :userId AND clock_out IS NULL', {
    userId: req.session.user.id
  });
  if (openEvent) {
    req.flash('error', 'You are already clocked in.');
    return res.redirect('/clock');
  }
  await query('INSERT INTO clock_events (user_id, clock_in) VALUES (:userId, UTC_TIMESTAMP())', {
    userId: req.session.user.id
  });
  req.flash('success', 'Clocked in.');
  res.redirect('/clock');
});

router.post('/out', async (req, res) => {
  if (req.session.user.role !== 'worker') return res.status(403).redirect('/clock');
  const [openEvent] = await query('SELECT id FROM clock_events WHERE user_id = :userId AND clock_out IS NULL', {
    userId: req.session.user.id
  });
  if (!openEvent) {
    req.flash('error', 'You are not currently clocked in.');
    return res.redirect('/clock');
  }
  await query('UPDATE clock_events SET clock_out = UTC_TIMESTAMP() WHERE id = :id', { id: openEvent.id });
  req.flash('success', 'Clocked out.');
  res.redirect('/clock');
});

module.exports = router;
