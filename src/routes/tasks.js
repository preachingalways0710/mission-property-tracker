const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { toDateInput, formatDate } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

async function taskLists(user) {
  const where = user.role === 'admin' ? '' : 'WHERE t.assigned_to = :userId';
  const tasks = await query(
    `SELECT t.*, d.name AS domain_name, u.name AS worker_name
     FROM tasks t
     LEFT JOIN task_domains d ON d.id = t.domain_id
     JOIN users u ON u.id = t.assigned_to
     ${where}
     ORDER BY FIELD(t.status, 'todo', 'in_progress', 'done'), t.position, COALESCE(t.due_date, '9999-12-31'), t.created_at`,
    { userId: user.id }
  );
  return {
    todo: tasks.filter((task) => task.status === 'todo'),
    in_progress: tasks.filter((task) => task.status === 'in_progress'),
    done: tasks.filter((task) => task.status === 'done')
  };
}

async function formOptions() {
  const [domains, workers] = await Promise.all([
    query('SELECT * FROM task_domains WHERE is_active = TRUE ORDER BY name'),
    query("SELECT * FROM users WHERE role = 'worker' ORDER BY name")
  ]);
  return { domains, workers };
}

router.get('/', async (req, res) => {
  const [lists, options] = await Promise.all([taskLists(req.session.user), formOptions()]);
  res.render('tasks/index', {
    title: 'Tasks',
    lists,
    task: null,
    prefillDueDate: req.query.due_date || '',
    helpers: { formatDate, toDateInput },
    ...options
  });
});

router.get('/:id/edit', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.redirect('/tasks');
  const [task] = await query('SELECT * FROM tasks WHERE id = :id', { id: req.params.id });
  if (!task) return res.redirect('/tasks');
  const [lists, options] = await Promise.all([taskLists(req.session.user), formOptions()]);
  res.render('tasks/index', {
    title: 'Edit Task',
    lists,
    task,
    prefillDueDate: '',
    helpers: { formatDate, toDateInput },
    ...options
  });
});

router.post('/', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/tasks');
  const { title, description, domain_id, assigned_to, due_date, status } = req.body;
  await query(
    `INSERT INTO tasks (title, description, domain_id, assigned_to, created_by, due_date, status)
     VALUES (:title, :description, :domainId, :assignedTo, :createdBy, :dueDate, :status)`,
    {
      title,
      description: description || null,
      domainId: domain_id || null,
      assignedTo: assigned_to,
      createdBy: req.session.user.id,
      dueDate: due_date || null,
      status: status || 'todo'
    }
  );
  req.flash('success', 'Task created.');
  res.redirect('/tasks');
});

router.put('/:id', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/tasks');
  const { title, description, domain_id, assigned_to, due_date, status } = req.body;
  await query(
    `UPDATE tasks
     SET title = :title, description = :description, domain_id = :domainId, assigned_to = :assignedTo,
         due_date = :dueDate, status = :status
     WHERE id = :id`,
    {
      id: req.params.id,
      title,
      description: description || null,
      domainId: domain_id || null,
      assignedTo: assigned_to,
      dueDate: due_date || null,
      status
    }
  );
  req.flash('success', 'Task updated.');
  res.redirect('/tasks');
});

router.delete('/:id', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).redirect('/tasks');
  await query('DELETE FROM tasks WHERE id = :id', { id: req.params.id });
  req.flash('success', 'Task deleted.');
  res.redirect('/tasks');
});

router.patch('/:id/status', async (req, res) => {
  const allowed = ['todo', 'in_progress', 'done'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const [task] = await query('SELECT * FROM tasks WHERE id = :id', { id: req.params.id });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.session.user.role !== 'admin' && task.assigned_to !== req.session.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await query('UPDATE tasks SET status = :status WHERE id = :id', { status: req.body.status, id: req.params.id });
  res.json({ ok: true });
});

router.patch('/:id/due-date', async (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  await query('UPDATE tasks SET due_date = :dueDate WHERE id = :id', {
    dueDate: req.body.due_date || null,
    id: req.params.id
  });
  res.json({ ok: true });
});

router.patch('/:id/mark-done', async (req, res) => {
  const [task] = await query('SELECT * FROM tasks WHERE id = :id', { id: req.params.id });
  if (!task) return res.status(404).redirect('/calendar');
  if (req.session.user.role !== 'admin' && task.assigned_to !== req.session.user.id) {
    return res.status(403).redirect('/calendar');
  }
  await query("UPDATE tasks SET status = 'done' WHERE id = :id", { id: req.params.id });
  req.flash('success', 'Task marked done.');
  res.redirect(req.get('referer') || '/tasks');
});

module.exports = router;
