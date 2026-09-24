// Temporary demo content only. The rest of the UI consumes this data through
// services/auditService.js so a future backend integration has one clear seam.

export const demoUser = {
  id: 'usr_demo_01',
  name: 'Alex Morgan',
  email: 'alex@northstar.co',
  initials: 'AM',
}

export const merchantAccount = {
  id: 'MC-884210759',
  name: 'Northstar Goods',
  country: 'United States',
  currency: 'USD',
  status: 'suspended',
  suspensionReason: 'Website needs improvement',
  suspensionDetail:
    'Google found that your online store needs improvements to provide customers with a transparent and professional shopping experience.',
  connectedAt: 'Sep 18, 2026',
  lastAudit: 'Today, 09:42 AM',
}

export const auditSummary = {
  healthScore: 72,
  previousScore: 68,
  grade: 'Needs attention',
  productsChecked: 2847,
  approved: 2421,
  warnings: 286,
  critical: 96,
  pending: 44,
  accountIssues: 5,
  estimatedFixTime: '2–3 days',
}

export const healthTrend = [
  { date: 'Sep 19', score: 58 },
  { date: 'Sep 20', score: 61 },
  { date: 'Sep 21', score: 59 },
  { date: 'Sep 22', score: 65 },
  { date: 'Sep 23', score: 67 },
  { date: 'Sep 24', score: 68 },
  { date: 'Sep 25', score: 72 },
]

export const productDistribution = [
  { name: 'Approved', value: 2421, color: '#287a62' },
  { name: 'Warnings', value: 286, color: '#d98b32' },
  { name: 'Critical', value: 96, color: '#de624d' },
  { name: 'Pending', value: 44, color: '#7a73c9' },
]

export const priorityIssues = [
  {
    id: 'ISS-001',
    title: 'Invalid or missing GTIN',
    description: 'Unique product identifiers are missing or do not match Google’s records.',
    affected: 64,
    severity: 'critical',
    impact: 'Disapproved',
    category: 'Product identifiers',
    recommendation: 'Submit a valid GTIN from the product packaging. Do not invent or reuse identifiers.',
  },
  {
    id: 'ISS-002',
    title: 'Price mismatch',
    description: 'Landing-page prices differ from values submitted in your product feed.',
    affected: 31,
    severity: 'critical',
    impact: 'Disapproved',
    category: 'Price & availability',
    recommendation: 'Keep landing-page, structured-data, and feed prices identical and update them together.',
  },
  {
    id: 'ISS-003',
    title: 'Missing brand',
    description: 'Brand attributes are absent on products where a manufacturer brand is expected.',
    affected: 18,
    severity: 'warning',
    impact: 'Limited performance',
    category: 'Product identifiers',
    recommendation: 'Add the manufacturer brand exactly as it appears on the product or packaging.',
  },
  {
    id: 'ISS-004',
    title: 'Image too small',
    description: 'Primary images do not meet Google’s recommended dimensions.',
    affected: 12,
    severity: 'warning',
    impact: 'Limited performance',
    category: 'Images',
    recommendation: 'Upload clear product imagery at least 800 × 800 px without borders or overlays.',
  },
]

export const accountIssues = [
  {
    id: 'ACC-001',
    title: 'Website needs improvement',
    type: 'Suspension reason',
    severity: 'critical',
    description: 'Your Merchant Center account is suspended until the website experience and required business information are improved.',
    action: 'Review website policy',
  },
  {
    id: 'ACC-002',
    title: 'Missing return policy',
    type: 'Policy requirement',
    severity: 'critical',
    description: 'A clear and easily discoverable return and refund policy could not be verified.',
    action: 'Add policy page',
  },
  {
    id: 'ACC-003',
    title: 'Shipping settings incomplete',
    type: 'Account setup',
    severity: 'warning',
    description: 'One or more target regions do not have a complete delivery rate or transit time.',
    action: 'Review shipping',
  },
  {
    id: 'ACC-004',
    title: 'Business phone unverified',
    type: 'Business information',
    severity: 'warning',
    description: 'Verify the customer support phone number associated with this business.',
    action: 'Verify details',
  },
  {
    id: 'ACC-005',
    title: 'Automatic item updates disabled',
    type: 'Data quality',
    severity: 'info',
    description: 'Enable automatic updates to reduce temporary price and availability mismatches.',
    action: 'Enable updates',
  },
]

