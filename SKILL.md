---
name: ugv-nanda-agent
version: 0.1.0
description: Turn Waveshare UGV robots into NANDA-compliant A2A agents with vision, navigation, and task capabilities.
homepage: https://github.com/QUSD-ai/ugv-nanda-agent
metadata: {"qusd":{"emoji":"🦾","category":"robotics","hardware":["waveshare","ugv","jetson","rover"]}}
---

# UGV NANDA Agent

Turn your Waveshare UGV robot into a NANDA-compliant A2A agent that other agents can discover, command, and pay.

## What It Does

```
┌──────────────────────────────────────────────────────────┐
│  UGV Robot (Waveshare)                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Motors  │  │ Camera  │  │ Sensors │  │ Pan/Tilt│     │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
│       └───────────┬┴───────────┴────────────┘           │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  UGV NANDA Agent                                   │ │
│  │  - A2A protocol (/.well-known/agent.json)          │ │
│  │  - Skills: move, look, capture, sense              │ │
│  │  - Optional: X402 payments                         │ │
│  └────────────────────────────────────────────────────┘ │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Discoverable by other agents                      │ │
│  │  "Hey robot, patrol the warehouse"                 │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Supported Hardware

| Device | Motors | Camera | Arm | Compute |
|--------|--------|--------|-----|---------|
| WAVE ROVER | ✅ | ✅ | ❌ | ESP32/RPi |
| UGV Rover | ✅ | ✅ | ❌ | RPi/Jetson |
| UGV Beast | ✅ | ✅ | ✅ | Jetson |
| RaspRover | ✅ | ✅ | ❌ | RPi |

## Quick Start

```bash
# On your Jetson/RPi with the UGV
git clone https://github.com/QUSD-ai/ugv-nanda-agent
cd ugv-nanda-agent
bun install
bun run start
```

## Configuration

```yaml
# config.yaml
ugv:
  url: http://localhost:5000  # UGV Flask server
  
agent:
  name: warehouse-rover-01
  port: 3010
  description: Autonomous patrol robot with camera

nanda:
  identity:
    did: did:key:z6Mk...  # Auto-generated if not set
  
payments:  # Optional X402
  enabled: false
  wallet: 0x...
```

## Agent Skills

### move_robot
```json
{
  "skill": "move_robot",
  "input": { "leftSpeed": 50, "rightSpeed": 50 }
}
```

### set_camera
```json
{
  "skill": "set_camera",
  "input": { "pan": 45, "tilt": -10 }
}
```

### capture_image
```json
{
  "skill": "capture_image",
  "input": {}
}
```
Returns base64 JPEG image.

### get_sensors
```json
{
  "skill": "get_sensors",
  "input": {}
}
```
Returns battery, ultrasonic distances, IMU data.

### patrol (compound skill)
```json
{
  "skill": "patrol",
  "input": { 
    "waypoints": [[0, 0], [100, 0], [100, 100]],
    "captureAtWaypoints": true
  }
}
```

## Multi-Agent Example

```typescript
// Vision agent discovers and commands the UGV
import { NandaClient } from '@qusd/nanda-skill';

const client = new NandaClient();

// Discover robots on the network
const robots = await client.discover({ 
  capabilities: ['move_robot', 'capture_image'] 
});

// Command the first robot
const ugv = robots[0];
await ugv.call('move_robot', { leftSpeed: 30, rightSpeed: 30 });
await sleep(2000);
await ugv.call('stop_robot', {});
const image = await ugv.call('capture_image', {});
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Claude/LLM  │────▶│ NANDA Agent │────▶│ UGV Robot   │
│ (planning)  │◀────│ (protocol)  │◀────│ (hardware)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Other Agents│
                    │ (discover)  │
                    └─────────────┘
```

## Why NANDA + Robots?

1. **Discoverability** — Robots announce themselves on the network
2. **Interoperability** — Standard A2A protocol, any agent can command
3. **Composability** — Vision agent + Nav agent + Arm agent = coordinated system
4. **Payments** — Charge for robot services via X402 micropayments

## Links

- [NANDA Protocol](https://github.com/nanda-ai/nanda)
- [Waveshare UGV Wiki](https://www.waveshare.com/wiki/UGV_Rover)
- [QUSD Agent Economy](https://qusd.ai)
