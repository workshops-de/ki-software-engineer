const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workflow = require('./issue-implementation.cjs');

function readWorkflow() {
  const ast = require('prettier/plugins/yaml').parsers.yaml.parse(
    fs.readFileSync(path.join(__dirname, '../workflows/issue-implementation.yml'), 'utf8'));
  function convert(n) {
    if (n.type === 'mapping') {
      const entries = n.children.map(item => item.children.map(convert));
      assert.equal(new Set(entries.map(([key]) => key)).size, entries.length, 'Duplicate YAML key');
      return Object.fromEntries(entries);
    }
    if (['sequence', 'flowSequence'].includes(n.type)) return n.children.map(convert);
    if (['root', 'document'].includes(n.type)) {
      return n.children.map(convert).find(value => value && !Array.isArray(value));
    }
    if (n.children?.length === 1) return convert(n.children[0]);
    return n.value;
  }
  return convert(ast);
}

test('workflow structure keeps one gated job and supplies secrets only to the required steps', () => {
  const w = readWorkflow();
  assert.deepEqual(w.on.issues.types, ['labeled']);
  assert.deepEqual(Object.keys(w.jobs), ['implement']);
  assert(Object.values(w.permissions).every(p => p === 'read'));
  const steps = w.jobs.implement.steps;
  const checkout = steps.find(s => s.uses === 'actions/checkout@v4');
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['fetch-depth'], '0');
  assert.equal(checkout.with['persist-credentials'], 'false');
  const codex = steps.find(s => s.id === 'codex');
  assert.equal(codex.uses, 'openai/codex-action@v1');
  assert.equal(codex.with['permission-profile'], ':workspace');
  assert.equal(codex.with['safety-strategy'], 'unprivileged-user');
  assert.equal(codex.with['codex-user'], 'issue-codex');
  assert.equal(codex.with['codex-version'], '0.165.0');
  assert.equal(codex.with.sandbox, undefined);
  assert.equal(codex.with['output-schema-file'], '/home/issue-codex/result.schema.json');
  assert.equal(codex.with['output-schema'], undefined);
  const inputs = ['openai-api-key','codex-version','permission-profile','safety-strategy','codex-user',
    'allow-users','allow-bots','model','output-schema-file','prompt'];
  assert(Object.keys(codex.with).every(key => inputs.includes(key)), 'Unknown Codex action input');
  assert(!codex.with.prompt.includes('Unified Git Diff'));
  const last = steps.at(-1);
  assert.match(last.if, /success\(\)/);
  assert.match(last.if, /proceed == 'true'/);
  assert.match(last.env.GH_TOKEN, /secrets.PAT_TOKEN/);
  assert.equal(steps.filter(s=>JSON.stringify(s).includes('secrets.PAT_TOKEN')).length, 1);
  assert.equal(steps.filter(s=>JSON.stringify(s).includes('secrets.ANTHROPIC_API_KEY')).length, 1);
  assert.equal(steps.filter(s=>s.if?.startsWith('always()')).length, 2);
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  for (const step of steps) if (step.with?.script) new AsyncFunction(step.with.script);
});

const base = 'a'.repeat(40), tree = 'b'.repeat(40);
const state = { number: 1, base, branch: 'feature/1-favoriten', tree };
const context = () => ({
  eventName: 'issues', actor: 'Carolin724', repo: { owner: 'Carolin724', repo: 'ki-software-engineer' },
  payload: { action: 'labeled', label: { name: 'ready-for-implementation' }, sender: { type: 'User' },
    repository: { full_name: 'Carolin724/ki-software-engineer', default_branch: 'main' },
    issue: { number: 1, user: { login: 'Carolin724' } } }
});
const regular = { isFile: () => true, isSymbolicLink: () => false };

test('only the authorized issue label event is accepted', () => {
  workflow.authorize(context(), 'Carolin724');
  const mutations = [
    c => { c.actor = 'attacker'; }, c => { c.eventName = 'pull_request'; },
    c => { c.payload.issue.pull_request = {}; }, c => { c.payload.sender.type = 'Bot'; },
    c => { c.payload.issue.user.login = 'attacker'; }, c => { c.payload.label.name = 'Ready-for-implementation'; },
    c => { c.payload.repository.full_name = 'attacker/ki-software-engineer'; },
    c => { c.payload.action = 'opened'; }
  ];
  for (const mutate of mutations) {
    const c = context(); mutate(c);
    assert.throws(() => workflow.authorize(c, 'Carolin724'), /Unauthorized/);
  }
  assert.throws(() => workflow.authorize(context(), 'attacker'), /Unauthorized/);
});

