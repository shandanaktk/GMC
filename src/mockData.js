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
  website: 'https://northstargoods.com',
  country: 'United States',
  targetMarket: 'United States',
  currency: 'USD',
  status: 'healthy',
  statusLabel: 'Account in good standing',
  statusDetail:
    'Your store meets Google’s expectations for a transparent, professional shopping experience. Keep monitoring product and policy checks to stay ahead.',
  connectedAt: 'Sep 18, 2026',
  lastAudit: 'Today, 09:42 AM',
}

export const auditSummary = {
  healthScore: 88,
  previousScore: 84,
  grade: 'Looking strong',
  productsChecked: 2847,
  approved: 2421,
  warnings: 286,
  critical: 96,
  pending: 44,
  accountIssues: 5,
  estimatedFixTime: '1–2 days',
}

export const healthTrend = [
  { date: 'Sep 19', score: 74 },
  { date: 'Sep 20', score: 77 },
  { date: 'Sep 21', score: 76 },
  { date: 'Sep 22', score: 81 },
  { date: 'Sep 23', score: 83 },
  { date: 'Sep 24', score: 84 },
  { date: 'Sep 25', score: 88 },
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
    title: 'Store experience looks solid',
    type: 'Account status',
    severity: 'info',
    description: 'Google can verify your site experience. Keep policies and contact details easy to find so the account stays eligible.',
    action: 'Read website policy',
    href: 'https://support.google.com/merchants/answer/6150127',
  },
  {
    id: 'ACC-002',
    title: 'Return policy ready to strengthen',
    type: 'Policy requirement',
    severity: 'warning',
    description: 'Make sure your return and refund policy stays clearly linked from checkout and product pages.',
    action: 'Review return policy',
    href: 'https://support.google.com/merchants/answer/12079604',
  },
  {
    id: 'ACC-003',
    title: 'Shipping settings incomplete',
    type: 'Account setup',
    severity: 'warning',
    description: 'One or more target regions do not have a complete delivery rate or transit time.',
    action: 'Review shipping',
    href: 'https://support.google.com/merchants/answer/4752265',
  },
  {
    id: 'ACC-004',
    title: 'Business phone unverified',
    type: 'Business information',
    severity: 'warning',
    description: 'Verify the customer support phone number associated with this business.',
    action: 'Verify details',
    href: 'https://support.google.com/merchants/answer/13693865',
  },
  {
    id: 'ACC-005',
    title: 'Automatic item updates available',
    type: 'Data quality',
    severity: 'info',
    description: 'Enable automatic updates to reduce temporary price and availability mismatches.',
  },
]

export const approvalChecks = [
  {
    id: 'trust-signals',
    title: 'Misrepresentation / trust signals',
    finding: 'Business identity is not equally clear across key pages.',
    status: 'blocker',
    priority: 'Critical',
    why: 'Unclear ownership, contact details, or payment expectations can make the store look untrustworthy and trigger a misrepresentation suspension.',
    fix: 'Use the same legal business name, address, phone, and support details in the footer, contact page, checkout, policies, and Merchant Center.',
  },
  {
    id: 'business-information',
    title: 'Business information',
    finding: 'The support phone still needs verification.',
    status: 'blocker',
    priority: 'Critical',
    why: 'Google may be unable to verify who operates the store or how a customer can reach the business.',
    fix: 'Verify the phone in Merchant Center and publish the business name, physical address, email, phone, and support hours on the website.',
  },
  {
    id: 'policies',
    title: 'Refund / Shipping / Terms / Privacy',
    finding: 'Shipping coverage is incomplete for one target region.',
    status: 'blocker',
    priority: 'Critical',
    why: 'Missing or inconsistent customer policies prevent Google from confirming the complete purchase and post-purchase experience.',
    fix: 'Publish dedicated, easy-to-find policy pages and make delivery costs, delivery times, return windows, refund method, and exclusions match Merchant Center.',
  },
  {
    id: 'product-pages',
    title: 'Product page problems',
    finding: 'Some landing pages do not show all submitted product details.',
    status: 'blocker',
    priority: 'High',
    why: 'Thin, incomplete, or non-purchasable product pages can cause item disapproval because the submitted offer cannot be verified.',
    fix: 'Show the exact product title, image, price, availability, variant, buy action, and relevant identifiers on every landing page.',
  },
  {
    id: 'identifiers',
    title: 'GTIN / MPN / Brand',
    finding: '64 products have invalid or missing GTIN values.',
    status: 'blocker',
    priority: 'High',
    why: 'Incorrect or invented identifiers stop Google from matching products to its catalog and can lead to disapproval.',
    fix: 'Submit the manufacturer GTIN where one exists; otherwise provide the correct brand and MPN and set identifier_exists accurately.',
  },
  {
    id: 'price-availability',
    title: 'Price & availability mismatch',
    finding: '31 offers differ between the feed and live page.',
    status: 'blocker',
    priority: 'High',
    why: 'A shopper must see the same price and stock state Google received. Repeated mismatches can disapprove items or put the account at risk.',
    fix: 'Keep feed, landing page, checkout, and structured-data values synchronized, including sale price, currency, variant, and stock state.',
  },
  {
    id: 'structured-data',
    title: 'Product structured data',
    finding: 'Offer markup is incomplete on several product templates.',
    status: 'blocker',
    priority: 'High',
    why: 'Missing or conflicting Product and Offer markup makes automated price and availability verification less reliable.',
    fix: 'Add valid Product, Offer, priceCurrency, price, availability, brand, and identifier markup that exactly matches the visible page.',
  },
  {
    id: 'crawlability',
    title: 'Crawlability',
    finding: 'Two product paths restrict automated access.',
    status: 'blocker',
    priority: 'High',
    why: 'If Google cannot crawl a landing page or its required assets, it cannot verify the offer and the product may be disapproved.',
    fix: 'Remove unintended robots rules, login walls, geo blocks, bot challenges, and resource restrictions for product landing pages.',
  },
  {
    id: 'broken-urls',
    title: 'Broken / product URLs',
    finding: 'One submitted product URL returns an error.',
    status: 'blocker',
    priority: 'High',
    why: 'A broken, redirected incorrectly, or unavailable landing page cannot be approved or shown to shoppers.',
    fix: 'Return a stable 200 response for the canonical product URL, repair redirect chains, and remove permanently unavailable offers from the feed.',
  },
  {
    id: 'risky-content',
    title: 'Risky wording / content',
    finding: 'A small set of claims needs supporting context.',
    status: 'risk',
    priority: 'Medium',
    why: 'Unsupported superlatives, guarantees, health claims, or misleading urgency can create policy and trust concerns.',
    fix: 'Replace unverifiable claims with specific, evidence-based wording and make conditions or limitations visible beside the claim.',
  },
  {
    id: 'missing-information',
    title: 'Missing information',
    finding: 'Some pages omit delivery or variant detail.',
    status: 'risk',
    priority: 'Low',
    why: 'Incomplete product or purchase information can create a poor customer experience and make submitted data difficult to verify.',
    fix: 'Add complete specifications, variant choices, condition, delivery expectations, taxes where relevant, and a clear path to checkout.',
  },
  {
    id: 'passed-checks',
    title: 'Passed checks',
    finding: 'HTTPS, checkout access, payment methods, and core navigation passed.',
    status: 'passed',
    priority: 'Low',
    why: 'These checks provide a sound foundation for a transparent, usable shopping experience.',
    fix: 'No immediate change is required. Recheck them after major theme, checkout, policy, or domain updates.',
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
