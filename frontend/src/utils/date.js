export const getCurrentMonth = () => new Date().getMonth() + 1;

export const getCurrentYear = () => new Date().getFullYear();

export const todayISO = () => new Date().toISOString().split('T')[0];

export const getMonthName = (month, format = 'long') =>
  new Date(2000, month - 1, 1).toLocaleString('en-US', { month: format });

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const isoMonth = (year, month) =>
  `${year}-${String(month).padStart(2, '0')}`;
