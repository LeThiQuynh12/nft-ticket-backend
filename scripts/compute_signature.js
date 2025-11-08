// scripts/compute_signature.js
const { generateSignature } = require('../utils/payosUtils');
require('dotenv').config();

const sampleData = {
  accountNumber: '123',
  amount: 50000,
  description: 'Test',
  réference: 'ref123',
  transactionDateTime: '2025-01-01T00:00:00Z',
  virtualAccountNumber: '000111222',
  counterAccountBankId: 'VBB',
  counterAccountBankName: 'VietBank',
  counterAccountName: 'Nguyen Van A',
  counterAccountNumber: '0123456789',
  virtualAccountName: 'VA Name',
  currency: 'VND',
  orderCode: 123456,
  paymentLinkId: 'pl_abc123',
  code: '00',
  desc: 'success'
};

const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
const signature = generateSignature(sampleData, checksumKey);
console.log('payload data:', sampleData);
console.log('signature:', signature);
