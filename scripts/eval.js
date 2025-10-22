#!/usr/bin/env node

import 'dotenv/config';
import { searchMemory } from '../backend/src/tools/search_memory.js';
import { getFacts } from '../backend/src/tools/get_facts.js';
import { ask } from '../backend/src/lib/orchestrator.js';

// Test cases for evaluation
const TEST_CASES = [
  {
    name: 'PomodoroFlow launch date',
    question: "When is the Product Hunt launch for PomodoroFlow?",
    project: 'pomodoroflow',
    expected_keywords: ['product hunt', 'launch', 'october', '2025'],
    min_citations: 2,
  },
  {
    name: 'Video script length decision',
    question: "How long should the Product Hunt video be?",
    project: 'pomodoroflow',
    expected_keywords: ['30 seconds', 'video', 'script'],
    min_citations: 1,
  },
  {
    name: 'ShainAI architecture',
    question: "What stack is ShainAI built with?",
    project: 'shainai',
    expected_keywords: ['next.js', 'postgres', 'pgvector', 'express'],
    min_citations: 2,
  },
  {
    name: 'App store badge sizing',
    question: "What's the formula for matching App Store and Google Play badge sizes?",
    project: 'pomodoroflow',
    expected_keywords: ['1.37', 'google play', 'app store'],
    min_citations: 1,
  },
];

// Evaluation metrics
function evaluateResponse(testCase, response) {
  const { answer, citations } = response;
  const answerLower = answer.toLowerCase();

  const results = {
    test: testCase.name,
    passed: true,
    issues: [],
    score: 0,
    max_score: 100,
  };

  // Check: Has answer
  if (!answer || answer.length === 0) {
    results.passed = false;
    results.issues.push('No answer generated');
    return results;
  }
  results.score += 20;

  // Check: Minimum citations
  if (citations.length < testCase.min_citations) {
    results.passed = false;
    results.issues.push(`Expected ${testCase.min_citations} citations, got ${citations.length}`);
  } else {
    results.score += 30;
  }

  // Check: Contains expected keywords
  let keywordsFound = 0;
  const missingKeywords = [];
  for (const keyword of testCase.expected_keywords) {
    if (answerLower.includes(keyword.toLowerCase())) {
      keywordsFound++;
    } else {
      missingKeywords.push(keyword);
    }
  }

  const keywordScore = (keywordsFound / testCase.expected_keywords.length) * 30;
  results.score += keywordScore;

  if (missingKeywords.length > 0) {
    results.issues.push(`Missing keywords: ${missingKeywords.join(', ')}`);
  }

  // Check: Citations have valid URIs
  const invalidCitations = citations.filter(c => !c.uri || c.uri.length === 0);
  if (invalidCitations.length > 0) {
    results.issues.push(`${invalidCitations.length} citations missing URIs`);
  } else {
    results.score += 20;
  }

  // Overall pass/fail
  results.passed = results.score >= 70 && results.issues.length === 0;

  return results;
}

async function runEval() {
  console.log('🧪 ShainAI Eval Harness\n');
  console.log('Running test cases...\n');

  const allResults = [];
  let totalScore = 0;
  let passedTests = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Question: "${testCase.question}"`);

    try {
      const startTime = Date.now();
      const response = await ask({
        message: testCase.question,
        project: testCase.project,
      });
      const latency = Date.now() - startTime;

      const evaluation = evaluateResponse(testCase, response);
      evaluation.latency_ms = latency;

      console.log(`   ⏱  Latency: ${latency}ms`);
      console.log(`   📊 Score: ${evaluation.score}/${evaluation.max_score}`);
      console.log(`   ${evaluation.passed ? '✅' : '❌'} ${evaluation.passed ? 'PASSED' : 'FAILED'}`);

      if (evaluation.issues.length > 0) {
        console.log(`   ⚠️  Issues:`);
        evaluation.issues.forEach(issue => console.log(`      - ${issue}`));
      }

      console.log(`   📚 Citations: ${response.citations.length}`);
      response.citations.forEach((c, i) => {
        console.log(`      ${i + 1}. ${c.title} (${c.similarity})`);
      });

      allResults.push(evaluation);
      totalScore += evaluation.score;
      if (evaluation.passed) passedTests++;

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      allResults.push({
        test: testCase.name,
        passed: false,
        issues: [error.message],
        score: 0,
        max_score: 100,
      });
    }
  }

  // Summary
  console.log('\n\n📊 Summary');
  console.log('─'.repeat(50));
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${passedTests}/${TEST_CASES.length} (${Math.round(passedTests / TEST_CASES.length * 100)}%)`);
  console.log(`Average score: ${Math.round(totalScore / TEST_CASES.length)}/100`);

  const avgLatency = allResults.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / allResults.length;
  console.log(`Average latency: ${Math.round(avgLatency)}ms`);

  // Recommendations
  console.log('\n💡 Recommendations');
  if (totalScore / TEST_CASES.length < 70) {
    console.log('  ⚠️  Overall score is below 70. Consider:');
    console.log('     • Improving system prompts');
    console.log('     • Ingesting more relevant content');
    console.log('     • Tuning retrieval parameters (top_k, similarity threshold)');
  } else {
    console.log('  ✅ Quality is good! System is ready for use.');
  }

  if (avgLatency > 5000) {
    console.log('  ⚠️  Average latency is high. Consider:');
    console.log('     • Caching frequent queries');
    console.log('     • Using smaller embedding model');
    console.log('     • Optimizing database indexes');
  }

  process.exit(passedTests === TEST_CASES.length ? 0 : 1);
}

runEval().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
