const express = require('express');
const { query, transaction } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { formatDate, decimalHours } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

async function visitOptions(userId) {
  const [domains, tasks] = await Promise.all([
    query('SELECT * FROM task_domains WHERE is_active = TRUE ORDER BY name'),
    query(
      `SELECT id, title, due_date FROM tasks
       WHERE assigned_to = :userId AND status <> 'done'
       ORDER BY COALESCE(due_date, '9999-12-31'), title`,
      { userId }
    )
  ]);
  return { domains, tasks };
}

router.get('/new', requireRole('worker'), async (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const [clock] = await query(
    `SELECT clock_in, clock_out
     FROM clock_events
     WHERE user_id = :userId AND DATE(clock_in) = :date AND clock_out IS NOT NULL
     ORDER BY clock_in DESC
     LIMIT 1`,
    { userId: req.session.user.id, date }
  );
  res.render('visits/new', {
    title: 'Log Visit',
    date,
    clockHours: clock ? decimalHours(clock.clock_in, clock.clock_out) : '',
    ...(await visitOptions(req.session.user.id))
  });
});

router.post('/', requireRole('worker'), async (req, res) => {
  const domainIds = Array.isArray(req.body.domain_ids)
    ? req.body.domain_ids
    : req.body.domain_ids
      ? [req.body.domain_ids]
      : [];
  await transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO visit_logs (user_id, task_id, visit_date, hours_worked, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        req.body.task_id || null,
        req.body.visit_date,
        req.body.hours_worked || null,
        req.body.description
      ]
    );
    for (const domainId of domainIds) {
      await connection.execute('INSERT INTO visit_log_domains (visit_log_id, domain_id) VALUES (?, ?)', [
        result.insertId,
        domainId
      ]);
    }
  });
  req.flash('success', 'Visit logged for review.');
  res.redirect('/visits');
});

router.get('/', async (req, res) => {
  const params = { userId: req.session.user.id };
  const where = req.session.user.role === 'admin' ? '' : 'WHERE v.user_id = :userId';
  const visits = await query(
    `SELECT v.*, u.name AS worker_name, t.title AS task_title,
      GROUP_CONCAT(d.name ORDER BY d.name SEPARATOR ', ') AS domains
     FROM visit_logs v
     JOIN users u ON u.id = v.user_id
     LEFT JOIN tasks t ON t.id = v.task_id
     LEFT JOIN visit_log_domains vld ON vld.visit_log_id = v.id
     LEFT JOIN task_domains d ON d.id = vld.domain_id
     ${where}
     GROUP BY v.id, u.name, t.title
     ORDER BY v.created_at DESC`,
    params
  );
  res.render('visits/index', { title: 'Visits', visits, helpers: { formatDate } });
});

router.post('/:id/approve', requireRole('admin'), async (req, res) => {
  await query('UPDATE visit_logs SET status = :status, hours_worked = :hours WHERE id = :id', {
    id: req.params.id,
    status: 'approved',
    hours: req.body.hours_worked
  });
  if (req.body.note) {
    const [visit] = await query('SELECT user_id FROM visit_logs WHERE id = :id', { id: req.params.id });
    if (visit) {
      await query(
        'INSERT INTO work_ethic_notes (user_id, visit_log_id, note, created_by) VALUES (:userId, :visitId, :note, :adminId)',
        { userId: visit.user_id, visitId: req.params.id, note: req.body.note, adminId: req.session.user.id }
      );
    }
  }
  req.flash('success', 'Visit approved.');
  res.redirect('/visits');
});

module.exports = router;
