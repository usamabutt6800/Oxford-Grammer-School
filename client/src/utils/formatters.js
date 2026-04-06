export const formatCurrency = (amount) => {
  return `PKR ${amount?.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) || '0'}`;
};

export const formatPhone = (phone) => {
  if (!phone) return 'N/A';
  
  // Format Pakistani phone numbers: 03001234567 -> 0300-1234567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0,4)}-${cleaned.slice(4)}`;
  }
  return phone;
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};