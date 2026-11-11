const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const owner = 'Carolin724';
const repository = owner + '/ki-software-engineer';
const label = 'ready-for-implementation';
const worker = 'issue-codex';
const splitPaths = text => text.split('\0').filter(Boolean);
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function authorize(context, triggeringActor) {
  const p = context.payload;
  if (context.eventName !== 'issues' || p.action !== 'labeled' ||
      p.repository.full_name !== repository || p.label?.name !== label ||
      p.issue.pull_request || p.issue.user.login !== owner ||
      p.sender?.type !== 'User' || context.actor !== owner || triggeringActor !== owner) {
    throw new Error('Unauthorized implementation trigger');
  }
}

function branchName(number, title) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid issue number');
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60).replace(/-$/g, '') || 'issue';
  return 'feature/' + number + '-' + slug;
}

function allowedPath(file, number) {
  return /^[a-zA-Z0-9_./-]+$/.test(file) &&
    !file.split('/').some(part => !part || part === '..' || part.startsWith('.')) &&
    (/^src\/app\/(books|shared)\/.+\.(ts|html|css)$/.test(file) ||
      ['src/app/app.ts', 'src/app/app.html', 'src/app/app.css', 'src/app/app.routes.ts',
        'src/styles.css', 'tests/issue-' + number + '.spec.ts'].includes(file)) &&
    !/(^|\/)(security|auth|secrets?)([./-]|$)|\.config\./i.test(file);
}

function parseResult(raw) {
  if (Buffer.byteLength(raw ?? '', 'utf8') > 10000) throw new Error('Codex result too large');
  let result;
  try { result = JSON.parse(raw); } catch { throw new Error('Codex did not return valid status JSON'); }
  if (!result || Object.keys(result).sort().join(',') !== 'status,summary' ||
      !['implemented', 'blocked'].includes(result.status) ||
      typeof result.summary !== 'string' || !result.summary.trim() || result.summary.length > 2000) {
    throw new Error('Invalid Codex implementation status');
  }
  return result;
}

function assertReport(report, testFile) {
  const specs = [];
  const visit = suite => {
    specs.push(...(suite.specs ?? []));
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  const acceptance = specs.filter(s => s.file === testFile || s.file === 'tests/' + testFile);
  const stats = report.stats;
  if (!stats || stats.expected < 1 || stats.skipped || stats.unexpected || stats.flaky ||
      report.errors?.length || !acceptance.length || acceptance.some(s => !s.ok ||
        !s.tests?.length || s.tests.some(t => t.expectedStatus !== 'passed' ||
          !t.results?.length || t.results.at(-1).status !== 'passed'))) {
    throw new Error('Acceptance tests must actually pass, without skips, flaky or expected failures');
  }
  return stats.expected;
}

function checkChanges(git, state, stat = file => fs.lstatSync(file)) {
  if (git(['rev-parse', 'HEAD']).trim() !== state.base ||
      git(['branch', '--show-current']).trim() !== state.branch ||
      !/^feature\/[1-9][0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.branch)) {
    throw new Error('The prepared branch or base was changed');
  }
  const files = [...new Set([
    ...splitPaths(git(['diff', '--name-only', '--no-renames', '-z', state.base, '--'])),
    ...splitPaths(git(['ls-files', '--others', '--exclude-standard', '-z']))
  ])];
  const testPath = 'tests/issue-' + state.number + '.spec.ts';
  if (!files.length || !files.includes(testPath) || !files.some(f => f.startsWith('src/'))) {
    throw new Error('A production change and an issue-specific acceptance test are required');
  }
  if (files.length > 100 || files.some(f => !allowedPath(f, state.number))) {
    throw new Error('Changes include a protected path or exceed 100 files');
  }
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++) {
      try {
        if (stat(parts.slice(0, i).join('/')).isSymbolicLink()) {
          throw new Error('Symlinks are forbidden');
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  try {
    if (!stat(testPath).isFile()) throw new Error('Acceptance test is not a regular file');
  } catch { throw new Error('The required acceptance test is missing or unsafe'); }
  // Stage real files, including new files; no model-generated diff is parsed or applied.
  git(['add', '--', ...files]);
  for (const record of splitPaths(git(['diff', '--cached', '--numstat', '--no-renames', '-z', state.base, '--']))) {
    if (!/^\d+\t\d+\t/.test(record)) throw new Error('Binary changes are forbidden');
  }
  for (const entry of splitPaths(git(['ls-files', '--stage', '-z', '--', ...files]))) {
    if (!/^100644 [a-f0-9]+ 0\t/.test(entry)) throw new Error('Unsafe file mode');
  }
  git(['diff', '--cached', '--check']);
  const tree = git(['write-tree']).trim();
  if (!/^[a-f0-9]{40}$/.test(tree)) throw new Error('Invalid candidate tree');
  return { files, tree };
}

function makeGit() {
  return (args, extraEnv = {}) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], {
      encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, env: { ...process.env, ...extraEnv }
    });
    // Never echo arguments, stderr or environment from authenticated Git commands.
    if (result.status !== 0) throw new Error('Git ' + args[0] + ' failed (exit ' + result.status + ')');
    return result.stdout;
  };
}

