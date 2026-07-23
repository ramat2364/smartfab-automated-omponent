import prisma from '../db';
import { config } from '../config';

export class AiService {
  /**
   * General helper to query Anthropic Claude or fallback to heuristic generation
   */
  private static async callClaude(prompt: string, systemPrompt: string, serviceName: string, mockResponseGenerator: () => string): Promise<string> {
    const startTime = Date.now();
    let responseText = '';
    let tokensUsed = 0;

    if (config.anthropicApiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          responseText = data.content[0].text;
          tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
        } else {
          console.error('Claude API returned error status:', response.status);
          responseText = mockResponseGenerator();
        }
      } catch (err) {
        console.error('Failed to contact Claude API. Using high-fidelity local fallback.', err);
        responseText = mockResponseGenerator();
      }
    } else {
      // Direct local fallback simulation
      responseText = mockResponseGenerator();
      tokensUsed = Math.floor(prompt.length / 4) + Math.floor(responseText.length / 4);
    }

    // Log the AI call in the database
    await prisma.aiCallLog.create({
      data: {
        serviceName,
        prompt: `System: ${systemPrompt}\n\nUser: ${prompt}`,
        response: responseText,
        tokensUsed
      }
    });

    return responseText;
  }

  /**
   * Generates predictive maintenance recommendations for a machine
   */
  static async generatePredictiveMaintenance(machineCode: string, type: string, currentReadings: any, activeAlerts: any[]): Promise<string> {
    const systemPrompt = "You are a professional industrial reliability engineer at SmartFab Automated Components. Provide precise, actionable predictive maintenance suggestions.";
    const prompt = `Machine Code: ${machineCode}
Machine Type: ${type}
Current Readings: Temp=${currentReadings.temperature}°C, Vibration=${currentReadings.vibration}mm/s, RPM=${currentReadings.rpm}
Active Alerts: ${JSON.stringify(activeAlerts)}

Suggest a predictive maintenance write-up. Focus on the failure mode, urgency, and specific technician tasks.`;

    const mockGenerator = () => {
      const isCritical = currentReadings.vibration > 4.0 || currentReadings.temperature > 80;
      const severity = isCritical ? 'CRITICAL' : 'WARNING';
      const timeFrame = isCritical ? '24 hours' : '7 days';
      const failureMode = type === 'CNC' 
        ? 'Spindle motor coupling failure or bearing fatigue' 
        : type === 'Press' 
        ? 'Hydraulic manifold gasket rupture or oil overheating'
        : 'Drive motor shaft misalignment';

      return `AI Predictive Analysis [HEURISTIC MODE]:
Severity: ${severity}
Failure Mode: ${failureMode}
Urgency: Rectify within next ${timeFrame}.

Recommended Actions:
1. Schedule a line maintenance window for inspection of the primary drivetrain.
2. Check lubrication parameters and verify thermocouple sensor calibration.
3. Clean thermal exchange ducts and test voltage current profiles under load.
4. If noise persists, perform manual bearing play test and replace the main housing gasket.`;
    };

    return this.callClaude(prompt, systemPrompt, 'PredictiveMaintenance', mockGenerator);
  }

  /**
   * Generates weekly executive summary of cross-plant operations
   */
  static async generateExecutiveSummary(metrics: {
    pune: { oee: number; downtime: number; defects: number; energyCost: number };
    nashik: { oee: number; downtime: number; defects: number; energyCost: number };
    chennai: { oee: number; downtime: number; defects: number; energyCost: number };
    recentDefects: any[];
    activeAlerts: any[];
  }): Promise<string> {
    const systemPrompt = "You are the Chief Technology Officer (CTO) reporting to the CEO of SmartFab Automated Components. Write a highly analytical, brief, operational executive summary.";
    const prompt = `Plant Metrics:
- Pune: OEE=${metrics.pune.oee}%, Downtime=${metrics.pune.downtime}h, Defects=${metrics.pune.defects} units, Energy Cost=₹${metrics.pune.energyCost}
- Nashik: OEE=${metrics.nashik.oee}%, Downtime=${metrics.nashik.downtime}h, Defects=${metrics.nashik.defects} units, Energy Cost=₹${metrics.nashik.energyCost}
- Chennai: OEE=${metrics.chennai.oee}%, Downtime=${metrics.chennai.downtime}h, Defects=${metrics.chennai.defects} units, Energy Cost=₹${metrics.chennai.energyCost}

Recent Defects: ${JSON.stringify(metrics.recentDefects.slice(0, 5))}
Active Alerts: ${JSON.stringify(metrics.activeAlerts.slice(0, 5))}

Write an executive summary highlighting which plant requires focus, operational achievements, active risk mitigations, and cost optimization opportunities.`;

    const mockGenerator = () => {
      // Find lowest OEE plant
      const plantList = [
        { name: 'Pune', oee: metrics.pune.oee, downtime: metrics.pune.downtime, defects: metrics.pune.defects },
        { name: 'Nashik', oee: metrics.nashik.oee, downtime: metrics.nashik.downtime, defects: metrics.nashik.defects },
        { name: 'Chennai', oee: metrics.chennai.oee, downtime: metrics.chennai.downtime, defects: metrics.chennai.defects }
      ];
      plantList.sort((a, b) => a.oee - b.oee);
      const lowestOeePlant = plantList[0];

      return `## Executive Operational Summary — SmartFab Automated Components

### 1. Primary Operational Focus: ${lowestOeePlant.name} Plant
The **${lowestOeePlant.name} Plant** exhibits the lowest performance index this period with an **OEE of ${lowestOeePlant.oee}%**, primarily due to accumulated downtime of **${lowestOeePlant.downtime} hours**. This warrants immediate intervention on line-level scheduling and preventive schedules.

### 2. Quality Audit & Defect Risk
Across all three plants, the quality logs registered a cumulative defect count. A notable concentration of defects resides in the **${metrics.recentDefects[0]?.partNumber || 'precision shaft'}** assembly line. The primary failure mode observed is **${metrics.recentDefects[0]?.defectType || 'Surface Scratch'}**, suggesting tool wear in CNC clamping modules.

### 3. Predictive Maintenance & Active Alerts
There are currently **${metrics.activeAlerts.length} active predictive alerts** across plants. Key risk:
- Critical vibration flags at CNC stations require spindle realignment to avert bearing failure.
- Manifold temperature warnings at Nashik indicate a need for cooling circuit flushing.

### 4. Energy Cost & Efficiency Initiatives
Overall energy costs are led by Pune (₹${metrics.pune.energyCost}), which aligns with its heavy CNC machining volume. Implementing peak-load shaving and staggered motor start-up protocols could yield a projected **4-6% savings in peak grid tariffs**.

*Report generated automatically by SmartFab Digital Platform AI Assistant.*`;
    };

    return this.callClaude(prompt, systemPrompt, 'ExecutiveSummary', mockGenerator);
  }

  /**
   * Suggests quality root causes
   */
  static async suggestQualityRootCause(defectDescription: string, partNumber: string, machineCode?: string): Promise<string> {
    const systemPrompt = "You are a lead Quality Control Engineer at SmartFab Automated Components. Analyze the defect and suggest root causes and inspection checkpoints.";
    const prompt = `Defect Description: ${defectDescription}
Part Number: ${partNumber}
Machine: ${machineCode || 'N/A'}

Provide 3 likely root causes, suggest a root-cause category (Material Defect, Operator Error, Machine Calibration, Tool Wear, Design Flaw), and recommend 2 immediate corrective actions.`;

    const mockGenerator = () => {
      let suggestedCategory = 'Tool Wear';
      if (defectDescription.toLowerCase().includes('crack') || defectDescription.toLowerCase().includes('void') || defectDescription.toLowerCase().includes('bubble')) {
        suggestedCategory = 'Material Defect';
      } else if (defectDescription.toLowerCase().includes('human') || defectDescription.toLowerCase().includes('handling') || defectDescription.toLowerCase().includes('load')) {
        suggestedCategory = 'Operator Error';
      } else if (defectDescription.toLowerCase().includes('tolerance') || defectDescription.toLowerCase().includes('mm') || defectDescription.toLowerCase().includes('align')) {
        suggestedCategory = 'Machine Calibration';
      }

      return `AI Root-Cause Suggestion:
Category: ${suggestedCategory}

Likely Root Causes:
1. Tooling wear on finishing inserts causing high cutting forces and surface marks.
2. Minor casting imperfections in raw material billets leading to structural weakness.
3. Chuck pressure calibration offset, resulting in slight slippage during milling.

Corrective Actions:
1. Perform CNC spindle runout calibration and inspect insert tips for chipping.
2. Isolate current batch of raw castings and verify hardness ratings in metallurgical lab.`;
    };

    return this.callClaude(prompt, systemPrompt, 'RootCauseAnalysis', mockGenerator);
  }
}