export const products = [
  { id: 'NS-2041', name: 'Atlas Everyday Sneaker', category: 'Footwear', status: 'Disapproved', issue: 'Invalid GTIN', severity: 'critical', price: '$94.00', updated: '2m ago' },
  { id: 'NS-1998', name: 'Summit Trail Runner', category: 'Footwear', status: 'Disapproved', issue: 'Price mismatch', severity: 'critical', price: '$128.00', updated: '6m ago' },
  { id: 'NS-1812', name: 'Drift Organic Tee', category: 'Apparel', status: 'Warning', issue: 'Missing brand', severity: 'warning', price: '$38.00', updated: '12m ago' },
  { id: 'NS-2119', name: 'Cove Leather Tote', category: 'Accessories', status: 'Warning', issue: 'Missing MPN', severity: 'warning', price: '$164.00', updated: '18m ago' },
  { id: 'NS-2048', name: 'Mesa Weekender', category: 'Accessories', status: 'Approved', issue: '—', severity: 'healthy', price: '$138.00', updated: '24m ago' },
  { id: 'NS-1970', name: 'Terrain Wool Overshirt', category: 'Apparel', status: 'Pending', issue: 'Under initial review', severity: 'pending', price: '$112.00', updated: '31m ago' },
  { id: 'NS-1776', name: 'Harbor Chino', category: 'Apparel', status: 'Approved', issue: '—', severity: 'healthy', price: '$78.00', updated: '43m ago' },
  { id: 'NS-2083', name: 'Field Notes Backpack', category: 'Accessories', status: 'Warning', issue: 'Image too small', severity: 'warning', price: '$118.00', updated: '1h ago' },
  { id: 'NS-1642', name: 'Orbit Sport Sandal', category: 'Footwear', status: 'Disapproved', issue: 'Landing page unavailable', severity: 'critical', price: '$72.00', updated: '1h ago' },
  { id: 'NS-2160', name: 'Cloud Merino Crew', category: 'Apparel', status: 'Approved', issue: '—', severity: 'healthy', price: '$96.00', updated: '2h ago' },
  { id: 'NS-1745', name: 'Ridge Utility Jacket', category: 'Apparel', status: 'Warning', issue: 'Color value unclear', severity: 'warning', price: '$184.00', updated: '2h ago' },
  { id: 'NS-1902', name: 'Daybreak Cap', category: 'Accessories', status: 'Approved', issue: '—', severity: 'healthy', price: '$32.00', updated: '3h ago' },
]

export const auditSteps = [
  'Connecting securely to Merchant Center',
  'Loading your product catalog',
  'Checking product statuses',
  'Detecting disapprovals and warnings',
  'Reviewing account-level issues',
  'Calculating your health score',
]

export const notifications = [
  { id: 1, title: 'Catalog health improved', body: 'Your score increased by 4 points since the last audit.', time: '9 min ago', unread: true },
  { id: 2, title: '31 price mismatches found', body: 'Review products before your next feed sync.', time: '24 min ago', unread: true },
  { id: 3, title: 'Audit completed', body: '2,847 products were checked successfully.', time: 'Today, 9:42 AM', unread: false },
]

export const auditDiscoveryCards = [
  {
    id: 'disapprovals',
    number: '01',
    eyebrow: 'Disapprovals',
    title: 'See exactly what Google rejected.',
    description: 'Every affected product, grouped by the reason it stopped serving.',
    stat: '96',
    statLabel: 'critical items',
    tone: 'coral',
  },
  {
    id: 'mismatch',
    number: '02',
    eyebrow: 'Feed quality',
    title: 'Catch the small mismatches costing reach.',
    description: 'Price, availability, GTIN, brand, image, and landing-page checks.',
    stat: '286',
    statLabel: 'warnings found',
    tone: 'gold',
  },
  {
    id: 'account',
    number: '03',
    eyebrow: 'Account health',
    title: 'Understand why the whole account is at risk.',
    description: 'Policy and setup diagnostics, including the exact suspension reason.',
    stat: '5',
    statLabel: 'account issues',
    tone: 'sage',
  },
  {
    id: 'priority',
    number: '04',
    eyebrow: 'Priority',
    title: 'Know what deserves your attention first.',
    description: 'A severity-ranked queue turns hundreds of diagnostics into a clear plan.',
    stat: '2–3',
    statLabel: 'days to resolve',
    tone: 'blue',
  },
  {
    id: 'progress',
    number: '05',
    eyebrow: 'Progress',
    title: 'Watch catalog health move in the right direction.',
    description: 'A simple score and trend line make improvement easy to track over time.',
    stat: '+14',
    statLabel: 'points this week',
    tone: 'lime',
  },
]

export const demoMerchantStories = [
  {
    quote: 'I don’t need another wall of diagnostics. I need to know what is broken, why it matters, and what to fix before lunch.',
    name: 'Avery Chen',
    role: 'Sample fashion merchant',
    result: '31 price mismatches prioritized',
  },
  {
    quote: 'The score gives everyone the same starting point. Our feed team can finally discuss progress without opening five different reports.',
    name: 'Marcus Hill',
    role: 'Sample homeware merchant',
    result: 'Health score up 14 points',
  },
  {
    quote: 'The suspension reason was the part we kept missing. Seeing it beside the product issues made the route back to approval much clearer.',
    name: 'Nora Ellis',
    role: 'Sample outdoor merchant',
    result: 'Account action plan created',
  },
]
