const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { formatDate } = require('../utils/dates');
const { money } = require('../utils/money');

const router = express.Router();
router.use(requireAuth);

async function computeHours(userId, start, end) {
  const [clockRow] = await query(
    `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, clock_in, clock_out)) / 60, 0) AS hours
     FROM clock_events
     WHERE user_id = :userId
       AND clock_out IS NOT NULL
       AND DATE(clock_in) BETWEEN :start AND :end`,
    { userId, start, end }
  );
  const clockHours = Number(clockRow?.hours || 0);

  const [visitRow] = await query(
    `SELECT COALESCE(SUM(hours_worked), 0) AS hours
     FROM visit_logs
     WHERE user_id = :userId
       AND status = 'approved'
       AND visit_date BETWEEN :start AND :end
       AND NOT EXISTS (
         SELECT 1 FROM clock_events c
         WHERE c.user_id = visit_logs.user_id
           AND c.clock_out IS NOT NULL
           AND DATE(c.clock_in) = visit_logs.visit_date
       )`,
    { userId, start, end }
  );

  return Math.round((clockHours + Number(visitRow?.hours || 0)) * 100) / 100;
}

router.get('/', async (req, res) => {
  const where = req.session.user.role === 'admin' ? '' : 'WHERE p.user_id = :userId';
  const [workers, entries] = await Promise.all([
    query("SELECT id, name FROM users WHERE role = 'worker' ORDER BY name"),
    query(
      `SELECT p.*, u.name AS worker_name
       FROM pay_ledger p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.period_end DESC, p.created_at DESC`,
      { userId: req.session.user.id }
    )
  ]);
  res.render('pay-ledger/index', { title: 'Pay Ledger', workers, entries, helpers: { formatDate, money } });
});

router.post('/', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/pay-ledger');
  const hours = await computeHours(req.body.user_id, req.body.period_start, req.body.period_end);
  const rate = Number(req.body.rate || 0);
  await query(
    `INSERT INTO pay_ledger (user_id, period_start, period_end, hours_total, rate, amount_owed, amount_paid, status)
     VALUES (:userId, :start, :end, :hours, :rate, :owed, :paid, :status)`,
    {
      userId: req.body.user_id,
      start: req.body.period_start,
      end: req.body.period_end,
      hours,
      rate,
      owed: Math.round(hours * rate * 100) / 100,
      paid: req.body.amount_paid || 0,
      status: req.body.status || 'pending'
    }
  );
  req.flash('success', 'Pay period created.');
  res.redirect('/pay-ledger');
});

router.post('/:id/paid', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/pay-ledger');
  await query(
    `UPDATE pay_ledger
     SET status = 'paid', amount_paid = amount_owed, paid_date = COALESCE(:paidDate, CURRENT_DATE())
     WHERE id = :id`,
    { id: req.params.id, paidDate: req.body.paid_date || null }
  );
  req.flash('success', 'Pay period marked paid.');
  res.redirect('/pay-ledger');
});

module.exports = router;
