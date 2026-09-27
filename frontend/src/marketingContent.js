// Editorial landing-page content. Dashboard values always come from the live API.
export const auditDiscoveryCards = [
  { id: 'disapprovals', number: '01', eyebrow: 'Disapprovals', title: 'See exactly what Google rejected.', description: 'Every affected product, grouped by the reason it stopped serving.', stat: 'Live', statLabel: 'product diagnostics', tone: 'coral' },
  { id: 'mismatch', number: '02', eyebrow: 'Feed quality', title: 'Catch the small mismatches costing reach.', description: 'Price, availability, GTIN, brand, image, and landing-page checks.', stat: 'Exact', statLabel: 'issue reasons', tone: 'gold' },
  { id: 'account', number: '03', eyebrow: 'Account health', title: 'Understand why the whole account is at risk.', description: 'Policy and setup diagnostics, including the exact suspension reason.', stat: 'GMC', statLabel: 'account issues', tone: 'sage' },
  { id: 'priority', number: '04', eyebrow: 'Priority', title: 'Know what deserves your attention first.', description: 'A severity-ranked queue turns diagnostics into a clear plan.', stat: 'Ranked', statLabel: 'fix queue', tone: 'blue' },
  { id: 'progress', number: '05', eyebrow: 'Progress', title: 'Watch catalog health move in the right direction.', description: 'A consistent score and real audit history make improvement measurable.', stat: '0–100', statLabel: 'health score', tone: 'lime' },
]
