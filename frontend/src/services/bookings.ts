import { apiClient } from './auth'

export interface BookingPassenger {
  first_name: string
  last_name: string
  dob: string
  passport_number: string
  nationality?: string
  passport_expiry?: string
  email: string
}

export interface CreateBookingPayload {
  flight_id: string
  flight_number?: string
  origin?: string
  destination?: string
  depart_date?: string
  cabin_class?: string
  price_usd?: number
  passenger: BookingPassenger
  seat_preference: string
  meal_preference: string
  special_assistance?: string
}

export interface BookingResult {
  booking_id: string
  reference: string
  status: string
  created_at: string
}

export async function createBooking(payload: CreateBookingPayload): Promise<BookingResult> {
  const { data } = await apiClient.post<BookingResult>('/chat/bookings', payload)
  return data
}

export async function getBooking(bookingId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/chat/bookings/${bookingId}`)
  return data
}
