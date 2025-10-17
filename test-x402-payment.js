#!/usr/bin/env node

/**
 * Test script for x402 payment flow
 * Run this to test your production x402 setup
 * 
 * Usage: node test-x402-payment.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/gemini/text-to-image';

async function testPaymentFlow() {
  console.log('🧪 Testing x402 Payment Flow...\n');
  
  try {
    // Test 1: Check if endpoint returns 402 Payment Required
    console.log('1️⃣ Testing 402 Payment Required response...');
    
    const response = await makeRequest({
      method: 'POST',
      path: ENDPOINT,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test image generation'
      })
    });
    
    if (response.statusCode === 402) {
      console.log('✅ Successfully received 402 Payment Required');
      console.log('📄 Payment instructions:', JSON.stringify(response.body, null, 2));
    } else {
      console.log('❌ Expected 402, got:', response.statusCode);
      console.log('📄 Response:', response.body);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const isHttps = options.hostname?.includes('https') || API_URL.startsWith('https');
    const client = isHttps ? https : http;
    
    const url = new URL(API_URL + options.path);
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run the test
if (require.main === module) {
  testPaymentFlow().then(() => {
    console.log('\n🎯 Next steps:');
    console.log('1. Set your environment variables in .env.local');
    console.log('2. Test with a real x402 client');
    console.log('3. Deploy to production');
    console.log('\n📚 See X402_SETUP_GUIDE.md for detailed instructions');
  });
}

module.exports = { testPaymentFlow };
