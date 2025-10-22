import 'dotenv/config';
import { Octokit } from 'octokit';
import { chunkText, batchInsertChunks } from './utils.js';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function ingestGitHubRepo(owner, repo, project) {
  console.log(`\nIngesting GitHub repo: ${owner}/${repo} → project: ${project}`);

  const chunks = [];

  try {
    // Get README
    console.log('\nFetching README...');
    const readme = await octokit.rest.repos.getReadme({ owner, repo });
    const readmeContent = Buffer.from(readme.data.content, 'base64').toString('utf-8');

    chunks.push({
      project,
      source: 'github',
      uri: `https://github.com/${owner}/${repo}/blob/main/README.md`,
      title: `${repo} - README`,
      content: readmeContent,
    });

    // Get docs folder (if exists)
    console.log('\nFetching docs...');
    try {
      const docsTree = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'docs',
      });

      for (const file of docsTree.data) {
        if (file.type === 'file' && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
          const content = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path,
          });

          const text = Buffer.from(content.data.content, 'base64').toString('utf-8');

          chunks.push({
            project,
            source: 'github',
            uri: `https://github.com/${owner}/${repo}/blob/main/${file.path}`,
            title: `${repo} - ${file.name}`,
            content: text,
          });
        }
      }
    } catch (e) {
      console.log('  No docs folder found');
    }

    // Get recent commits (last 20)
    console.log('\nFetching recent commits...');
    const commits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 20,
    });

    for (const commit of commits.data) {
      const message = commit.commit.message;
      const author = commit.commit.author.name;
      const date = commit.commit.author.date;

      chunks.push({
        project,
        source: 'github',
        uri: commit.html_url,
        title: `Commit: ${message.split('\n')[0]}`,
        content: `Commit by ${author} on ${date}\n\n${message}`,
      });
    }

    // Get open issues (last 10)
    console.log('\nFetching open issues...');
    try {
      const issues = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 10,
      });

      for (const issue of issues.data) {
        chunks.push({
          project,
          source: 'github',
          uri: issue.html_url,
          title: `Issue #${issue.number}: ${issue.title}`,
          content: `${issue.title}\n\n${issue.body || ''}`,
        });
      }
    } catch (e) {
      console.log('  No issues found or issues disabled');
    }

    // Insert all chunks
    console.log(`\n📦 Inserting ${chunks.length} chunks...`);
    const stats = await batchInsertChunks(chunks);

    console.log(`\n✅ Done!`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Total tokens: ${stats.tokens}`);

  } catch (error) {
    console.error('Error ingesting GitHub repo:', error.message);
  }
}

// Example usage
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node github.js <owner> <repo> <project>');
  console.log('Example: node github.js Surfrrosa pomodoroflow pomodoroflow');
  process.exit(1);
}

const [owner, repo, project] = args;
await ingestGitHubRepo(owner, repo, project);
process.exit(0);
