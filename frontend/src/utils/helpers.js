export const normalizeText = (value) =>
  String(value || '').trim().toLowerCase();

export const splitValues = (value) => {
  if (!value || value === 'N/A') return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getActivityStatus = (lastPushDate) => {
  if (!lastPushDate || lastPushDate === 'N/A') return null;

  const pushDate = new Date(lastPushDate);
  if (isNaN(pushDate.getTime())) return null;

  const today = new Date();
  const diffTime = today.getTime() - pushDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 365) {
    return {
      color: 'bg-emerald-500',
      label: 'Ativo: essa ferramenta teve seu último push dentro de 1 ano.',
    };
  } else if (diffDays <= 730) {
    return {
      color: 'bg-slate-400',
      label: 'Inativo: essa ferramenta teve seu último push entre 1 e 2 anos atrás.',
    };
  } else {
    return {
      color: 'bg-rose-500',
      label: 'Abandonado: essa ferramenta teve seu último push há mais de 2 anos.',
    };
  }
};

export const parseDateValue = (value) => {
  if (!value || value === 'N/A') return 0;

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;

  const yearMatch = String(value).match(/\d{4}/);
  if (yearMatch) return Number(yearMatch[0]);

  return 0;
};

export const getUniqueApproaches = (tools = []) => {
  const unique = new Set();
  tools.forEach((tool) => {
    splitValues(tool?.type_of_approach).forEach((item) => unique.add(item));
  });
  return Array.from(unique).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );
};