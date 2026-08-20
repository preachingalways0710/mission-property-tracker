const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { formatDate, formatDateTime, decimalHours } = require('../utils/dates');
const { money } = require('../utils/money');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = req.session.user;
  const params = user.role === 'admin' ? {} : { userId: user.id };
  const userFilter = user.role === 'admin' ? '' : 'WHERE t.assigned_to = :userId';
  const visitFilter = user.role === 'admin' ? '' : 'WHERE v.user_id = :userId';
  const ledgerFilter = user.role === 'admin' ? '' : 'WHERE p.user_id = :userId';

  const [tasks, visits, openClock, ledger, competencies] = await Promise.all([
    query(
      `SELECT t.*, d.name AS domain_name, u.name AS worker_name
       FROM tasks t
       LEFT JOIN task_domains d ON d.id = t.domain_id
       JOIN users u ON u.id = t.assigned_to
       ${userFilter}
       ORDER BY FIELD(t.status, 'todo', 'in_progress', 'done'), FIELD(t.priority, 'high', 'normal', 'low'), t.position, COALESCE(t.due_date, '9999-12-31'), t.created_at`,
      params
    ),
    query(
      `SELECT v.*, u.name AS worker_name
       FROM visit_logs v
       JOIN users u ON u.id = v.user_id
       ${visitFilter}
       ORDER BY v.created_at DESC
       LIMIT 8`,
      params
    ),
    query(
      `SELECT c.*, u.name AS worker_name
       FROM clock_events c
       JOIN users u ON u.id = c.user_id
       WHERE c.clock_out IS NULL
       ${user.role === 'admin' ? '' : 'AND c.user_id = :userId'}`,
      params
    ),
    query(
      `SELECT p.*, u.name AS worker_name
       FROM pay_ledger p
       JOIN users u ON u.id = p.user_id
       ${ledgerFilter}
       ORDER BY p.period_end DESC
       LIMIT 5`,
      params
    ),
    query(
      `SELECT d.name AS domain_name, cs.score, cs.recorded_at
       FROM task_domains d
       LEFT JOIN competency_scores cs ON cs.id = (
         SELECT id FROM competency_scores
         WHERE domain_id = d.id
         ${user.role === 'admin' ? '' : 'AND user_id = :userId'}
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1
       )
       WHERE d.is_active = TRUE
       ORDER BY d.name`,
      params
    )
  ]);

  res.render('dashboard/index', {
    title: 'Dashboard',
    lists: {
      todo: tasks.filter((task) => task.status === 'todo'),
      in_progress: tasks.filter((task) => task.status === 'in_progress'),
      done: tasks.filter((task) => task.status === 'done')
    },
    visits,
    openClock,
    ledger,
    competencies,
    helpers: { formatDate, formatDateTime, decimalHours, money }
  });
});

module.exports = router;
