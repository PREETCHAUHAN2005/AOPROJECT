export const ORDER_4821 = {
  orderId: "4821",
  status: "delayed",
  customerId: "CUST-1042",
  customerName: "Horizon Retail",
  sku: "PMP-4400 Industrial Pump Assembly",
  quantity: 12,
  warehouse: "DEN-3",
  lot: "L-778",
  carrier: "Northline Freight",
  promisedDelivery: "2026-09-03",
  currentEta: "2026-09-08",
  delayHours: 96,
  delayCode: "WAREHOUSE_HOLD",
  delayReason:
    "Quality hold on lot L-778 caused warehouse DEN-3 to miss the Northline Freight pickup cutoff. The hold was released and pickup was moved to the next available window.",
  holdReleasedAt: "2026-09-04T10:20:00Z",
  authoritative: true,
};

export const ORDER_4904 = {
  orderId: "4904",
  status: "delayed",
  customerId: "CUST-2201",
  customerName: "Northwind Supplies",
  sku: "FLT-120 Filter Cartridge",
  quantity: 40,
  warehouse: "CHI-1",
  lot: "L-902",
  carrier: "Redline Logistics",
  promisedDelivery: "2026-09-04",
  currentEta: "2026-09-07",
  delayHours: 72,
  delayCode: "CARRIER_EXCEPTION",
  delayReason:
    "Redline Logistics missed the CHI-1 pickup after a trailer breakdown. The Order API shows the shipment was rebooked for the next outbound wave.",
  holdReleasedAt: "2026-09-05T08:00:00Z",
  authoritative: true,
};

export const ORDER_5012 = {
  orderId: "5012",
  status: "delayed",
  customerId: "CUST-8801",
  customerName: "Atlas Clinics",
  sku: "MON-55 Patient Monitor",
  quantity: 6,
  warehouse: "AUS-2",
  lot: "L-441",
  carrier: "Swiftline",
  promisedDelivery: "2026-09-02",
  currentEta: "2026-09-06",
  delayHours: 80,
  delayCode: "PAYMENT_HOLD",
  delayReason:
    "A payment authorization hold blocked release at AUS-2. The hold cleared after finance confirmation and the order missed the original Swiftline cutoff.",
  holdReleasedAt: "2026-09-04T16:40:00Z",
  authoritative: true,
};

export const CUSTOMER_1042 = {
  customerId: "CUST-1042",
  name: "Horizon Retail",
  tier: "enterprise",
  accountManager: "Priya Shah",
  contact: "ops@horizonretail.example",
  sla: "Notify the customer within 4 hours of a confirmed delay. Enterprise delays over 48 hours require account-manager escalation and a complimentary expedite offer.",
  lastComplaint: "Shipment ARR-3319 arrived two days late.",
};

export const CUSTOMER_2201 = {
  customerId: "CUST-2201",
  name: "Northwind Supplies",
  tier: "mid-market",
  accountManager: "Jonah Hale",
  contact: "logistics@northwind.example",
  sla: "Notify the customer within one business day of a confirmed delay.",
  lastComplaint: "None in the last 90 days.",
};

export const CUSTOMER_8801 = {
  customerId: "CUST-8801",
  name: "Atlas Clinics",
  tier: "enterprise",
  accountManager: "Elena Ruiz",
  contact: "supply@atlasclinics.example",
  sla: "Notify the customer within 4 hours of a confirmed delay. Enterprise delays over 48 hours require account-manager escalation and a complimentary expedite offer.",
  lastComplaint: "Need better visibility on clinical equipment ETAs.",
};

export const ORDERS = {
  "4821": ORDER_4821,
  "4904": ORDER_4904,
  "5012": ORDER_5012,
};

export const CUSTOMERS = {
  "CUST-1042": CUSTOMER_1042,
  "CUST-2201": CUSTOMER_2201,
  "CUST-8801": CUSTOMER_8801,
};

export const KB_ARTICLES = [
  {
    id: "POL-DELAY-04",
    title: "Delayed order playbook",
    body: "The Order API is authoritative for order state. Slack is operational chatter and must not be used as the source of truth. After confirming delay cause, notify the customer using the CRM SLA.",
  },
  {
    id: "POL-ENT-02",
    title: "Enterprise escalation",
    body: "If the customer is enterprise and the delay exceeds 48 hours, escalate to the account manager and offer complimentary expedited reship. Do not issue a refund unless the delay exceeds seven days.",
  },
];

export const SLACK_MESSAGES = [
  {
    channel: "#ops-fulfillment",
    user: "diego",
    text: "anyone seen order 4821? Northline says they never got a pickup window",
  },
  {
    channel: "#ops-fulfillment",
    user: "mina",
    text: "DEN-3 is slammed. Could be a hold but I have not checked the order system",
  },
  {
    channel: "#ops-fulfillment",
    user: "lee",
    text: "heard a rumor it might be customs. unverified",
  },
  {
    channel: "#ops-fulfillment",
    user: "sam",
    text: "4904 might be a Redline issue? still waiting on someone to check the order API",
  },
  {
    channel: "#random",
    user: "josh",
    text: "coffee run, back in 10",
  },
];
