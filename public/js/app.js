async function patchJson(url, body) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Update failed');
}

if (window.Sortable) {
  document.querySelectorAll('[data-board] .dropzone').forEach((dropzone) => {
    Sortable.create(dropzone, {
      group: 'tasks',
      animation: 160,
      ghostClass: 'drag-ghost',
      chosenClass: 'drag-chosen',
      delayOnTouchOnly: true,
      delay: 120,
      onEnd: async (event) => {
        const taskId = event.item.dataset.taskId;
        const status = event.to.closest('[data-status]').dataset.status;
        try {
          await patchJson(`/tasks/${taskId}/status`, { status });
        } catch (error) {
          alert('Could not update that task.');
          event.from.insertBefore(event.item, event.from.children[event.oldIndex] || null);
        }
      }
    });
  });
}

document.querySelectorAll('.task-card').forEach((card) => {
  card.addEventListener('click', (event) => {
    if (event.target.closest('a, button:not(.disclosure)')) return;
    const isExpanded = card.classList.toggle('expanded');
    const disclosure = card.querySelector('.disclosure');
    if (disclosure) {
      disclosure.setAttribute('aria-expanded', String(isExpanded));
      disclosure.setAttribute('aria-label', isExpanded ? 'Hide task details' : 'Show task details');
    }
  });
});

const calendar = document.querySelector('[data-calendar]');
if (calendar && calendar.dataset.admin === 'true' && window.Sortable) {
  calendar.querySelectorAll('.day').forEach((day) => {
    Sortable.create(day, {
      group: 'calendar-tasks',
      draggable: '.calendar-task',
      animation: 160,
      ghostClass: 'drag-ghost',
      chosenClass: 'drag-chosen',
      delayOnTouchOnly: true,
      delay: 120,
      onEnd: async (event) => {
        const taskId = event.item.dataset.taskId;
        const dueDate = event.to.dataset.date;
        try {
          await patchJson(`/tasks/${taskId}/due-date`, { due_date: dueDate });
        } catch (error) {
          alert('Could not reschedule that task.');
          event.from.insertBefore(event.item, event.from.children[event.oldIndex] || null);
        }
      }
    });
  });
}
