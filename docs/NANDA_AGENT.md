# 🦾 UGV Jetson × NANDA × QUSD

**AI + Blockchain + Robotics — converged.**

This project turns a Waveshare UGV robot running on Jetson into a fully autonomous economic agent that can:

1. **Think** — LLM-powered planning and vision
2. **Act** — Physical movement, manipulation, sensing
3. **Earn** — Accept payments for services via X402/crypto

## The Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        INTELLIGENCE                          │
│  Claude / GPT / Local LLM (Ollama on Jetson)                │
│  - Task planning                                             │
│  - Visual understanding                                      │
│  - Natural language commands                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                         PROTOCOL                             │
│  NANDA (A2A) — Agent-to-Agent Communication                 │
│  - /.well-known/agent.json (discovery)                      │
│  - JSON-RPC skills interface                                │
│  - Multi-agent coordination                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                         PAYMENTS                             │
│  X402 / QUSD — Micropayments for Robot Services             │
│  - Pay-per-task (patrol: $0.10)                             │
│  - Pay-per-image (capture: $0.001)                          │
│  - Subscription access                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                         HARDWARE                             │
│  Waveshare UGV + Jetson Orin Nano                           │
│  - Differential drive motors                                 │
│  - Pan-tilt camera                                          │
│  - Ultrasonic sensors                                       │
│  - Optional: Robot arm                                       │
└─────────────────────────────────────────────────────────────┘
```

## Why This Matters

### 🤖 Robots become services
Your robot isn't just a machine — it's an API endpoint. Other agents (or humans) can discover it, see what it can do, and pay it to perform tasks.

### 🔗 Agents coordinate
A vision agent spots an anomaly → tells the patrol robot → robot investigates → sends image back → vision agent analyzes → human gets alert. All autonomous.

### 💰 Robots earn money
Your warehouse robot charges $0.05 per patrol. Your delivery bot charges $2 per drop-off. Your camera drone charges $0.001 per image. Autonomous income.

### 🧠 AI makes decisions
Not remote-controlled. The robot has an LLM brain that understands "patrol the perimeter" and figures out the waypoints itself.

## Quick Demo

```bash
# Start the NANDA agent on your Jetson
cd ugv_jetson
pip install -r requirements.txt
python app.py &

# Start the A2A wrapper
cd ../ugv-nanda-agent
bun run start
```

Now any agent on the network can:

```typescript
// Discover the robot
const agent = await nanda.discover('ugv-robot');

// Command it
await agent.call('move_robot', { leftSpeed: 50, rightSpeed: 50 });
await sleep(2000);
await agent.call('stop_robot');

// Get visual
const { image } = await agent.call('capture_image');
```

## Example: Paid Patrol Service

```typescript
// Robot advertises patrol skill at $0.10 per run
{
  name: 'patrol',
  description: 'Patrol waypoints and report anomalies',
  price: { amount: '0.10', currency: 'USD', protocol: 'x402' }
}

// Client pays and gets patrol report
const invoice = await agent.call('patrol', { 
  waypoints: [[0,0], [10,0], [10,10], [0,10]],
  captureImages: true 
});

// Pay via X402
await x402.pay(invoice.paymentRequest);

// Receive results
const report = await agent.getResult(invoice.taskId);
// { images: [...], anomalies: [], duration: '4m32s' }
```

## The Vision

Every robot is an agent. Every agent has skills. Skills have prices. Payments flow automatically.

```
Human: "I need the warehouse inspected"
   ↓
Coordinator Agent: breaks into tasks
   ↓
Robot 1: patrol aisles 1-5 ($0.50)
Robot 2: patrol aisles 6-10 ($0.50)
Drone: aerial overview ($0.25)
   ↓
Vision Agent: analyze all images ($0.10)
   ↓
Human: receives report, pays $1.35 total
```

## Links

- [NANDA Protocol](https://github.com/nanda-ai/nanda)
- [X402 Payments](https://x402.org)
- [QUSD Agent Economy](https://qusd.ai)
- [Waveshare UGV](https://www.waveshare.com/wiki/UGV_Rover)

---

*Built for the agent economy. Robots that work, earn, and coordinate.*

🦾🤖💰
