function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return 'Unscheduled';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function decimalHours(start, end) {
  if (!start || !end) return 0;
  return Math.round(((new Date(end) - new Date(start)) / 1000 / 60 / 60) * 100) / 100;
}

module.exports = { toDateInput, formatDate, formatDateTime, decimalHours };