test('branch names sanitize Unicode, shell metacharacters, empty and long titles', () => {
  assert.equal(workflow.branchName(1, 'Bücher & Favoriten'), 'feature/1-bucher-favoriten');
  assert.equal(workflow.branchName(1, '💥'), 'feature/1-issue');
  for (const title of ['$(curl attacker) `whoami` ; " /../', 'A'.repeat(300), '--test--']) {
    const branch = workflow.branchName(1, title);
    assert.match(branch, /^feature\/1-[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert(branch.length <= 'feature/1-'.length + 60);
  }
  for (const n of [0, -1, 1.5, '1', NaN]) assert.throws(() => workflow.branchName(n, 'test'));
});

test('the original production and issue-test allowlist is retained', () => {
  for (const f of ['src/app/books/favorites/service.ts', 'src/app/shared/toast.service.ts',
    'src/app/app.ts', 'src/app/app.html', 'src/app/app.css', 'src/app/app.routes.ts', 'src/styles.css',
    'tests/issue-1.spec.ts']) assert(workflow.allowedPath(f, 1), f);
  for (const f of ['src/index.html', 'src/app/app.config.ts', 'package.json', 'package-lock.json',
    '.github/workflows/issue-implementation.yml', '.git/config', 'tests/issue-2.spec.ts', 'tests/example.spec.ts',
    'src/app/books/../app.config.ts', 'src/app/books/.env.ts', 'src/app/books/auth.ts',
    'src/app/books/security/rules.ts', 'src/app/books/foo.config.ts', 'src/app/books/secret.ts',
    '/src/styles.css', 'src//styles.css', 'src/app/books/script.sh', 'src/app/books/a\tb.ts']) {
    assert.equal(workflow.allowedPath(f, 1), false, f);
  }
});

test('only small, complete implementation status JSON is accepted; no patch field', () => {
  for (const status of ['blocked', 'implemented']) assert.equal(workflow.parseResult(JSON.stringify({ status, summary: 'reason' })).status, status);
  for (const raw of ['', 'null', '[]', '{}', '{', JSON.stringify({status:'implemented',summary:'',patch:'diff'}),
    JSON.stringify({status:'success',summary:'reason'}), JSON.stringify({status:'implemented',summary:'x'.repeat(2001)})]) {
    assert.throws(() => workflow.parseResult(raw));
  }
});

function gitFixture(overrides = {}) {
  const calls = [];
  const responses = {
    'rev-parse': base + '\n', branch: state.branch + '\n',
    diff: 'src/app/app.ts\0', 'ls-files': 'tests/issue-1.spec.ts\0',
    numstat: '1\t0\tsrc/app/app.ts\0' + '4\t0\ttests/issue-1.spec.ts\0',
    stage: '100644 ' + base + ' 0\tsrc/app/app.ts\0' + '100644 ' + base + ' 0\ttests/issue-1.spec.ts\0',
    'write-tree': tree + '\n', ...overrides
  };
  const git = args => {
    calls.push(args);
    if (args[0] === 'diff' && args.includes('--numstat')) return responses.numstat;
    if (args[0] === 'diff' && args.includes('--check')) return '';
    if (args[0] === 'ls-files' && args.includes('--stage')) return responses.stage;
    if (args[0] === 'add') return '';
    return responses[args[0]] ?? '';
  };
  return { git, calls };
}

test('real files including untracked tests are staged without applying a patch', () => {
  const f = gitFixture();
  const result = workflow.checkChanges(f.git, state, () => regular);
  assert.deepEqual(result.files, ['src/app/app.ts', 'tests/issue-1.spec.ts']);
  assert.equal(result.tree, tree);
  assert(f.calls.some(args => args[0] === 'add' && args.includes('tests/issue-1.spec.ts')));
  assert(!f.calls.some(args => ['apply', 'commit', 'push'].includes(args[0])));
});

test('protected changes, missing tests, binary patches, executable modes and changed branches fail closed', () => {
  for (const overrides of [
    { diff: '.github/workflows/other.yml\0' }, { 'ls-files': '' },
    { numstat: '-\t-\tsrc/app/app.ts\0' }, { stage: '100755 ' + base + ' 0\tsrc/app/app.ts\0' },
    { stage: '120000 ' + base + ' 0\tsrc/app/app.ts\0' },
    { branch: 'main\n' }, { 'rev-parse': 'c'.repeat(40) }
  ]) assert.throws(() => workflow.checkChanges(gitFixture(overrides).git, state, () => regular));
  assert.throws(() => workflow.checkChanges(gitFixture().git, state,
    f => ({ ...regular, isSymbolicLink: () => f === 'src/app' })), /Symlinks/);
  assert.throws(() => workflow.checkChanges(gitFixture().git, state,
    f => ({ ...regular, isFile: () => !f.startsWith('tests/') })), /missing or unsafe/);
});

const passingReport = () => ({ stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 }, errors: [],
  suites: [{ suites: [{ specs: [{ file: 'issue-1.spec.ts', ok: true,
    tests: [{ expectedStatus: 'passed', results: [{ status: 'passed' }] }] }] }] }] });

test('acceptance requires actual passing issue tests, not skips, flaky or expected failures', () => {
  assert.equal(workflow.assertReport(passingReport(), 'issue-1.spec.ts'), 1);
  const mutations = [
    r => { r.stats.skipped = 1; }, r => { r.stats.flaky = 1; }, r => { r.stats.unexpected = 1; },
    r => { r.stats.expected = 0; }, r => { r.errors.push({message:'error'}); },
    r => { r.suites[0].suites[0].specs[0].file = 'example.spec.ts'; },
    r => { r.suites[0].suites[0].specs[0].tests[0].expectedStatus = 'failed'; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].status = 'skipped'; }
  ];
  for (const mutate of mutations) {
    const r = passingReport(); mutate(r);
    assert.throws(() => workflow.assertReport(r, 'issue-1.spec.ts'));
  }
});

