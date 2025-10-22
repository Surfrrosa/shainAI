# ShainAI Scripts

Utility scripts for database management and evaluation.

## migrate.sh

Run database migrations.

```bash
DATABASE_URL=<url> ./scripts/migrate.sh
```

Applies all SQL migrations in `backend/db/migrations/` in order.

## eval.js

Eval harness for testing retrieval quality.

```bash
cd backend && npm install
node ../scripts/eval.js
```

Runs predefined test cases and evaluates:
- Answer quality (keyword matching)
- Citation count and validity
- Response latency
- Overall system health

### Test Cases

The eval harness includes test cases for:
- PomodoroFlow Product Hunt launch date
- Video script length decision
- ShainAI architecture
- App store badge sizing formula

### Metrics

- **Score**: 0-100 per test (passing score: 70+)
- **Latency**: Response time in ms (target: <5s)
- **Citations**: Minimum count and URI validity

### Example Output

```
🧪 ShainAI Eval Harness

📝 Test: PomodoroFlow launch date
   Question: "When is the Product Hunt launch?"
   ⏱  Latency: 3200ms
   📊 Score: 85/100
   ✅ PASSED
   📚 Citations: 3
      1. PomodoroFlow README (0.892)
      2. Recent chat: PH prep (0.847)
      3. Product Hunt comment (0.821)

📊 Summary
──────────────────────────────────────────────────
Total tests: 4
Passed: 3/4 (75%)
Average score: 78/100
Average latency: 3500ms

💡 Recommendations
  ✅ Quality is good! System is ready for use.
```

### Adding Test Cases

Edit `scripts/eval.js` and add to `TEST_CASES`:

```js
{
  name: 'Your test name',
  question: "Your question?",
  project: 'pomodoroflow',
  expected_keywords: ['keyword1', 'keyword2'],
  min_citations: 2,
}
```

### CI/CD Integration

Run as part of CI to catch regressions:

```yaml
- name: Run eval harness
  run: node scripts/eval.js
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Exit code 0 = all tests passed, 1 = failures.