function runtime(api) {
  const statePath = path.join(process.env.RUNNER_TEMP, 'issue-implementation-state.json');
  const git = makeGit();
  const save = state => fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  const load = () => JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const params = { ...api.context.repo, issue_number: api.context.payload.issue.number };
  async function currentIssue() {
    authorize(api.context, process.env.GITHUB_TRIGGERING_ACTOR);
    const { data: issue } = await api.github.rest.issues.get(params);
    if (issue.pull_request || issue.user.login !== owner || issue.state !== 'open' ||
        !issue.labels.some(l => l.name === label)) throw new Error('Issue is no longer eligible');
    const comments = (await api.github.paginate(api.github.rest.issues.listComments,
      { ...params, per_page: 100 })).filter(c => c.user?.type === 'User');
    const snapshot = JSON.stringify({ title: issue.title, body: issue.body,
      comments: comments.map(c => ({ id: c.id, updated_at: c.updated_at, body: c.body })) });
    if (Buffer.byteLength(snapshot, 'utf8') > 100000) throw new Error('Issue discussion exceeds 100000 bytes');
    return { issue, comments, digest: digest(snapshot) };
  }
  async function existingWork(number) {
    const prefix = 'feature/' + number + '-';
    const prs = await api.github.paginate(api.github.rest.pulls.list,
      { ...api.context.repo, state: 'all', per_page: 100 });
    const pr = prs.find(p => p.head.repo?.full_name === repository &&
      (p.head.ref.startsWith(prefix) || p.body?.includes('<!-- codex-implementation:' + number + ' -->')));
    if (pr) return 'Existing PR preserved: ' + pr.html_url;
    const { data: refs } = await api.github.rest.git.listMatchingRefs({ ...api.context.repo, ref: 'heads/' + prefix });
    return refs.length ? 'Existing feature branch preserved. Inspect it before retrying; no branch will be overwritten.' : null;
  }
  return { git, save, load, currentIssue, existingWork };
}

async function prepare(api) {
  api.core.setOutput('proceed', 'false');
  const r = runtime(api);
  const { issue, comments, digest: issueDigest } = await r.currentIssue();
  if (api.context.payload.repository.default_branch !== 'main') throw new Error('Expected main as default branch');
  const existing = await r.existingWork(issue.number);
  if (existing) {
    api.core.notice(existing);
    await api.core.summary.addRaw(existing).write();
    return;
  }
  const base = r.git(['rev-parse', 'HEAD']).trim();
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid checkout base');
  const branch = branchName(issue.number, issue.title);
  r.git(['check-ref-format', '--branch', branch]);
  r.git(['switch', '-c', branch]);
  r.save({ number: issue.number, branch, base, digest: issueDigest });
  const clean = text => String(text ?? '').replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '');
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'implementation-issue.json'), JSON.stringify({
    trust: 'UNTRUSTED ISSUE DATA', number: issue.number, title: clean(issue.title), body: clean(issue.body),
    comments: comments.map(c => ({ id: c.id, body: clean(c.body) }))
  }), { mode: 0o600 });
  // An explicit readable schema avoids runner writes into the action's
  // worker-owned mktemp directory when using unprivileged-user + inline schema.
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'implementation-result.schema.json'), JSON.stringify({
    type: 'object', additionalProperties: false, required: ['status', 'summary'],
    properties: { status: { type: 'string', enum: ['implemented', 'blocked'] },
      summary: { type: 'string', minLength: 1, maxLength: 2000 } }
  }), { mode: 0o600 });
  api.core.setOutput('branch', branch);
  api.core.setOutput('proceed', 'true');
}

