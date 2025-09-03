/**
 * Git Key Utilities
 * 
 * Utilities for working with Git public keys
 */

import { GitPublicKey } from "~/types";

/**
 * Parse SSH public key to extract key information
 */
export function parseSSHPublicKey(publicKey: string): {
  algorithm: string;
  keyData: string;
  comment?: string;
} | null {
  try {
    const parts = publicKey.trim().split(/\s+/);
    if (parts.length < 2) {
      return null;
    }
    
    const algorithm = parts[0];
    const keyData = parts[1];
    const comment = parts.length > 2 ? parts.slice(2).join(' ') : undefined;
    
    return { algorithm, keyData, comment };
  } catch {
    return null;
  }
}

/**
 * Generate SSH key fingerprint (simplified for demo - real implementation would use crypto)
 */
export function generateSSHFingerprint(publicKey: string): string {
  const parsed = parseSSHPublicKey(publicKey);
  if (!parsed) {
    throw new Error("Invalid SSH public key format");
  }
  
  // Simplified fingerprint generation for demo
  // In real implementation, this would use SHA256 hash of the key data
  const hash = btoa(parsed.keyData).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  return `SHA256:${hash.match(/.{1,2}/g)?.join(':') || hash}`;
}

/**
 * Validate SSH public key format
 */
export function validateSSHPublicKey(publicKey: string): {
  isValid: boolean;
  error?: string;
  algorithm?: string;
  keySize?: number;
} {
  try {
    const parsed = parseSSHPublicKey(publicKey);
    if (!parsed) {
      return {
        isValid: false,
        error: "公開鍵の形式が正しくありません"
      };
    }
    
    const validAlgorithms = ['ssh-rsa', 'ssh-dss', 'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'];
    if (!validAlgorithms.includes(parsed.algorithm)) {
      return {
        isValid: false,
        error: `サポートされていないアルゴリズムです: ${parsed.algorithm}`
      };
    }
    
    // Estimate key size based on algorithm and key data length
    let keySize: number | undefined;
    switch (parsed.algorithm) {
      case 'ssh-rsa':
        // RSA key size estimation based on base64 length
        const rsaKeyLength = parsed.keyData.length;
        if (rsaKeyLength > 500) keySize = 4096;
        else if (rsaKeyLength > 350) keySize = 2048;
        else keySize = 1024;
        break;
      case 'ssh-ed25519':
        keySize = 256;
        break;
      case 'ecdsa-sha2-nistp256':
        keySize = 256;
        break;
      case 'ecdsa-sha2-nistp384':
        keySize = 384;
        break;
      case 'ecdsa-sha2-nistp521':
        keySize = 521;
        break;
    }
    
    return {
      isValid: true,
      algorithm: parsed.algorithm,
      keySize
    };
  } catch (error) {
    return {
      isValid: false,
      error: "公開鍵の検証中にエラーが発生しました"
    };
  }
}

/**
 * Format key algorithm for display
 */
export function formatKeyAlgorithm(algorithm: string): string {
  const algorithmMap: Record<string, string> = {
    'ssh-rsa': 'RSA',
    'ssh-dss': 'DSS',
    'ssh-ed25519': 'Ed25519',
    'ecdsa-sha2-nistp256': 'ECDSA P-256',
    'ecdsa-sha2-nistp384': 'ECDSA P-384',
    'ecdsa-sha2-nistp521': 'ECDSA P-521',
  };
  
  return algorithmMap[algorithm] || algorithm.toUpperCase();
}

/**
 * Get key strength indicator based on algorithm and key size
 */
export function getKeyStrength(algorithm: string, keySize?: number): {
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  label: string;
  color: string;
} {
  switch (algorithm) {
    case 'ssh-rsa':
      if (!keySize || keySize < 2048) {
        return { level: 'weak', label: '弱い', color: 'danger' };
      } else if (keySize === 2048) {
        return { level: 'medium', label: '標準', color: 'warning' };
      } else if (keySize >= 4096) {
        return { level: 'very-strong', label: '非常に強い', color: 'success' };
      }
      return { level: 'strong', label: '強い', color: 'info' };
    
    case 'ssh-ed25519':
      return { level: 'very-strong', label: '非常に強い', color: 'success' };
    
    case 'ecdsa-sha2-nistp256':
      return { level: 'strong', label: '強い', color: 'info' };
    
    case 'ecdsa-sha2-nistp384':
    case 'ecdsa-sha2-nistp521':
      return { level: 'very-strong', label: '非常に強い', color: 'success' };
    
    case 'ssh-dss':
      return { level: 'weak', label: '弱い (非推奨)', color: 'danger' };
    
    default:
      return { level: 'medium', label: '不明', color: 'secondary' };
  }
}

/**
 * Extract repository name from Git URL
 */
export function extractRepositoryName(repositoryUrl: string): string {
  try {
    const url = new URL(repositoryUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    if (pathParts.length >= 2) {
      const repoName = pathParts[pathParts.length - 1].replace(/\.git$/, '');
      const ownerName = pathParts[pathParts.length - 2];
      return `${ownerName}/${repoName}`;
    }
    return pathParts[pathParts.length - 1]?.replace(/\.git$/, '') || repositoryUrl;
  } catch {
    // If URL parsing fails, try to extract from various Git URL formats
    const patterns = [
      /([^\/]+)\/([^\/]+)\.git$/,  // https://github.com/user/repo.git
      /([^\/]+)\/([^\/]+)$/,       // https://github.com/user/repo
      /:([^\/]+)\/(.+)\.git$/,     // git@github.com:user/repo.git
      /:([^\/]+)\/(.+)$/,          // git@github.com:user/repo
    ];
    
    for (const pattern of patterns) {
      const match = repositoryUrl.match(pattern);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
    
    return repositoryUrl;
  }
}

/**
 * Sort Git public keys by various criteria
 */
export function sortGitPublicKeys(
  keys: GitPublicKey[], 
  sortBy: 'name' | 'createdAt' | 'lastUsed' | 'keyType' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): GitPublicKey[] {
  return [...keys].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'lastUsed':
        const aLastUsed = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bLastUsed = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        compareValue = aLastUsed - bLastUsed;
        break;
      case 'keyType':
        compareValue = a.keyType.localeCompare(b.keyType);
        break;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });
}

/**
 * Filter Git public keys
 */
export function filterGitPublicKeys(
  keys: GitPublicKey[],
  filters: {
    search?: string;
    keyType?: 'SSH' | 'GPG';
    isActive?: boolean;
    repository?: string;
  }
): GitPublicKey[] {
  return keys.filter(key => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!key.name.toLowerCase().includes(searchLower) &&
          !key.fingerprint.toLowerCase().includes(searchLower) &&
          !key.algorithm.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    if (filters.keyType && key.keyType !== filters.keyType) {
      return false;
    }
    
    if (filters.isActive !== undefined && key.isActive !== filters.isActive) {
      return false;
    }
    
    if (filters.repository) {
      if (!key.associatedRepositories.some(repo => 
        repo.toLowerCase().includes(filters.repository!.toLowerCase())
      )) {
        return false;
      }
    }
    
    return true;
  });
}