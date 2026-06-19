import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { respData, respErr } from '@/lib/resp';
import { envConfigs } from '@/config';
import { callClaudeAPI, buildPrompt } from '@/lib/trading/claude-api';
import type { TradeCardInput, TradeReport } from '@/lib/trading/types';

// Server function to generate report using Claude API
const generateReportFn = createServerFn()
  .validator((data: TradeCardInput) => data)
  .handler(async ({ data }) => {
    const apiKey = envConfigs.anthropic_api_key;

    if (!apiKey) {
      return respErr('ANTHROPIC_API_KEY not configured');
    }

    try {
      const messages = buildPrompt(data);
      const baseURL = envConfigs.anthropic_base_url || 'https://api.anthropic.com';
      const response = await callClaudeAPI(messages, apiKey, 'claude-3-5-sonnet-20241022', baseURL);

      // Parse JSON response
      let parsedResponse;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : response;
        parsedResponse = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse Claude response:', response);
        return respErr('Failed to parse AI response');
      }

      // Validate response structure
      if (!parsedResponse.summary || !parsedResponse.scores) {
        console.error('Invalid response structure:', parsedResponse);
        return respErr('Invalid AI response structure');
      }

      // Build full report
      const report: TradeReport = {
        id: crypto.randomUUID(),
        summary: parsedResponse.summary,
        emotionAnalysis: parsedResponse.emotionAnalysis || [],
        scores: {
          impulseRisk: parsedResponse.scores?.impulseRisk || 50,
          positionRisk: parsedResponse.scores?.positionRisk || 50,
          reasonQuality: parsedResponse.scores?.reasonQuality || 50,
        },
        risks: parsedResponse.risks || [],
        openQuestions: parsedResponse.openQuestions || [],
        disciplineSuggestion: parsedResponse.disciplineSuggestion || '',
        nextActions: parsedResponse.nextActions || [],
        disclaimer:
          '本报告仅用于投资纪律检查和自我复盘，不构成任何投资建议、买卖建议或收益承诺。所有投资决策应由用户独立判断并自行承担风险。',
        createdAt: new Date().toISOString(),
        input: data,
      };

      return respData(report);
    } catch (error) {
      console.error('Claude API error:', error);
      return respErr(error instanceof Error ? error.message : 'Failed to generate report');
    }
  });

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const result = await generateReportFn({ data: body });
    return result;
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Invalid request');
  }
}

export const Route = createFileRoute('/api/trading/generate-report')({
  server: {
    handlers: { POST },
  },
});
