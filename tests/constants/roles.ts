import { keccak256 } from 'ethers';

export const SIGNER_ROLE = keccak256(Buffer.from('SIGNER_ROLE'));
export const FINANCIAL_ROLE = keccak256(Buffer.from('FINANCIAL_ROLE'));
export const ADMIN_ROLE = keccak256(Buffer.from('ADMIN_ROLE'));
export const PARTNER_ROLE = keccak256(Buffer.from('PARTNER_ROLE'));
