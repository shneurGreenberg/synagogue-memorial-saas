function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchOfflineJewishFeed(lang = 'ru') {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 365);

  const hebcalLang = lang === 'he' ? 'he' : 'en';
  const params = new URLSearchParams({
    cfg: 'json',
    v: '1',
    maj: 'on',
    min: 'on',
    mod: 'on',
    mf: 'on',
    nx: 'on',
    start: formatIsoDate(start),
    end: formatIsoDate(end),
    lg: hebcalLang,
  });

  const response = await fetch(`https://www.hebcal.com/hebcal?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Hebcal ${response.status}`);
  }

  const payload = await response.json();
  const today = formatIsoDate(start);

  const upcomingHolidays = (payload.items || [])
    .filter((item) => item.category === 'holiday' && item.date >= today)
    .map((item) => ({
      date: item.date,
      title: lang === 'he' ? (item.hebrew || item.title) : item.title,
      hebrew: item.hebrew || '',
      subcat: item.subcat || '',
      link: '',
    }));

  return { upcomingHolidays, chabadDates: [] };
}