// Run the publication code with a fake filesystem, Git process and GitHub API.
// No test creates a commit, pushes a branch or calls the network.
function publicationFixture(options = {}) {
  const calls = [], virtual = {};
  const issue = { number: 1, title: 'Favoriten', body: 'AK1', state: 'open',
    user: { login: 'Carolin724' }, labels: [{name:'ready-for-implementation'}] };
  const snapshot = JSON.stringify({title:issue.title, body:issue.body, comments:[]});
  const saved = { ...state, digest: require('node:crypto').createHash('sha256').update(snapshot).digest('hex'), ...options.state };
  const f = gitFixture(options.git);
  const fakeFs = { lstatSync: () => regular, readFileSync: () => JSON.stringify(saved),
    writeFileSync: (p, data) => { virtual[p] = data; } };
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'issue-implementation.cjs'),'utf8'), {
    module, Buffer,
    process: {env:{ RUNNER_TEMP:'/trusted', GITHUB_TRIGGERING_ACTOR:'Carolin724', GH_TOKEN:'test-token', ...options.env }},
    require: name => name === 'node:fs' ? fakeFs : name === 'node:child_process' ? {
      spawnSync: (command,args,opts) => {
        assert.equal(command,'git');
        // Strip the two trusted -c overrides added by makeGit.
        const operation=args.slice(4); calls.push({operation,env:opts.env});
        if (operation[0] === 'push' && options.pushFailure) return {status:1,stderr:'secret must not be logged'};
        return {status:0,stdout:f.git(operation)};
      }
    } : require(name)
  });
  const summaries=[], outputs={};
  const api = { context:context(), core:{setSecret:()=>{}, notice:()=>{}, error:()=>{}, info:()=>{},
    setOutput:(key,value)=>{outputs[key]=value;},
    summary:{addLink:(...v)=>{summaries.push(v);return {write:async()=>{}};},
      addRaw:value=>({write:async()=>{summaries.push(value);}})}},
    github:{paginate:async endpoint => endpoint==='pulls' ? (options.prs ?? []) : [],
      rest:{issues:{get:async()=>({data:issue}),listComments:'comments'},
        pulls:{list:'pulls',create:async p=>{if(options.prFailure)throw {status:403};api.created=p;return {data:{html_url:'https://github.com/test/pull/1'}};}},
        git:{listMatchingRefs:async()=>({data:options.refs ?? []}),getRef:async()=>({data:{object:{sha:options.main ?? base}}})}}}};
  return {subject:module.exports,api,calls,summaries,outputs,virtual};
}