async function validate(api) {
  const result = parseResult(process.env.CODEX_RESULT);
  if (result.status !== 'implemented') {
    // Toolkit escapes annotation characters; no untrusted text becomes shell or script code.
    api.core.error('Codex blocked: ' + result.summary);
    throw new Error('Codex reported blocked; no commit, push or PR');
  }
  const r = runtime(api), state = r.load();
  state.tree = checkChanges(r.git, state).tree;
  r.save(state);
  api.core.info('Validated the real working tree and staged all allowed changes.');
}

async function acceptance(api) {
  const state = runtime(api).load();
  const test = 'issue-' + state.number + '.spec.ts';
  const files = fs.readdirSync('tests').filter(f => f === test || /^(book-[a-z0-9-]+|issue-[0-9]+)\.spec\.ts$/.test(f));
  if (!files.includes(test)) throw new Error('Required issue acceptance test is missing');
  const result = spawnSync('sudo', ['-H', '-u', worker, '--', 'env', '-i',
    'HOME=/home/' + worker, 'PATH=' + process.env.PROJECT_NODE_BIN + ':/usr/bin:/bin', 'CI=true',
    'PLAYWRIGHT_BROWSERS_PATH=' + process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.PROJECT_NODE_BIN + '/node', path.resolve('node_modules/@playwright/test/cli.js'),
    'test', ...files.map(f => 'tests/' + f), '--project=chromium', '--reporter=json', '--forbid-only',
    '--output=/home/' + worker + '/test-results'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error('Playwright did not produce a valid JSON report'); }
  for (const error of report.errors ?? []) api.core.error(error.message ?? 'Playwright error');
  const logFailures = suite => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      for (const run of test.results ?? []) for (const error of run.errors ?? []) {
        api.core.error(error.message ?? 'Acceptance assertion failed');
      }
    }
    for (const child of suite.suites ?? []) logFailures(child);
  };
  for (const suite of report.suites ?? []) logFailures(suite);
  if (result.status !== 0) throw new Error('Playwright failed (exit ' + result.status + ')');
  const count = assertReport(report, test);
  api.core.info('Verified ' + count + ' passing Chromium tests, including issue acceptance.');
}

async function publish(api) {
  const r = runtime(api), state = r.load();
  if (checkChanges(r.git, state).tree !== state.tree) throw new Error('Files changed after validation; no publication');
  const current = await r.currentIssue();
  if (current.issue.number !== state.number || current.digest !== state.digest) throw new Error('Requirements changed; retry against the new issue context');
  const existing = await r.existingWork(state.number);
  if (existing) throw new Error(existing);
  const { data: base } = await api.github.rest.git.getRef({ ...api.context.repo, ref: 'heads/main' });
  if (base.object.sha !== state.base) throw new Error('main advanced during implementation; retry on the new base');
  r.git(['-c', 'user.name=github-actions[bot]',
    '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    '-c', 'commit.gpgsign=false', 'commit', '-m', 'feat(books): implement issue #' + state.number]);
  const header = Buffer.from('x-access-token:' + process.env.GH_TOKEN).toString('base64');
  api.core.setSecret(header);
  // Empty expected SHA means CREATE ONLY, even if another actor races the API check.
  // This lease never permits updating an existing feature branch or main.
  r.git(['push', '--force-with-lease=refs/heads/' + state.branch + ':',
    'https://github.com/' + repository + '.git', 'HEAD:refs/heads/' + state.branch], {
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: 'AUTHORIZATION: basic ' + header, GIT_TERMINAL_PROMPT: '0'
  });
  try {
    const { data: pr } = await api.github.rest.pulls.create({ ...api.context.repo,
      head: state.branch, base: 'main', title: 'feat(books): implement issue #' + state.number,
      body: ['<!-- codex-implementation:' + state.number + ' -->', 'Closes #' + state.number, '',
        'Implemented directly in the feature branch with OpenAI Codex.', '',
        'Validation completed before publication:', '- Allowed text paths and file modes checked.',
        '- Production build passed (`npm run build`).',
        '- Chromium issue acceptance tests and existing BookMonkey regressions passed without skips.', '',
        'Human review required; no automatic merge.'].join('\n') });
    api.core.notice('Created pull request: ' + pr.html_url);
    await api.core.summary.addLink('Implementation pull request', pr.html_url).write();
  } catch (error) {
    api.core.error('Feature branch was pushed, but PR creation failed. Preserve the branch and create the PR manually: ' + state.branch);
    throw new Error('PR creation failed (HTTP ' + (error.status ?? 'unknown') + '); no success reported');
  }
}

module.exports = { authorize, branchName, allowedPath, parseResult, assertReport, checkChanges,
  prepare, validate, acceptance, publish };
