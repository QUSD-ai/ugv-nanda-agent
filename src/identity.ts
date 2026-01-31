/**
 * AGNTCY Identity Integration
 * 
 * Auto-registers agent with DID and publishes badge on startup.
 * Other agents can verify this robot's identity before interacting.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

export interface IdentityConfig {
  vaultPath?: string;
  agentName: string;
  agentUrl: string;
  organization?: string;
  capabilities?: string[];
  // OAuth config (optional - for full issuer registration)
  oauth?: {
    clientId: string;
    clientSecret: string;
    issuerUrl: string;
  };
}

export interface AgentIdentity {
  did: string;
  publicKey: string;
  badgeId?: string;
  vaultPath: string;
}

const IDENTITY_DIR = join(homedir(), '.agntcy');
const VAULT_FILE = join(IDENTITY_DIR, 'vault.json');
const IDENTITY_CACHE = join(IDENTITY_DIR, 'agent-identity.json');

/**
 * Check if identity CLI is installed
 */
async function hasIdentityCLI(): Promise<boolean> {
  try {
    await execAsync('identity --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize the identity vault and generate keys
 */
async function initializeVault(vaultPath: string): Promise<void> {
  // Create directory if needed
  if (!existsSync(IDENTITY_DIR)) {
    mkdirSync(IDENTITY_DIR, { recursive: true });
  }

  // Check if vault exists
  if (existsSync(vaultPath)) {
    console.log('  ✓ Vault exists');
    return;
  }

  console.log('  Creating vault...');
  await execAsync(`identity vault connect file -f "${vaultPath}" -v "QUSD Agent Vault"`);
  
  console.log('  Generating keypair...');
  await execAsync('identity vault key generate');
}

/**
 * Generate a local DID without full issuer registration
 * This creates a did:key based on the vault's keypair
 */
async function generateLocalDID(): Promise<{ did: string; publicKey: string }> {
  try {
    // Get the public key from vault
    const { stdout } = await execAsync('identity vault key list --json');
    const keys = JSON.parse(stdout);
    
    if (keys && keys.length > 0) {
      const key = keys[0];
      // Generate did:key from public key
      const did = `did:key:${key.id || key.publicKey?.slice(0, 32)}`;
      return { did, publicKey: key.publicKey || key.id };
    }
  } catch (err) {
    // Fallback: generate a simple local DID
    const randomId = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
    return {
      did: `did:key:z${randomId}`,
      publicKey: randomId,
    };
  }
  
  // Fallback
  const randomId = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
  return {
    did: `did:key:z${randomId}`,
    publicKey: randomId,
  };
}

/**
 * Issue and publish a badge for this agent
 */
async function issueBadge(config: IdentityConfig): Promise<string | null> {
  if (!config.oauth) {
    console.log('  ⚠ No OAuth config - badge not published to network');
    console.log('    (Agent still works, just not discoverable via AGNTCY)');
    return null;
  }

  try {
    // Register as issuer if needed
    console.log('  Registering as issuer...');
    await execAsync(`identity issuer register -o "${config.organization || 'QUSD'}" \
      -c "${config.oauth.clientId}" \
      -s "${config.oauth.clientSecret}" \
      -u "${config.oauth.issuerUrl}"`);

    // Issue badge
    console.log('  Issuing badge...');
    const capabilities = config.capabilities?.join(',') || 'agent';
    const { stdout } = await execAsync(`identity badge issue a2a \
      -u "${config.agentUrl}" \
      -n "${config.agentName}" \
      --capabilities "${capabilities}" \
      --json`);
    
    const badge = JSON.parse(stdout);

    // Publish to network
    console.log('  Publishing badge...');
    await execAsync('identity badge publish');

    return badge.id || badge.badgeId;
  } catch (err: any) {
    console.log(`  ⚠ Badge issue failed: ${err.message}`);
    return null;
  }
}

/**
 * Load cached identity or return null
 */
function loadCachedIdentity(): AgentIdentity | null {
  try {
    if (existsSync(IDENTITY_CACHE)) {
      const data = readFileSync(IDENTITY_CACHE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return null;
}

/**
 * Save identity to cache
 */
function saveIdentity(identity: AgentIdentity): void {
  writeFileSync(IDENTITY_CACHE, JSON.stringify(identity, null, 2));
}

/**
 * Initialize agent identity
 * - Creates vault if needed
 * - Generates DID
 * - Optionally publishes badge to AGNTCY network
 */
export async function initializeIdentity(config: IdentityConfig): Promise<AgentIdentity> {
  console.log('🔐 Initializing Agent Identity...');

  const vaultPath = config.vaultPath || VAULT_FILE;

  // Check for cached identity
  const cached = loadCachedIdentity();
  if (cached && existsSync(cached.vaultPath)) {
    console.log(`  ✓ Loaded cached identity: ${cached.did.slice(0, 30)}...`);
    return cached;
  }

  // Check if CLI is available
  const hasCLI = await hasIdentityCLI();
  
  if (hasCLI) {
    // Full identity flow with CLI
    await initializeVault(vaultPath);
    const { did, publicKey } = await generateLocalDID();
    const badgeId = await issueBadge(config);

    const identity: AgentIdentity = {
      did,
      publicKey,
      badgeId: badgeId || undefined,
      vaultPath,
    };

    saveIdentity(identity);
    console.log(`  ✓ Identity ready: ${did.slice(0, 30)}...`);
    return identity;
  } else {
    // Fallback: generate local DID without CLI
    console.log('  ⚠ Identity CLI not found - using local DID');
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Buffer.from(randomBytes).toString('hex');
    
    const identity: AgentIdentity = {
      did: `did:key:z${hex.slice(0, 32)}`,
      publicKey: hex,
      vaultPath: '',
    };

    saveIdentity(identity);
    console.log(`  ✓ Local identity: ${identity.did.slice(0, 30)}...`);
    console.log('  → Install AGNTCY CLI for full network registration:');
    console.log('    sh -c "$(curl -sSL https://raw.githubusercontent.com/agntcy/identity/refs/heads/main/deployments/scripts/identity/install_issuer.sh)"');
    
    return identity;
  }
}

/**
 * Get the /.well-known/agent-identity.json response
 */
export function getIdentityDocument(identity: AgentIdentity, agentCard: any) {
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/v2'],
    id: identity.did,
    publicKey: [{
      id: `${identity.did}#key-1`,
      type: 'Ed25519VerificationKey2020',
      controller: identity.did,
      publicKeyHex: identity.publicKey,
    }],
    authentication: [`${identity.did}#key-1`],
    service: [{
      id: `${identity.did}#a2a`,
      type: 'A2AAgent',
      serviceEndpoint: agentCard.url,
    }],
    agentCard,
    badge: identity.badgeId ? {
      id: identity.badgeId,
      verificationUrl: `/.well-known/vcs.json`,
    } : undefined,
  };
}