test('preparation creates only a local branch and writes issue data and a small readable schema', async () => {
  const f=publicationFixture(); await f.subject.prepare(f.api);
  assert.equal(f.outputs.proceed,'true'); assert.equal(f.outputs.branch,state.branch);
  assert(f.calls.some(c=>c.operation[0]==='switch' && c.operation[1]==='-c'));
  assert(!f.calls.some(c=>c.operation.includes('commit') || c.operation[0]==='push'));
  const schema=JSON.parse(Object.entries(f.virtual).find(([key])=>key.endsWith('implementation-result.schema.json'))[1]);
  assert.deepEqual(schema.required,['status','summary']);
  const issue=JSON.parse(Object.entries(f.virtual).find(([key])=>key.endsWith('implementation-issue.json'))[1]);
  assert.equal(issue.trust,'UNTRUSTED ISSUE DATA');
});

test('a repeated label event preserves existing branches and PRs before running Codex', async () => {
  for(const options of [{refs:[{ref:'existing'}]},
    {prs:[{head:{repo:{full_name:'Carolin724/ki-software-engineer'},ref:state.branch},html_url:'existing'}]}]) {
    const f=publicationFixture(options); await f.subject.prepare(f.api);
    assert.equal(f.outputs.proceed,'false'); assert.equal(f.outputs.branch,undefined);
    assert.equal(f.calls.length,0);
  }
});

test('blocked, missing and malformed Codex results stop before staging or publication', async () => {
  for(const raw of ['', '{', JSON.stringify({status:'blocked',summary:'Need clarification'})]) {
    const f=publicationFixture({env:{CODEX_RESULT:raw}});
    await assert.rejects(f.subject.validate(f.api));
    assert.equal(f.calls.length,0);
  }
});

test('publication uses a Conventional Commit, create-only push and a PR closing the issue', async () => {
  const f = publicationFixture(); await f.subject.publish(f.api);
  assert(f.calls.some(c=>c.operation.includes('commit') && c.operation.includes('feat(books): implement issue #1')));
  const push=f.calls.find(c=>c.operation[0]==='push');
  assert(push.operation.includes('--force-with-lease=refs/heads/feature/1-favoriten:'));
  assert(push.operation.includes('HEAD:refs/heads/feature/1-favoriten'));
  assert(!push.operation.some(arg=>arg.includes('test-token')));
  assert.equal(push.env.GIT_CONFIG_KEY_0,'http.https://github.com/.extraheader');
  assert.equal(f.api.created.base,'main'); assert.equal(f.api.created.head,state.branch);
  assert.match(f.api.created.body,/Closes #1/); assert.equal(f.summaries.length,1);
});

test('publication stops before committing when requirements, main, branch or tested files changed', async () => {
  for (const options of [{state:{digest:'stale'}},{main:'c'.repeat(40)},
    {refs:[{ref:'refs/heads/feature/1-existing'}]},
    {prs:[{head:{repo:{full_name:'Carolin724/ki-software-engineer'},ref:state.branch},html_url:'existing'}]},
    {git:{'write-tree':'c'.repeat(40)}}]) {
    const f=publicationFixture(options);
    await assert.rejects(f.subject.publish(f.api));
    assert(!f.calls.some(c=>c.operation.includes('commit') || c.operation[0]==='push'));
    assert.equal(f.api.created,undefined);
  }
});

test('push and PR permission failures cannot produce a success summary', async () => {
  for (const options of [{pushFailure:true},{prFailure:true}]) {
    const f=publicationFixture(options);
    await assert.rejects(f.subject.publish(f.api));
    assert.equal(f.summaries.length,0);
    if(options.pushFailure) assert.equal(f.api.created,undefined);
  }
});
