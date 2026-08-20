const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { formatDate, toDateInput } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const current = req.query.month ? new Date(`${req.query.month}-01T00:00:00Z`) : new Date();
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const gridStart = new Date(start);
  gridStart.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const gridEnd = new Date(end);
  gridEnd.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const params = {
    userId: req.session.user.id,
    start: gridStart.toISOString().slice(0, 10),
    end: gridEnd.toISOString().slice(0, 10)
  };
  const where = req.session.user.role === 'admin' ? '' : 'AND t.assigned_to = :userId';
  const tasks = await query(
    `SELECT t.*, d.name AS domain_name, u.name AS worker_name
     FROM tasks t
     LEFT JOIN task_domains d ON d.id = t.domain_id
     JOIN users u ON u.id = t.assigned_to
     WHERE t.due_date BETWEEN :start AND :end ${where}
     ORDER BY t.due_date, t.position, t.created_at`,
    params
  );

  const days = [];
  for (const day = new Date(gridStart); day <= gridEnd; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    days.push({
      date,
      label: day.getUTCDate(),
      inMonth: day.getUTCMonth() === month,
      tasks: tasks.filter((task) => toDateInput(task.due_date) === date)
    });
  }

  const prev = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 7);

  res.render('calendar/index', {
    title: 'Calendar',
    monthLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start),
    monthValue: start.toISOString().slice(0, 7),
    prev,
    next,
    days,
    helpers: { formatDate }
  });
});

module.exports = router;
