const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { formatDate } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = req.session.user;
  const workers = await query("SELECT id, name FROM users WHERE role = 'worker' ORDER BY name");
  const selectedWorkerId = user.role === 'admin' ? Number(req.query.worker_id || workers[0]?.id) : user.id;
  const domains = await query(
    `SELECT d.id, d.name, cs.score, cs.notes, cs.recorded_at, r.name AS recorded_by_name
     FROM task_domains d
     LEFT JOIN competency_scores cs ON cs.id = (
       SELECT id FROM competency_scores
       WHERE domain_id = d.id AND user_id = :workerId
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1
     )
     LEFT JOIN users r ON r.id = cs.recorded_by
     WHERE d.is_active = TRUE
     ORDER BY d.name`,
    { workerId: selectedWorkerId }
  );
  res.render('competency/index', {
    title: 'Competency',
    workers,
    selectedWorkerId,
    domains,
    helpers: { formatDate }
  });
});

router.post('/', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/competency');
  await query(
    `INSERT INTO competency_scores (user_id, domain_id, score, notes, recorded_by)
     VALUES (:userId, :domainId, :score, :notes, :recordedBy)`,
    {
      userId: req.body.user_id,
      domainId: req.body.domain_id,
      score: req.body.score,
      notes: req.body.notes || null,
      recordedBy: req.session.user.id
    }
  );
  req.flash('success', 'Competency score recorded.');
  res.redirect(`/competency?worker_id=${req.body.user_id}`);
});

module.exports = router;
