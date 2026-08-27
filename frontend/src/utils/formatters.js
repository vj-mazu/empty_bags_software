/**
 * Formats date string into Day/Month/Year (DD/MM/YYYY)
 * Handles YYYY-MM-DD, ISO timestamps, and Date objects.
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const parts = trimmed.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

/**
 * Formats date string into readable text (e.g. 27 Aug 2026)
 */
export const formatDateLong = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' && dateInput.includes('-') && !dateInput.includes('T')
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput);
    if (isNaN(d.getTime())) return formatDate(dateInput);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return formatDate(dateInput);
  }
};

/**
 * Formats numbers into Indian Rupee Currency string: ₹XX,XXX.XX
 */
export const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Formats numbers with comma separator
 */
export const formatBags = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN');
};
