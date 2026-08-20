import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  CreateCashPaymentInput,
  CreateCardPaymentInput,
  CreatePosQrCheckoutInput,
  CreateQrPaymentInput,
  Payment,
  PaymentBreakdown,
  PosQrCheckoutResponse,
  QrPaymentResponse,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) {
    throw new Error(response.message ?? response.error ?? fallback)
  }
  return response.data
}

export const paymentApi = {
  async createCash(input: CreateCashPaymentInput): Promise<Payment> {
    return requireData(
      await api.request<ApiEnvelope<Payment>>('/payments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The cash payment could not be created.',
    )
  },

  async createCard(input: CreateCardPaymentInput): Promise<Payment> {
    return requireData(
      await api.request<ApiEnvelope<Payment>>('/payments', {
        method: 'POST',
        body: JSON.stringify({ ...input, tenderedAmount: input.amount }),
      }),
      'The card payment could not be recorded.',
    )
  },

  async createQr(input: CreateQrPaymentInput): Promise<QrPaymentResponse> {
    return requireData(
      await api.request<ApiEnvelope<QrPaymentResponse>>('/payments/qr', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The KHQR payment QR could not be created.',
    )
  },

  async createPosQr(input: CreatePosQrCheckoutInput): Promise<PosQrCheckoutResponse> {
    return requireData(
      await api.request<ApiEnvelope<PosQrCheckoutResponse>>('/payments/pos-qr', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The POS KHQR checkout could not be created.',
    )
  },

  async createSimulatedPosQr(input: CreatePosQrCheckoutInput): Promise<PosQrCheckoutResponse> {
    return requireData(
      await api.request<ApiEnvelope<PosQrCheckoutResponse>>('/payments/pos-qr-demo', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The simulated POS QR checkout could not be created.',
    )
  },

  async simulateCallback(id: number): Promise<Payment> {
    return requireData(
      await api.request<ApiEnvelope<Payment>>(`/payments/${encodeURIComponent(id)}/simulate-callback`, {
        method: 'POST',
      }),
      'The simulated QR payment could not be verified.',
    )
  },

  async listForOrder(orderId: number): Promise<Payment[]> {
    return requireData(
      await api.request<ApiEnvelope<Payment[]>>(
        `/payments?orderId=${encodeURIComponent(orderId)}`,
      ),
      'Payment activity could not be loaded.',
    )
  },

  async breakdown(storeId: string | number, from: string, to: string): Promise<PaymentBreakdown[]> {
    return requireData(
      await api.request<ApiEnvelope<PaymentBreakdown[]>>(
        `/payments/reports/breakdown?storeId=${encodeURIComponent(storeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
      'The payment breakdown could not be loaded.',
    )
  },

  async get(id: number): Promise<Payment> {
    return requireData(
      await api.request<ApiEnvelope<Payment>>(`/payments/${encodeURIComponent(id)}`),
      'Payment status could not be loaded.',
    )
  },
}
