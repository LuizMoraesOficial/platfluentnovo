const BASE_URL_PRODUCTION = 'https://api.asaas.com';
const BASE_URL_SANDBOX = 'https://sandbox.asaas.com/api';

class AsaasService {
  constructor(apiToken, sandbox = true) {
    this.apiToken = apiToken;
    this.baseUrl = sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Asaas API Request: ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiToken
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type');
      
      // Check if response is JSON
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Asaas API returned non-JSON response:', textResponse.substring(0, 500));
        throw new Error(`Asaas API retornou resposta inválida (${response.status}). Verifique sua chave de API.`);
      }
      
      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.errors?.[0]?.description || responseData.message || 'Erro na requisição ao Asaas';
        console.error('Asaas API Error Response:', responseData);
        throw new Error(errorMsg);
      }

      return responseData;
    } catch (error) {
      console.error('Asaas API Error:', error.message);
      throw error;
    }
  }

  async createCustomer(customerData) {
    return this.request('POST', '/v3/customers', {
      name: customerData.name,
      email: customerData.email,
      cpfCnpj: customerData.cpfCnpj,
      phone: customerData.phone,
      mobilePhone: customerData.mobilePhone,
      postalCode: customerData.postalCode,
      address: customerData.address,
      addressNumber: customerData.addressNumber,
      complement: customerData.complement,
      province: customerData.province,
      notificationDisabled: customerData.notificationDisabled || false
    });
  }

  async getCustomer(customerId) {
    return this.request('GET', `/v3/customers/${customerId}`);
  }

  async listCustomers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request('GET', `/v3/customers${queryParams ? '?' + queryParams : ''}`);
  }

  async createSubscription(subscriptionData) {
    const payload = {
      customer: subscriptionData.customerId,
      billingType: subscriptionData.billingType,
      nextDueDate: subscriptionData.nextDueDate,
      value: subscriptionData.value,
      cycle: subscriptionData.cycle,
      description: subscriptionData.description,
      discount: subscriptionData.discount,
      interest: subscriptionData.interest,
      fine: subscriptionData.fine
    };

    if (subscriptionData.billingType === 'CREDIT_CARD' && subscriptionData.creditCard) {
      payload.creditCard = {
        holderName: subscriptionData.creditCard.holderName,
        number: subscriptionData.creditCard.number,
        expiryMonth: subscriptionData.creditCard.expiryMonth,
        expiryYear: subscriptionData.creditCard.expiryYear,
        ccv: subscriptionData.creditCard.ccv
      };
      payload.creditCardHolderInfo = {
        name: subscriptionData.creditCardHolderInfo.name,
        email: subscriptionData.creditCardHolderInfo.email,
        cpfCnpj: subscriptionData.creditCardHolderInfo.cpfCnpj,
        postalCode: subscriptionData.creditCardHolderInfo.postalCode,
        addressNumber: subscriptionData.creditCardHolderInfo.addressNumber,
        addressComplement: subscriptionData.creditCardHolderInfo.addressComplement,
        phone: subscriptionData.creditCardHolderInfo.phone,
        mobilePhone: subscriptionData.creditCardHolderInfo.mobilePhone
      };
    }

    return this.request('POST', '/v3/subscriptions', payload);
  }

  async getSubscription(subscriptionId) {
    return this.request('GET', `/v3/subscriptions/${subscriptionId}`);
  }

  async listSubscriptions(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request('GET', `/v3/subscriptions${queryParams ? '?' + queryParams : ''}`);
  }

  async updateSubscription(subscriptionId, updateData) {
    const payload = {};
    
    if (updateData.value !== undefined) payload.value = updateData.value;
    if (updateData.nextDueDate !== undefined) payload.nextDueDate = updateData.nextDueDate;
    if (updateData.billingType !== undefined) payload.billingType = updateData.billingType;
    if (updateData.cycle !== undefined) payload.cycle = updateData.cycle;
    if (updateData.description !== undefined) payload.description = updateData.description;
    if (updateData.updatePendingPayments !== undefined) payload.updatePendingPayments = updateData.updatePendingPayments;

    return this.request('POST', `/v3/subscriptions/${subscriptionId}`, payload);
  }

  async deleteSubscription(subscriptionId) {
    return this.request('DELETE', `/v3/subscriptions/${subscriptionId}`);
  }

  async getSubscriptionPayments(subscriptionId) {
    return this.request('GET', `/v3/subscriptions/${subscriptionId}/payments`);
  }

  async updateSubscriptionCreditCard(subscriptionId, creditCardData) {
    const payload = {
      creditCard: {
        holderName: creditCardData.creditCard.holderName,
        number: creditCardData.creditCard.number,
        expiryMonth: creditCardData.creditCard.expiryMonth,
        expiryYear: creditCardData.creditCard.expiryYear,
        ccv: creditCardData.creditCard.ccv
      },
      creditCardHolderInfo: {
        name: creditCardData.creditCardHolderInfo.name,
        email: creditCardData.creditCardHolderInfo.email,
        cpfCnpj: creditCardData.creditCardHolderInfo.cpfCnpj,
        postalCode: creditCardData.creditCardHolderInfo.postalCode,
        addressNumber: creditCardData.creditCardHolderInfo.addressNumber,
        addressComplement: creditCardData.creditCardHolderInfo.addressComplement,
        phone: creditCardData.creditCardHolderInfo.phone,
        mobilePhone: creditCardData.creditCardHolderInfo.mobilePhone
      }
    };

    if (creditCardData.creditCardToken) {
      payload.creditCardToken = creditCardData.creditCardToken;
    }
    if (creditCardData.remoteIp) {
      payload.remoteIp = creditCardData.remoteIp;
    }

    return this.request('PUT', `/v3/subscriptions/${subscriptionId}/creditCard`, payload);
  }

  async setSubscriptionInvoiceSettings(subscriptionId, invoiceSettings) {
    const payload = {
      municipalServiceId: invoiceSettings.municipalServiceId,
      municipalServiceCode: invoiceSettings.municipalServiceCode,
      municipalServiceName: invoiceSettings.municipalServiceName,
      deductions: invoiceSettings.deductions,
      effectiveDatePeriod: invoiceSettings.effectiveDatePeriod,
      receivedOnly: invoiceSettings.receivedOnly,
      daysBeforeDueDate: invoiceSettings.daysBeforeDueDate,
      observations: invoiceSettings.observations,
      taxes: invoiceSettings.taxes
    };

    return this.request('POST', `/v3/subscriptions/${subscriptionId}/invoiceSettings`, payload);
  }

  async createPayment(paymentData) {
    const payload = {
      customer: paymentData.customerId,
      billingType: paymentData.billingType,
      dueDate: paymentData.dueDate,
      value: paymentData.value,
      description: paymentData.description,
      externalReference: paymentData.externalReference,
      discount: paymentData.discount,
      interest: paymentData.interest,
      fine: paymentData.fine,
      postalService: paymentData.postalService
    };

    if (paymentData.billingType === 'CREDIT_CARD' && paymentData.creditCard) {
      payload.creditCard = paymentData.creditCard;
      payload.creditCardHolderInfo = paymentData.creditCardHolderInfo;
    }

    return this.request('POST', '/v3/payments', payload);
  }

  async getPayment(paymentId) {
    return this.request('GET', `/v3/payments/${paymentId}`);
  }

  async listPayments(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request('GET', `/v3/payments${queryParams ? '?' + queryParams : ''}`);
  }

  async deletePayment(paymentId) {
    return this.request('DELETE', `/v3/payments/${paymentId}`);
  }

  async getPaymentPixQrCode(paymentId) {
    return this.request('GET', `/v3/payments/${paymentId}/pixQrCode`);
  }

  async getPaymentBankSlipBarCode(paymentId) {
    return this.request('GET', `/v3/payments/${paymentId}/identificationField`);
  }

  async refundPayment(paymentId, value = null, description = null) {
    const payload = {};
    if (value) payload.value = value;
    if (description) payload.description = description;
    
    return this.request('POST', `/v3/payments/${paymentId}/refund`, payload);
  }

  async getBalance() {
    return this.request('GET', '/v3/finance/balance');
  }

  async getAccountStatus() {
    return this.request('GET', '/v3/myAccount/status');
  }
}

export async function createAsaasService(storage) {
  const settings = await storage.getPaymentSettings();
  
  if (!settings.asaasApiToken || settings.asaasApiToken.startsWith('****')) {
    throw new Error('Token da API do Asaas não configurado');
  }

  return new AsaasService(settings.asaasApiToken, settings.asaasSandbox);
}

export { AsaasService };
