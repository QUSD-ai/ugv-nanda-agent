/**
 * UGV NANDA Agent
 * 
 * Turns a Waveshare UGV robot into a NANDA-compliant A2A agent.
 */

import { serve } from 'bun';

export interface UGVConfig {
  ugvUrl: string;
  agentName?: string;
  agentPort?: number;
  description?: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: Capability[];
  skills: Skill[];
}

export interface Capability {
  name: string;
  description: string;
}

export interface Skill {
  name: string;
  description: string;
  inputSchema?: object;
  outputSchema?: object;
}

// UGV Client - talks to the robot's Flask server
export class UGVClient {
  constructor(private baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async move(left: number, right: number) {
    return this.post('/api/motor', { left, right });
  }

  async stop() {
    return this.move(0, 0);
  }

  async setPanTilt(pan: number, tilt: number) {
    return this.post('/api/pantilt', { pan, tilt });
  }

  async getSensors() {
    return this.get('/api/sensors');
  }

  async captureImage(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/capture`);
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private async get(path: string) {
    const res = await fetch(`${this.baseUrl}${path}`);
    return res.json();
  }

  private async post(path: string, data: any) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json().catch(() => ({ success: true }));
  }
}

// Skill definitions
const SKILLS: Skill[] = [
  {
    name: 'move_robot',
    description: 'Move the robot with differential drive. Speeds from -100 (reverse) to 100 (forward).',
    inputSchema: {
      type: 'object',
      properties: {
        leftSpeed: { type: 'number', minimum: -100, maximum: 100, description: 'Left motor speed' },
        rightSpeed: { type: 'number', minimum: -100, maximum: 100, description: 'Right motor speed' },
      },
      required: ['leftSpeed', 'rightSpeed'],
    },
  },
  {
    name: 'stop_robot',
    description: 'Stop all motors immediately.',
  },
  {
    name: 'set_camera',
    description: 'Set the pan-tilt camera position in degrees.',
    inputSchema: {
      type: 'object',
      properties: {
        pan: { type: 'number', minimum: -90, maximum: 90, description: 'Horizontal angle' },
        tilt: { type: 'number', minimum: -90, maximum: 90, description: 'Vertical angle' },
      },
      required: ['pan', 'tilt'],
    },
  },
  {
    name: 'capture_image',
    description: 'Capture an image from the robot camera. Returns base64 JPEG.',
    outputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Base64-encoded JPEG image' },
        timestamp: { type: 'string', description: 'ISO timestamp' },
      },
    },
  },
  {
    name: 'get_sensors',
    description: 'Get sensor readings: battery level, ultrasonic distances, IMU data.',
    outputSchema: {
      type: 'object',
      properties: {
        battery: { type: 'number', description: 'Battery percentage' },
        distance: { type: 'array', items: { type: 'number' }, description: 'Ultrasonic distances in cm' },
        imu: { type: 'object', description: 'Accelerometer and gyroscope data' },
      },
    },
  },
];

export function createUGVAgent(config: UGVConfig) {
  const client = new UGVClient(config.ugvUrl);
  const name = config.agentName || 'ugv-robot';
  const port = config.agentPort || 3010;
  const description = config.description || 'Waveshare UGV robot with camera and sensors';

  // Agent card for discovery
  const agentCard: AgentCard = {
    name,
    description,
    url: `http://localhost:${port}`,
    version: '0.1.0',
    capabilities: [
      { name: 'mobility', description: 'Can move and navigate' },
      { name: 'vision', description: 'Has camera for visual input' },
      { name: 'sensing', description: 'Has distance and IMU sensors' },
    ],
    skills: SKILLS,
  };

  // Skill handlers
  async function handleSkill(skillName: string, input: any): Promise<any> {
    switch (skillName) {
      case 'move_robot':
        await client.move(input.leftSpeed, input.rightSpeed);
        return { success: true, message: `Moving: L=${input.leftSpeed}, R=${input.rightSpeed}` };

      case 'stop_robot':
        await client.stop();
        return { success: true, message: 'Robot stopped' };

      case 'set_camera':
        await client.setPanTilt(input.pan, input.tilt);
        return { success: true, message: `Camera: pan=${input.pan}, tilt=${input.tilt}` };

      case 'capture_image':
        const image = await client.captureImage();
        return { image, timestamp: new Date().toISOString() };

      case 'get_sensors':
        return await client.getSensors();

      default:
        throw new Error(`Unknown skill: ${skillName}`);
    }
  }

  // Start the A2A server
  const server = serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      
      // CORS headers
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      // Agent discovery endpoint
      if (url.pathname === '/.well-known/agent.json') {
        return Response.json(agentCard, { headers });
      }

      // A2A JSON-RPC endpoint
      if (url.pathname === '/a2a' && req.method === 'POST') {
        try {
          const body = await req.json();
          const { method, params, id } = body;

          if (method === 'skills/list') {
            return Response.json({
              jsonrpc: '2.0',
              id,
              result: { skills: SKILLS },
            }, { headers });
          }

          if (method === 'skills/call') {
            const result = await handleSkill(params.skill, params.input || {});
            return Response.json({
              jsonrpc: '2.0',
              id,
              result,
            }, { headers });
          }

          return Response.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'Method not found' },
          }, { headers });

        } catch (err: any) {
          return Response.json({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32000, message: err.message },
          }, { headers });
        }
      }

      // Health check
      if (url.pathname === '/health') {
        return Response.json({ status: 'ok', name, uptime: process.uptime() }, { headers });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers });
    },
  });

  console.log(`
🦾 UGV NANDA Agent
   
   Name:    ${name}
   UGV:     ${config.ugvUrl}
   A2A:     http://localhost:${port}
   
   Discovery: http://localhost:${port}/.well-known/agent.json
   Skills:    ${SKILLS.map(s => s.name).join(', ')}
`);

  return { server, client, agentCard, handleSkill };
}

// CLI entry point
if (import.meta.main) {
  const ugvUrl = process.env.UGV_URL || 'http://localhost:5000';
  const port = parseInt(process.env.PORT || '3010');
  const name = process.env.AGENT_NAME || 'ugv-robot';

  createUGVAgent({
    ugvUrl,
    agentPort: port,
    agentName: name,
    description: 'Waveshare UGV robot with NANDA A2A interface',
  });
}
