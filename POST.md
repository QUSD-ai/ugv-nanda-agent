# Show HN: UGV Jetson — AI + Blockchain + Robotics converged

We turned a $300 Waveshare robot + Jetson Nano into an autonomous economic agent.

**What it does:**
- 🧠 LLM brain (Claude/local Ollama) for planning
- 🦾 Physical skills: drive, look, sense, grab
- 🔗 NANDA protocol: other agents can discover & command it
- 💰 X402 payments: robot charges for services

**The idea:** Robots shouldn't just be remote-controlled toys. They should be *agents* — discoverable services that think, act, and earn.

**Example flow:**
```
Vision Agent: "I see something weird in sector 4"
    → Patrol Robot: drives there, takes photo
    → Vision Agent: "It's a spill, alerting maintenance"
    → Maintenance gets notified
```

All autonomous. No human in the loop.

**Paid services:**
- `patrol`: $0.10/run
- `capture_image`: $0.001/shot  
- `deliver`: $2.00/drop

Robot earns while it works. Autonomous income.

**Stack:**
- Waveshare UGV Beast / WAVE ROVER
- Jetson Orin Nano (on-device AI)
- NANDA (A2A protocol for agents)
- X402/QUSD (crypto micropayments)

**Code:** github.com/QUSD-ai/ugv-nanda-agent

We're building an agent economy where physical robots are first-class participants. This is the hardware node.

Feedback welcome. What would you build with a robot-as-a-service?

---

🦾 + 🤖 + 💰 = ?
