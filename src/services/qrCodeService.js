import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

// Generate a secure QR code token
export const generateQRToken = async (studentId) => {
  return jwt.sign(
    { 
      studentId,
      type: 'qr_code',
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year expiry
    },
    config.jwt.secret
  );
};

// Verify a QR code token
export const verifyQRToken = async (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'qr_code') {
      throw new Error('Invalid QR code type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired QR code');
  }
};

// Generate QR code image
export const generateQRCode = async (studentId) => {
  const token = await generateQRToken(studentId);
  
  // Generate QR code as base64
  const qrImage = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  return {
    qrImage,
    token
  };
};
