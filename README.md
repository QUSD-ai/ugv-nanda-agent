# 🦾 UGV NANDA Agent

Turn your Waveshare UGV robot into a NANDA-compliant A2A agent with AGNTCY Identity.

## Quick Start

```bash
# Set your UGV's IP
export UGV_URL=http://192.168.0.100:5000

# Run the agent (auto-generates DID)
bun run start
```

## With Full Network Registration

```bash
# Set OAuth for AGNTCY badge publishing
export OAUTH_CLIENT_ID=your-client-id
export OAUTH_CLIENT_SECRET=your-secret
export OAUTH_ISSUER_URL=https://your-idp.okta.com

# Run - will register on AGNTCY network
bun run start
```

## What You Get

```
http://localhost:3010/.well-known/agent.json  # Agent discovery
http://localhost:3010/a2a                     # JSON-RPC endpoint
```

## Skills

| Skill | Description |
|-------|-------------|
| `move_robot` | Differential drive control |
| `stop_robot` | Emergency stop |
| `set_camera` | Pan-tilt camera |
| `capture_image` | Take photo (base64) |
| `get_sensors` | Battery, distance, IMU |

## Example: Another Agent Commands Your Robot

```typescript
// From any NANDA client
const response = await fetch('http://robot-ip:3010/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'skills/call',
    params: { skill: 'capture_image', input: {} },
    id: 1,
  }),
});

const { result } = await response.json();
console.log(result.image); // Base64 JPEG
```

## Supported Robots

- Waveshare WAVE ROVER
- Waveshare UGV Rover  
- Waveshare UGV Beast
- RaspRover
- Any robot running the Waveshare Flask API

## Identity & Trust

On startup, the agent:
1. **Generates a DID** (Decentralized Identifier)
2. **Creates a local vault** for cryptographic keys
3. **Optionally publishes a badge** to AGNTCY network

Other agents can verify your robot's identity:
```bash
curl http://robot:3010/.well-known/did.json
```

Install AGNTCY CLI for full network participation:
```bash
sh -c "$(curl -sSL https://raw.githubusercontent.com/agntcy/identity/refs/heads/main/deployments/scripts/identity/install_issuer.sh)"
```

## License

MIT
