async function patchJson(url, body) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Update failed');
}

document.querySelectorAll('[data-board] .task-card').forEach((card) => {
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', card.dataset.taskId);
  });
});

document.querySelectorAll('[data-board] .column').forEach((column) => {
  column.addEventListener('dragover', (event) => event.preventDefault());
  column.addEventListener('drop', async (event) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    try {
      await patchJson(`/tasks/${taskId}/status`, { status: column.dataset.status });
      column.querySelector('.dropzone').appendChild(card);
    } catch (error) {
      alert('Could not update that task.');
    }
  });
});

const calendar = document.querySelector('[data-calendar]');
if (calendar && calendar.dataset.admin === 'true') {
  calendar.querySelectorAll('.calendar-task').forEach((task) => {
    task.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', task.dataset.taskId);
    });
  });

  calendar.querySelectorAll('.day').forEach((day) => {
    day.addEventListener('dragover', (event) => event.preventDefault());
    day.addEventListener('drop', async (event) => {
      event.preventDefault();
      const taskId = event.dataTransfer.getData('text/plain');
      const task = calendar.querySelector(`.calendar-task[data-task-id="${taskId}"]`);
      try {
        await patchJson(`/tasks/${taskId}/due-date`, { due_date: day.dataset.date });
        day.appendChild(task);
      } catch (error) {
        alert('Could not reschedule that task.');
      }
    });
  });
}
