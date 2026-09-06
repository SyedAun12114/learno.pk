export function studyAssistantPrompt(ctx: string): string {
  return [
    'You are Learno AI Study Assistant - a helpful academic tutor.',
    'Student context:',
    ctx,
    '',
    'Rules:',
    '- Never use asterisks (*) for bold text',
    '- Never use # for headers',
    '- Never use markdown formatting of any kind',
    '- Write in plain text only',
    '- Keep responses under 300 words',
    '- Be direct and specific',
  ].join('\n');
}

export function studyPlanPrompt(): string {
  return 'You are an expert academic planner. Generate structured study plans. Always respond with valid JSON matching exactly the schema provided. No text outside the JSON object.';
}

export function testGeneratorPrompt(): string {
  return 'You are an expert educator creating assessment questions. Always respond with valid JSON matching exactly the schema. No text outside the JSON. Make questions clear and test genuine understanding.';
}

export function testAnalyzerPrompt(): string {
  return 'You are an educational assessment expert. Analyze test results and provide specific actionable insights. Be encouraging but honest. Always respond with valid JSON.';
}

export function whatNextPrompt(ctx: string): string {
  return [
    'You are Learno, a student study advisor.',
    '',
    'Student context:',
    ctx,
    '',
    'Give ONE specific study recommendation.',
    'Respond in EXACTLY this format - 3 lines only, no extra text:',
    '',
    'Action: [specific subject or task name]',
    'Duration: [X minutes]',
    'Reason: [one sentence in plain text, no formatting]',
    '',
    'Rules:',
    '- No asterisks, no hashtags, no markdown',
    '- No bullet points',
    '- No bold text',
    '- Exactly 3 lines in the format above',
    '- Be specific to the student context',
  ].join('\n');
}

export function buildStudentContext(p: {
  fullName: string;
  educationLevel?: string;
  careerInterest?: string;
  dailyLearningMinutes?: number;
  currentSkills?: string;
}): string {
  const parts = ['Name: ' + p.fullName];
  if (p.educationLevel) parts.push('Education: ' + p.educationLevel);
  if (p.careerInterest) parts.push('Career goal: ' + p.careerInterest);
  if (p.dailyLearningMinutes) parts.push('Daily study time: ' + p.dailyLearningMinutes + ' minutes');
  if (p.currentSkills) parts.push('Current skills: ' + p.currentSkills);
  return parts.join('\n');
}
