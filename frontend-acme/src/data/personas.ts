export interface TripContext {
  destination: string
  iata: string
  purpose: string
  depart: string
  returnDate: string
  scope: string[]
}

export interface PolicySummary {
  id: string
  name: string
  color: string
  flightClass: string
  hotelTier: string
  hotelCap: string
  carClass: string
  approvalRequired: boolean
  approvalNote?: string
  tripCap: string
  badge: string
}

export interface Persona {
  key: string
  username: string
  password: string
  displayName: string
  firstName: string
  title: string
  department: string
  email: string
  baseAirport: string
  trip: TripContext
  policy: PolicySummary
  prompts: { icon: string; text: string }[]
}

export const PERSONAS: Record<string, Persona> = {
  steve: {
    key: 'steve',
    username: 'steve.m',
    password: 'acme2026',
    displayName: 'Steve M',
    firstName: 'Steve',
    title: 'Executive President',
    department: 'C-Suite',
    email: 'steve.m@acmecorp.com',
    baseAirport: 'SFO',
    trip: {
      destination: 'Bengaluru, India',
      iata: 'BLR',
      purpose: 'Internal Office Visit',
      depart: 'July 14, 2026',
      returnDate: 'July 21, 2026',
      scope: ['Flight', 'Hotel', 'Car'],
    },
    policy: {
      id: 'executive',
      name: 'Executive Policy',
      color: '#7C3AED',
      flightClass: 'Business / First class',
      hotelTier: '5-star hotels',
      hotelCap: '$600 / night',
      carClass: 'Full-size / Luxury',
      approvalRequired: false,
      tripCap: 'Auto-approved up to $20,000',
      badge: '👑',
    },
    prompts: [
      { icon: '📊', text: 'Book the complete trip to Bengaluru — business class flight, 5-star hotel, and luxury car for July 14–21' },
      { icon: '✈', text: 'Search business class flights from San Francisco SFO to Bengaluru BLR, departing July 14, returning July 21' },
      { icon: '🏨', text: 'Find a 5-star hotel in Bengaluru for July 14–21, budget up to $600 per night' },
      { icon: '🚗', text: 'Reserve a luxury car rental in Bengaluru from July 14 to July 21' },
      { icon: '📋', text: 'What does my Executive travel policy cover for international trips?' },
      { icon: '💰', text: 'What is the estimated total cost of my Bengaluru office visit — flight, hotel, and car?' },
    ],
  },

  rick: {
    key: 'rick',
    username: 'rick.m',
    password: 'acme2026',
    displayName: 'Rick M',
    firstName: 'Rick',
    title: 'Sales Executive',
    department: 'Sales',
    email: 'rick.m@acmecorp.com',
    baseAirport: 'SFO',
    trip: {
      destination: 'New York, NY',
      iata: 'JFK',
      purpose: 'Customer Visit — Zava Corp',
      depart: 'August 4, 2026',
      returnDate: 'August 7, 2026',
      scope: ['Flight', 'Hotel', 'Car'],
    },
    policy: {
      id: 'sales',
      name: 'Sales Policy',
      color: '#0891B2',
      flightClass: 'Economy / Business',
      hotelTier: 'Up to 4-star hotels',
      hotelCap: '$350 / night',
      carClass: 'Mid-size / Full-size',
      approvalRequired: false,
      tripCap: 'Auto-approved up to $5,000',
      badge: '💼',
    },
    prompts: [
      { icon: '🤝', text: 'Book the complete Zava Corp visit — flight, hotel, and car for New York August 4–7' },
      { icon: '✈', text: 'Find flights from San Francisco SFO to New York JFK, departing August 4, returning August 7' },
      { icon: '🏨', text: 'Book a 4-star hotel near Midtown Manhattan for August 4–7, under $350 per night' },
      { icon: '🚗', text: 'Reserve a full-size rental car at JFK airport from August 4 to August 7' },
      { icon: '📋', text: 'What does my Sales travel policy cover for domestic customer visits?' },
      { icon: '💰', text: 'What is the estimated total cost of my New York trip for the Zava Corp visit?' },
    ],
  },

  nicholas: {
    key: 'nicholas',
    username: 'nicholas.j',
    password: 'acme2026',
    displayName: 'Nicholas J',
    firstName: 'Nicholas',
    title: 'Engineer',
    department: 'Engineering',
    email: 'nicholas.j@acmecorp.com',
    baseAirport: 'SFO',
    trip: {
      destination: 'Chicago, IL',
      iata: 'ORD',
      purpose: 'AWS Summit 2026',
      depart: 'September 9, 2026',
      returnDate: 'September 12, 2026',
      scope: ['Flight', 'Hotel'],
    },
    policy: {
      id: 'conference',
      name: 'Conference Policy',
      color: '#059669',
      flightClass: 'Economy only',
      hotelTier: 'Up to 3-star hotels',
      hotelCap: '$220 / night',
      carClass: 'Not covered — rideshare/CTA',
      approvalRequired: true,
      approvalNote: 'Engineering VP approval required',
      tripCap: 'Up to $3,000 with approval',
      badge: '🎟',
    },
    prompts: [
      { icon: '🎟', text: 'Book my AWS Summit Chicago trip — economy flight and hotel for September 9–12' },
      { icon: '✈', text: 'Find economy flights from San Francisco SFO to Chicago ORD, departing September 9, returning September 12' },
      { icon: '🏨', text: 'Book the AWS Summit conference hotel in Chicago for September 9–12, under $220 per night' },
      { icon: '📋', text: 'What does my Conference travel policy cover for AWS Summit attendance?' },
      { icon: '📝', text: 'What approvals do I need for conference travel to AWS Summit?' },
      { icon: '🔎', text: 'Show me economy flight options from SFO to ORD for September 9' },
    ],
  },
}

export const PERSONA_LIST = Object.values(PERSONAS)
