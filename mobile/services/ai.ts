import { supabase } from './supabase';
import { HealthRecord } from './database';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY || 'xai-jB5SjI1cY2aEYlyrIKJG8EtbEr8PvjsweOBjVnvZkyN5dFln7hcrJcCACnpykeyWr2jf5F9QZAITfHoq'; // Replace with actual API key

export interface AIAnalysis {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  follow_up_needed: boolean;
  confidence_score: number;
  analysis_summary: string;
}

export const analyzeHealthData = async (symptoms: string[], vitalSigns?: any, notes?: string): Promise<AIAnalysis> => {
  try {
    const prompt = `
You are a medical AI assistant analyzing health data from rural field workers. Provide a structured analysis.

Patient Data:
- Symptoms: ${symptoms.join(', ')}
- Vital Signs: ${vitalSigns ? JSON.stringify(vitalSigns) : 'Not provided'}
- Additional Notes: ${notes || 'None'}

Please analyze this data and respond with a JSON object containing:
1. risk_level: "low", "medium", "high", or "critical"
2. recommendations: Array of specific actionable recommendations
3. follow_up_needed: Boolean indicating if immediate medical attention is required
4. confidence_score: Number between 0-1 indicating confidence in analysis
5. analysis_summary: Brief summary of the health assessment

Focus on:
- Common rural health issues
- Preventive care recommendations
- When to seek immediate medical attention
- Cultural sensitivity for rural communities

Respond only with valid JSON.
`;

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant specializing in rural healthcare analysis. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-beta',
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from Grok API');
    }

    // Parse the JSON response
    const analysis: AIAnalysis = JSON.parse(aiResponse);
    
    // Validate the response structure
    if (!analysis.risk_level || !analysis.recommendations || typeof analysis.follow_up_needed !== 'boolean') {
      throw new Error('Invalid AI response structure');
    }

    return analysis;

  } catch (error) {
    console.error('AI analysis failed:', error);
    
    // Fallback analysis based on symptoms
    return generateFallbackAnalysis(symptoms, vitalSigns, notes);
  }
};

const generateFallbackAnalysis = (symptoms: string[], vitalSigns?: any, notes?: string): AIAnalysis => {
  const criticalSymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'seizure'];
  const highRiskSymptoms = ['high fever', 'severe headache', 'vomiting', 'severe pain'];
  
  const hasCritical = symptoms.some(symptom => 
    criticalSymptoms.some(critical => symptom.toLowerCase().includes(critical))
  );
  
  const hasHighRisk = symptoms.some(symptom => 
    highRiskSymptoms.some(high => symptom.toLowerCase().includes(high))
  );

  let riskLevel: AIAnalysis['risk_level'] = 'low';
  let recommendations: string[] = ['Monitor symptoms', 'Ensure adequate rest and hydration'];
  let followUpNeeded = false;

  if (hasCritical) {
    riskLevel = 'critical';
    recommendations = ['Seek immediate medical attention', 'Call emergency services if available', 'Do not delay treatment'];
    followUpNeeded = true;
  } else if (hasHighRisk) {
    riskLevel = 'high';
    recommendations = ['Consult healthcare provider within 24 hours', 'Monitor symptoms closely', 'Seek immediate care if symptoms worsen'];
    followUpNeeded = true;
  } else if (symptoms.length > 3) {
    riskLevel = 'medium';
    recommendations = ['Schedule healthcare consultation', 'Monitor symptoms for changes', 'Maintain symptom diary'];
  }

  return {
    risk_level: riskLevel,
    recommendations,
    follow_up_needed: followUpNeeded,
    confidence_score: 0.6, // Lower confidence for fallback
    analysis_summary: `Automated analysis based on ${symptoms.length} reported symptoms. ${followUpNeeded ? 'Medical attention recommended.' : 'Continue monitoring.'}`
  };
};

export const processHealthRecord = async (healthRecord: HealthRecord): Promise<void> => {
  try {
    const analysis = await analyzeHealthData(
      healthRecord.symptoms,
      healthRecord.vital_signs,
      healthRecord.notes
    );

    // Store AI analysis in Supabase
    const { error } = await supabase
      .from('ai_analysis')
      .insert({
        health_record_id: healthRecord.id,
        risk_level: analysis.risk_level,
        recommendations: analysis.recommendations,
        follow_up_needed: analysis.follow_up_needed,
        confidence_score: analysis.confidence_score,
        analysis_summary: analysis.analysis_summary,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store AI analysis:', error);
      throw error;
    }

    console.log(`AI analysis completed for health record ${healthRecord.id}`);

  } catch (error) {
    console.error('Failed to process health record:', error);
    throw error;
  }
};