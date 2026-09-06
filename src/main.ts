import './styles.css';
import { buildLoops, cueTextForLoop, formatTime, maskWords, parseCaptions, translationForLoop } from './captions';
import { clearAllData, deleteProjectData, deleteRecording, listProjects, listRecordings, saveProject, saveRecording, useStorageNamespace } from './db';
import { cachedUnlock, captureLicenseFromUrl, checkoutUrl, hasLicense, saveLicense, verifyLicense } from './license';
import { makeDemoProject } from './demo';
import type { ExportBundle, Project, Recording } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const FREE_PROJECTS = 2;
const FREE_RECORDINGS = 10;
const stages = [
  { name: 'Translation', note: 'Read the meaning before you listen.' },
  { name: 'Target text', note: 'Match each sound to its written words.' },
  { name: 'Masked words', note: 'Recall the hidden words as you listen.' },
  { name: 'No text', note: 'Listen without captions, then make a take.' }
];

let projects: Project[] = [];
let project: Project | null = null;
let recordings: Recording[] = [];
let view: 'home' | 'setup' | 'practice' | 'upgrade' = 'home';
let loopIndex = 0;
let stage = 0;
let revealMasks = false;
let mediaUrl = '';
let recordingUrls: string[] = [];
let recorder: MediaRecorder | null = null;
let recordingStream: MediaStream | null = null;
let chunks: Blob[] = [];
let statusMessage = '';
let toastTimer = 0;
const demoMode = location.pathname === '/demo' || location.pathname === '/demo/' || new URLSearchParams(location.search).get('demo') === '1';
const storagePrefix = demoMode ? 'demo:' : '';
const BUILD_ID = __BUILD_ID__;
let unlocked = demoMode ? false : cachedUnlock();

type AppView = 'home' | 'setup' | 'practice' | 'upgrade';

function localKey(key: string): string { return `${storagePrefix}${key}`; }

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);

function icon(name: 'play' | 'pause' | 'record' | 'stop' | 'arrow' | 'download' | 'trash'): string {
  const paths = {
    play: '<path d="m9 6 10 6-10 6z"/>', pause: '<path d="M8 6h3v12H8zm5 0h3v12h-3z"/>',
    record: '<circle cx="12" cy="12" r="6"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
    arrow: '<path d="m9 6 6 6-6 6"/>', download: '<path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m4 4v5m3-5v5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function setTheme(theme: 'light' | 'dark' | 'system'): void {
  localStorage.setItem(localKey('sl-theme'), theme);
  document.documentElement.dataset.theme = theme;
}

function shell(content: string, page = 'app'): string {
  const offline = navigator.onLine ? '' : '<div class="offline-bar" role="status">Offline — your saved practice still works on this device.</div>';
  const demo = demoMode ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved.</strong><span>Explore the German listening loop.</span><button class="text-button" id="reset-demo">Reset demo</button><button class="button small secondary" id="start-real">Start for real</button></aside>` : '';
  return `${offline}${demo}
    <header class="site-header">
      <a class="brand" href="/" aria-label="Subtitle Ladder home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Subtitle<br>Ladder</span></a>
      ${page === 'app' ? `<nav aria-label="Primary"><a class="text-button" href="/demo/">Demo</a><button class="text-button" id="nav-home">My clips</button><button class="button small" id="nav-new">New clip</button></nav>` : '<a class="button small" href="/">Open the app</a>'}
    </header>
    ${content}
    <footer class="site-footer">
      <p>Your audio and takes stay in this browser.</p>
      <nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><button class="link-button" id="theme-toggle">Change theme</button></nav>
      <p class="fine-print">Original AI-generated welcome artwork · Built by Param Factory · build ${escapeHtml(BUILD_ID)}</p>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    <div class="sr-only" id="announcer" aria-live="polite">${escapeHtml(statusMessage)}</div>`;
}

function renderHome(): void {
  document.title = 'Subtitle Ladder — practise speaking with captions';
  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const library = sorted.length ? `
    <section class="library" aria-labelledby="library-title">
      <div class="section-heading"><div><p class="eyebrow">Your local library</p><h2 id="library-title">Continue a clip</h2></div><button class="text-button" id="export-data">${icon('download')} Export backup</button></div>
      <ul class="project-list">${sorted.map((item) => {
        const completed = Object.values(item.progress).reduce((sum, done) => sum + new Set(done).size, 0);
        const total = item.loops.length * 4;
        return `<li><button class="project-row" data-open="${item.id}"><span class="project-number">${String(item.loops.length).padStart(2, '0')}</span><span><strong>${escapeHtml(item.title)}</strong><small>${completed} of ${total} levels complete · ${escapeHtml(item.mediaName)}</small></span><span class="row-action">Resume ${icon('arrow')}</span></button><button class="icon-button danger-quiet" data-delete-project="${item.id}" aria-label="Delete ${escapeHtml(item.title)}">${icon('trash')}</button></li>`;
      }).join('')}</ul>
      <div class="data-actions"><label class="text-button import-label">Import backup<input id="import-data" type="file" accept="application/json,.json"></label></div>
    </section>` : `
    <section class="empty-note" aria-labelledby="empty-title"><p class="eyebrow">Nothing saved yet</p><h2 id="empty-title">Create your first practice clip.</h2><p>Choose your audio and a UTF-8 SRT or WebVTT caption file. The app will make short loops.</p><button class="button" id="empty-create">Create your first clip ${icon('arrow')}</button><label class="text-button import-label">Import a backup<input id="import-data" type="file" accept="application/json,.json"></label></section>`;

  app.innerHTML = shell(`<main id="main" tabindex="-1">
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">Listening practice, one support level at a time</p><h1>Practise speaking with your own captions.</h1><p class="lede">For independent language learners who want to hear one short clip, then speak it with less text.</p><div class="hero-actions"><a class="button" href="/demo/">Try it with sample data ${icon('arrow')}</a><span class="action-note">Open a ready German listening loop.</span><button class="text-button" id="hero-create">Use my audio</button><button class="text-button" id="how-link">See the four levels</button></div><ul class="ownership"><li>Stored in this browser</li><li>Works offline after the first visit</li><li>$12 once removes app count limits</li></ul></div>
      <picture class="hero-art"><source media="(max-width: 700px)" srcset="/hero-listening-landscape-768.webp"><img src="/hero-listening-landscape-1280.webp" width="1280" height="853" fetchpriority="high" alt="Four blank paper caption strips rise from a listening horn toward a moon."></picture>
    </section>
    ${library}
    <section class="method" id="method" aria-labelledby="method-title"><p class="eyebrow">How it works</p><h2 id="method-title">Use less text on each repeat.</h2><ol>${stages.map((item, index) => `<li><span>0${index + 1}</span><h3>${item.name}</h3><p>${item.note}</p></li>`).join('')}</ol></section>
    <section class="paid-note"><div><p class="eyebrow">Free and paid limits</p><h2>Use all four support levels for free.</h2><p>The free version stores two clips and ten takes. Remove those count limits for <strong>$12 once</strong>.</p></div><button class="button secondary" id="upgrade-link">${unlocked ? 'Unlimited is active' : 'See the one-time purchase'}</button></section>
  </main>`);
  bindCommon();
  document.querySelector('#hero-create')?.addEventListener('click', startSetup);
  document.querySelector('#empty-create')?.addEventListener('click', startSetup);
  document.querySelector('#how-link')?.addEventListener('click', () => document.querySelector('#method')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  document.querySelector('#upgrade-link')?.addEventListener('click', () => navigateTo('upgrade'));
  document.querySelectorAll<HTMLElement>('[data-open]').forEach((button) => button.addEventListener('click', () => openProject(button.dataset.open!)));
  document.querySelectorAll<HTMLElement>('[data-delete-project]').forEach((button) => button.addEventListener('click', () => removeProject(button.dataset.deleteProject!)));
  document.querySelector('#export-data')?.addEventListener('click', exportData);
  document.querySelector<HTMLInputElement>('#import-data')?.addEventListener('change', importData);
}

function renderSetup(): void {
  document.title = 'New practice clip — Subtitle Ladder';
  app.innerHTML = shell(`<main id="main" class="setup-page" tabindex="-1">
    <div class="page-intro"><button class="back-button" id="setup-back">← My clips</button><p class="eyebrow">New practice clip</p><h1>Create a practice clip from your audio.</h1><p>Your audio stays in this browser. Start with a 30-second to 5-minute recording.</p></div>
    <form id="setup-form" class="setup-form" novalidate>
      <div class="form-section"><span class="form-number">01</span><div><h2>Name the practice</h2><label for="clip-title">Clip name</label><input id="clip-title" name="title" maxlength="80" required placeholder="Morning radio introduction"><p class="field-hint">A useful name for you—not a course title.</p></div></div>
      <div class="form-section"><span class="form-number">02</span><div><h2>Choose your audio</h2><label class="file-drop" for="media-file"><strong>Choose audio</strong><span id="media-summary">MP3, M4A, WAV, OGG, or WebM · at least 15 seconds</span><input id="media-file" name="media" type="file" accept="audio/*" required></label><label class="check-label"><input type="checkbox" name="rights" required><span>I own this recording or have permission to practise with it on my device.</span></label></div></div>
      <div class="form-section"><span class="form-number">03</span><div><h2>Add the words</h2><label class="file-drop" for="target-file"><strong>Target-language captions <span aria-hidden="true">*</span></strong><span id="target-summary">UTF-8 SRT or WebVTT</span><input id="target-file" name="target" type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" required></label><label class="file-drop optional" for="translation-file"><strong>Translation captions <small>optional</small></strong><span id="translation-summary">A second SRT or VTT in your familiar language</span><input id="translation-file" name="translation" type="file" accept=".srt,.vtt,text/vtt,application/x-subrip"></label><div class="form-pair"><label for="language">Target language<input id="language" name="language" placeholder="e.g. German" autocomplete="off"></label><label for="direction">Text direction<select id="direction" name="direction"><option value="auto">Automatic</option><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label></div><details><summary>Caption file tips</summary><p>Each caption needs a start time, end time, and text. Translation captions may use different cue boundaries; we align them by time.</p><pre>1\n00:00:00,000 --&gt; 00:00:04,000\nGuten Morgen!</pre></details></div></div>
      <div class="form-error" id="setup-error" role="alert" hidden></div>
      <div class="form-submit"><button class="button" type="submit">Create my loops ${icon('arrow')}</button><p>We’ll make 15–60 second loops around natural caption boundaries.</p></div>
    </form>
  </main>`);
  bindCommon();
  document.querySelector('#setup-back')?.addEventListener('click', goHome);
  ['media', 'target', 'translation'].forEach((name) => document.querySelector<HTMLInputElement>(`#${name}-file`)?.addEventListener('change', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const summary = document.querySelector(`#${name}-summary`);
    if (summary && input.files?.[0]) summary.textContent = `${input.files[0].name} · ${formatBytes(input.files[0].size)}`;
  }));
  document.querySelector('#setup-form')?.addEventListener('submit', createProject);
}

function renderPractice(): void {
  if (!project) return goHome();
  document.title = demoMode ? 'Demo — Subtitle Ladder' : `${project.title} — Subtitle Ladder`;
  const loop = project.loops[loopIndex];
  const target = cueTextForLoop(project.targetCues, loop);
  const translation = translationForLoop(project.translationCues, loop);
  const done = new Set(project.progress[loop.id] || []);
  const stageContent = stage === 0
    ? `<div class="caption translation"><p class="caption-label">Meaning</p><p>${escapeHtml(translation || 'No translation file was added. Listen for the gist, then use the target text below.')}</p>${translation ? `<p class="target-underlay">${escapeHtml(target)}</p>` : ''}</div>`
    : stage === 1 ? `<div class="caption"><p class="caption-label">Target text</p><p>${escapeHtml(target)}</p></div>`
      : stage === 2 ? `<div class="caption"><p class="caption-label">Target text · some words hidden</p><p>${escapeHtml(revealMasks ? target : maskWords(target))}</p><button class="text-button" id="reveal-masks">${revealMasks ? 'Hide words again' : 'Reveal masked words'}</button></div>`
        : `<div class="caption no-text"><span aria-hidden="true">◌</span><p>No text on this level.</p><small>Listen twice. Then record what you heard.</small></div>`;
  const stageRecordings = recordings.filter((item) => item.projectId === project!.id && item.loopId === loop.id && item.stage === stage);
  recordingUrls.forEach(URL.revokeObjectURL); recordingUrls = [];
  const recordingList = stageRecordings.length ? `<ul class="recording-list">${stageRecordings.map((item, index) => {
    const url = URL.createObjectURL(item.blob); recordingUrls.push(url);
    return `<li><span><strong>Take ${stageRecordings.length - index}</strong><small>${new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></span><audio controls preload="metadata" src="${url}"></audio><button class="icon-button danger-quiet" data-delete-recording="${item.id}" aria-label="Delete take ${stageRecordings.length - index}">${icon('trash')}</button></li>`;
  }).join('')}</ul>` : '<p class="recording-empty">No take on this level yet. Record a short echo or retell.</p>';

  app.innerHTML = shell(`<main id="main" class="practice-page" tabindex="-1">
    <div class="practice-top"><button class="back-button" id="practice-back">← My clips</button><div><p class="eyebrow">${escapeHtml(project.targetLanguage || 'Listening practice')}</p><h1>${escapeHtml(project.title)}</h1></div><div class="clip-meta"><span>Loop ${loopIndex + 1} / ${project.loops.length}</span><span>${formatTime(loop.start)}–${formatTime(loop.end)}</span></div></div>
    <div class="practice-grid">
      <aside class="ladder-panel" aria-label="Support levels"><p class="eyebrow">Support levels</p><ol>${stages.map((item, index) => `<li class="${index === stage ? 'current' : ''} ${done.has(index) ? 'complete' : ''}"><button data-stage="${index}" aria-current="${index === stage ? 'step' : 'false'}"><span class="rung-number">0${index + 1}</span><span><strong>${item.name}</strong><small>${done.has(index) ? 'Completed' : item.note}</small></span><span class="rung-state">${done.has(index) ? '✓' : index === stage ? 'Now' : ''}</span></button></li>`).join('')}</ol><div class="keyboard-help"><strong>Keyboard</strong><span>Space play · R record · ← → loops</span></div></aside>
      <section class="workbench" aria-labelledby="stage-title">
        <header><div><p class="eyebrow">Level 0${stage + 1}</p><h2 id="stage-title">${stages[stage].name}</h2><p>${stages[stage].note}</p></div><span class="duration-badge">${Math.round(loop.end - loop.start)} sec loop</span></header>
        <div class="caption-stage" dir="${project.textDirection}" lang="${escapeHtml(project.targetLanguage)}">${stageContent}</div>
        <div class="transport"><audio id="source-audio" src="${mediaUrl}" preload="metadata"></audio><button class="transport-button" id="play-loop">${icon('play')}<span>Play loop</span></button><div class="time-readout"><span id="current-time">${formatTime(loop.start)}</span><span class="time-track"><i id="time-progress"></i></span><span>${formatTime(loop.end)}</span></div><label>Speed<select id="playback-rate"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select></label></div>
        <details class="loop-editor"><summary>Adjust loop boundaries</summary><div><label for="loop-start">Start (seconds)<input id="loop-start" type="number" min="0" max="${Math.max(0, loop.end - 15)}" step="0.1" value="${loop.start.toFixed(1)}"></label><label for="loop-end">End (seconds)<input id="loop-end" type="number" min="${loop.start + 15}" max="${project.duration}" step="0.1" value="${loop.end.toFixed(1)}"></label><button class="button small secondary" id="save-loop">Save boundaries</button></div><p class="field-hint">Loops must be between 15 and 60 seconds.</p></details>
        <section class="speak-back" aria-labelledby="speak-title"><div><p class="eyebrow">Record your speech</p><h3 id="speak-title">Make a take for this level.</h3><p>Your microphone audio stays in this browser. We never score your speech.</p></div><button class="record-button" id="record-button"><span>${icon('record')}</span><strong>Start recording</strong></button></section>
        <div id="recording-error" class="inline-error" role="alert" hidden></div>
        ${recordingList}
        <div class="stage-actions"><button class="text-button" id="previous-loop" ${loopIndex === 0 ? 'disabled' : ''}>← Previous loop</button><button class="button" id="complete-stage">${done.has(stage) ? (stage < 3 ? 'Continue to next level' : 'Level complete') : (stage < 3 ? 'Complete & continue' : 'Complete this level')} ${stage < 3 ? icon('arrow') : ''}</button><button class="text-button" id="next-loop" ${loopIndex === project.loops.length - 1 ? 'disabled' : ''}>Next loop →</button></div>
      </section>
    </div>
  </main>`);
  bindCommon(); bindPractice();
}

function renderUpgrade(): void {
  document.title = 'Remove practice limits — Subtitle Ladder';
  app.innerHTML = shell(`<main id="main" class="upgrade-page" tabindex="-1"><button class="back-button" id="upgrade-back">← Back</button><div class="upgrade-grid"><section><p class="eyebrow">One-time purchase</p><h1>Remove the clip and recording limits.</h1><p class="lede">The free version includes all four support levels, backup export, and backup import.</p><ul class="tick-list"><li>Free: two local practice clips</li><li>Free: ten local microphone takes</li><li>Paid: no app count limit for clips or takes</li></ul><p class="fine-print">Your browser and device still set their own storage limits.</p></section><aside class="price-card"><p class="eyebrow">Subtitle Ladder unlimited</p><p class="price"><span>$</span>12 <small>USD · once</small></p><p>Checkout is hosted by Sociobot/Dodo, the merchant of record.</p>${unlocked ? '<div class="unlocked-note">✓ Unlimited is active on this device.</div>' : `<a class="button full" href="${checkoutUrl}">Buy the unlimited version ${icon('arrow')}</a>`}<details><summary>Have a license?</summary><form id="restore-form"><label for="license-token">Paste license token</label><input id="license-token" autocomplete="off" spellcheck="false" required><button class="button secondary small" type="submit">Verify and restore</button><p id="license-status" role="status"></p></form></details><p class="fine-print">By buying, you agree to the <a href="/terms/">terms</a>. Read the <a href="/privacy/">privacy policy</a>.</p></aside></div></main>`);
  bindCommon();
  document.querySelector('#upgrade-back')?.addEventListener('click', goHome);
  document.querySelector('#restore-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const input = document.querySelector<HTMLInputElement>('#license-token')!; const output = document.querySelector('#license-status')!;
    if (!input.value.trim()) return;
    saveLicense(input.value); output.textContent = 'Checking your license…';
    try { const result = await verifyLicense(true); unlocked = result?.valid === true; output.textContent = unlocked ? 'License restored. Unlimited is active.' : `That license could not be activated (${result?.reason || 'invalid'}).`; if (unlocked) setTimeout(renderUpgrade, 700); }
    catch { output.textContent = 'We could not reach license verification. Check your connection and try again.'; }
  });
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Subtitle Ladder`;
  app.innerHTML = shell(`<main id="main" class="legal-page" tabindex="-1"><p class="eyebrow">Last updated 6 September 2026</p><h1>${privacy ? 'Privacy in plain language.' : 'Terms of use.'}</h1>${privacy ? `
    <p class="lede">Your learning media stays on your device during practice.</p><h2>What stays local</h2><p>Imported audio, captions, clip names, progress, settings, and microphone takes use browser storage. The app does not upload them. It creates a backup file only when you choose Export backup.</p><h2>Payments and licenses</h2><p>Sociobot/Dodo hosts checkout and processes payment. After purchase, this app stores your license token in this browser. It sends the token to Sociobot for verification at most once every 24 hours. We do not receive or store your card details.</p><h2>Analytics and third parties</h2><p>This release has no analytics, ads, tracking pixels, third-party fonts, or third-party scripts. The welcome image ships with the app.</p><h2>Your choices</h2><p>Export a backup to copy your practice data. Import that file to restore it. You can delete one clip or clear all local practice data. Clearing browser site data also removes the license from this device.</p><button class="button danger" id="clear-data">Clear all local practice data</button><h2>Contact</h2><p>For privacy questions, contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>` : `
    <p class="lede">Use Subtitle Ladder only with media you are allowed to use.</p><h2>Your media rights</h2><p>Import only recordings and captions you created, own, licensed, or may use. Subtitle Ladder does not download or provide commercial media. You remain responsible for your source material.</p><h2>What the product provides</h2><p>The app creates timed listening loops and removes text support in four steps. It also lets you make local microphone takes. It does not translate, score speech, certify proficiency, or promise fluency. File and recording support can vary by browser.</p><h2>Free and paid versions</h2><p>The free version stores two clips and ten takes. A $12 USD one-time purchase removes those app count limits. Device and browser storage limits still apply. Sociobot/Dodo is the merchant of record.</p><h2>Backups and availability</h2><p>Browser settings or cleanup can erase local storage. Export backups regularly. The software is provided “as is” without warranties. We may update or stop hosted access.</p><h2>Acceptable use and law</h2><p>Do not use the service to break the law or another person’s rights. Applicable law governs these terms. Other provisions remain if one cannot be enforced.</p><h2>Contact</h2><p>Questions can be sent to <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>`}</main>`, 'legal');
  bindCommon();
  document.querySelector('#clear-data')?.addEventListener('click', async () => {
    if (!confirm('Clear every saved clip and recording from this browser? This cannot be undone unless you exported a backup.')) return;
    await clearAllData(); showToast('All local practice data was cleared.');
  });
}

function render(): void {
  if (location.pathname.startsWith('/privacy')) return renderLegal('privacy');
  if (location.pathname.startsWith('/terms')) return renderLegal('terms');
  if (view === 'setup') renderSetup(); else if (view === 'practice') renderPractice(); else if (view === 'upgrade') renderUpgrade(); else renderHome();
}

function routeFor(next: AppView): string {
  if (next === 'setup') return '/new/';
  if (next === 'upgrade') return '/unlimited/';
  if (next === 'practice' && project) return `/practice/?clip=${encodeURIComponent(project.id)}`;
  return '/';
}

function focusViewHeading(): void {
  requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLHeadingElement>('main h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    document.querySelector('#announcer')!.textContent = `Opened ${heading.textContent || 'page'}.`;
  });
}

function navigateTo(next: AppView, historyMode: 'push' | 'replace' | 'none' = 'push'): void {
  view = next;
  if (!demoMode && historyMode !== 'none') {
    const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
    history[method]({ view: next }, '', routeFor(next));
  }
  render();
  focusViewHeading();
}

async function restoreRoute(focus = false): Promise<void> {
  if (demoMode) {
    render();
    if (focus) focusViewHeading();
    return;
  }
  if (location.pathname.startsWith('/new')) view = 'setup';
  else if (location.pathname.startsWith('/unlimited')) view = 'upgrade';
  else if (location.pathname.startsWith('/practice')) {
    const id = new URLSearchParams(location.search).get('clip');
    if (id && await openProject(id, 'none')) {
      if (focus) focusViewHeading();
      return;
    }
    statusMessage = 'That saved clip was not found on this device.';
    history.replaceState({ view: 'home' }, '', '/');
    view = 'home';
  } else view = 'home';
  render();
  if (focus) focusViewHeading();
}

function bindCommon(): void {
  document.querySelector('#nav-home')?.addEventListener('click', goHome);
  document.querySelector('#nav-new')?.addEventListener('click', startSetup);
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    const current = localStorage.getItem(localKey('sl-theme')) || 'system';
    const next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
    setTheme(next); showToast(`Theme: ${next}.`);
  });
  document.querySelector('#reset-demo')?.addEventListener('click', async () => {
    await clearAllData();
    await seedDemo();
    render();
    showToast('Sample lesson reset.');
  });
  document.querySelector('#start-real')?.addEventListener('click', async () => {
    await clearAllData();
    location.assign('/');
  });
}

function bindPractice(): void {
  const audio = document.querySelector<HTMLAudioElement>('#source-audio')!;
  const loop = project!.loops[loopIndex];
  const playButton = document.querySelector<HTMLButtonElement>('#play-loop')!;
  audio.currentTime = loop.start;
  const togglePlay = async () => {
    if (audio.paused) { if (audio.currentTime < loop.start || audio.currentTime >= loop.end) audio.currentTime = loop.start; await audio.play(); }
    else audio.pause();
  };
  playButton.addEventListener('click', togglePlay);
  audio.addEventListener('play', () => { playButton.innerHTML = `${icon('pause')}<span>Pause</span>`; });
  audio.addEventListener('pause', () => { playButton.innerHTML = `${icon('play')}<span>Play loop</span>`; });
  audio.addEventListener('timeupdate', () => {
    if (audio.currentTime >= loop.end) { audio.currentTime = loop.start; if (audio.paused) return; }
    document.querySelector('#current-time')!.textContent = formatTime(audio.currentTime);
    const percent = Math.max(0, Math.min(100, ((audio.currentTime - loop.start) / (loop.end - loop.start)) * 100));
    (document.querySelector('#time-progress') as HTMLElement).style.width = `${percent}%`;
  });
  document.querySelector<HTMLSelectElement>('#playback-rate')?.addEventListener('change', (event) => { audio.playbackRate = Number((event.target as HTMLSelectElement).value); });
  document.querySelector('#practice-back')?.addEventListener('click', goHome);
  document.querySelectorAll<HTMLElement>('[data-stage]').forEach((button) => button.addEventListener('click', () => { stage = Number(button.dataset.stage); revealMasks = false; renderPractice(); }));
  document.querySelector('#reveal-masks')?.addEventListener('click', () => { revealMasks = !revealMasks; renderPractice(); });
  document.querySelector('#previous-loop')?.addEventListener('click', () => changeLoop(-1));
  document.querySelector('#next-loop')?.addEventListener('click', () => changeLoop(1));
  document.querySelector('#complete-stage')?.addEventListener('click', completeStage);
  document.querySelector('#save-loop')?.addEventListener('click', saveLoopBoundaries);
  document.querySelector('#record-button')?.addEventListener('click', toggleRecording);
  document.querySelectorAll<HTMLElement>('[data-delete-recording]').forEach((button) => button.addEventListener('click', () => removeRecording(button.dataset.deleteRecording!)));
  document.addEventListener('keydown', practiceShortcuts, { once: true });
}

function practiceShortcuts(event: KeyboardEvent): void {
  if (view !== 'practice') return;
  const target = event.target as HTMLElement;
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'AUDIO'].includes(target.tagName)) { document.addEventListener('keydown', practiceShortcuts, { once: true }); return; }
  if (event.code === 'Space') { event.preventDefault(); document.querySelector<HTMLButtonElement>('#play-loop')?.click(); }
  if (event.key.toLowerCase() === 'r') document.querySelector<HTMLButtonElement>('#record-button')?.click();
  if (event.key === 'ArrowLeft') changeLoop(-1);
  if (event.key === 'ArrowRight') changeLoop(1);
  document.addEventListener('keydown', practiceShortcuts, { once: true });
}

async function createProject(event: Event): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const error = document.querySelector<HTMLDivElement>('#setup-error')!;
  if (!form.reportValidity()) return;
  if (!unlocked && projects.length >= FREE_PROJECTS) { navigateTo('upgrade'); return; }
  const data = new FormData(form); const media = data.get('media') as File; const target = data.get('target') as File; const translation = data.get('translation') as File;
  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!; submit.disabled = true; submit.textContent = 'Reading this clip…'; error.hidden = true;
  try {
    if (!media?.size || !target?.size) throw new Error('Choose both an audio file and target-language captions.');
    if (media.size > 250 * 1024 * 1024) throw new Error('This audio is over 250 MB. Choose a shorter or compressed recording.');
    const duration = await mediaDuration(media);
    const targetCues = parseCaptions(await target.text());
    const translationCues = translation?.size ? parseCaptions(await translation.text()) : [];
    const loops = buildLoops(targetCues, duration);
    if (!loops.length) throw new Error('The captions do not overlap this audio. Check that their timestamps match.');
    const now = new Date().toISOString();
    project = { id: crypto.randomUUID(), title: String(data.get('title')).trim(), createdAt: now, updatedAt: now, mediaName: media.name, mediaType: media.type || 'audio/mpeg', mediaBlob: media, duration, targetLanguage: String(data.get('language') || '').trim(), textDirection: data.get('direction') as Project['textDirection'], targetCues, translationCues, loops, progress: {} };
    await saveProject(project); projects.push(project); setProjectMedia(project); loopIndex = 0; stage = 0; statusMessage = `${loops.length} practice loops created.`; navigateTo('practice');
  } catch (reason) { error.textContent = reason instanceof Error ? reason.message : 'This clip could not be created. Check the files and try again.'; error.hidden = false; error.focus(); submit.disabled = false; submit.innerHTML = `Create my loops ${icon('arrow')}`; }
}

function mediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(); const url = URL.createObjectURL(file); audio.preload = 'metadata';
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); Number.isFinite(audio.duration) ? resolve(audio.duration) : reject(new Error('The audio duration could not be read.')); };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This audio format could not be read by your browser. Try MP3, WAV, or M4A.')); };
    audio.src = url;
  });
}

async function openProject(id: string, historyMode: 'push' | 'replace' | 'none' = 'push'): Promise<boolean> {
  project = projects.find((item) => item.id === id) || null; if (!project) return false;
  recordings = (await listRecordings()).filter((item) => item.projectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  setProjectMedia(project); loopIndex = 0; stage = 0; navigateTo('practice', historyMode);
  return true;
}

function setProjectMedia(item: Project): void { if (mediaUrl) URL.revokeObjectURL(mediaUrl); mediaUrl = URL.createObjectURL(item.mediaBlob); }
function changeLoop(delta: number): void { if (!project) return; const next = Math.max(0, Math.min(project.loops.length - 1, loopIndex + delta)); if (next !== loopIndex) { loopIndex = next; stage = 0; revealMasks = false; renderPractice(); } }

async function completeStage(): Promise<void> {
  if (!project) return; const loop = project.loops[loopIndex]; const done = new Set(project.progress[loop.id] || []); done.add(stage); project.progress[loop.id] = [...done]; project.updatedAt = new Date().toISOString(); await saveProject(project);
  statusMessage = `${stages[stage].name} marked complete.`;
  if (stage < 3) stage += 1; else if (loopIndex < project.loops.length - 1) { loopIndex += 1; stage = 0; }
  renderPractice();
}

async function saveLoopBoundaries(): Promise<void> {
  if (!project) return; const start = Number((document.querySelector('#loop-start') as HTMLInputElement).value); const end = Number((document.querySelector('#loop-end') as HTMLInputElement).value); const length = end - start;
  if (start < 0 || end > project.duration || length < 15 || length > 60) return showToast('Use a loop between 15 and 60 seconds within the audio.');
  project.loops[loopIndex] = { ...project.loops[loopIndex], start, end }; project.updatedAt = new Date().toISOString(); await saveProject(project); renderPractice(); showToast('Loop boundaries saved.');
}

async function toggleRecording(): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>('#record-button')!;
  const error = document.querySelector<HTMLDivElement>('#recording-error')!;
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  if (!unlocked && (await listRecordings()).length >= FREE_RECORDINGS) { navigateTo('upgrade'); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { error.hidden = false; error.textContent = 'This browser cannot record audio here. Try a current Chrome, Edge, Firefox, or Safari browser.'; return; }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = [];
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = saveTake; recorder.start(); button.classList.add('recording'); button.innerHTML = `<span>${icon('stop')}</span><strong>Stop & save</strong>`; statusMessage = 'Recording started.'; document.querySelector('#announcer')!.textContent = statusMessage;
  } catch { error.hidden = false; error.textContent = 'Microphone access was not available. Allow microphone permission, then try again.'; }
}

async function saveTake(): Promise<void> {
  recordingStream?.getTracks().forEach((track) => track.stop());
  if (!project || !chunks.length) return renderPractice();
  const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
  const take: Recording = { id: crypto.randomUUID(), projectId: project.id, loopId: project.loops[loopIndex].id, stage, createdAt: new Date().toISOString(), mimeType: blob.type, blob };
  await saveRecording(take); recordings.unshift(take); statusMessage = 'Recording saved on this device.'; renderPractice();
}

async function removeRecording(id: string): Promise<void> {
  const removed = recordings.find((item) => item.id === id); if (!removed) return;
  recordings = recordings.filter((item) => item.id !== id); await deleteRecording(id); renderPractice();
  showToast('Take deleted.', 'Undo', async () => { await saveRecording(removed); recordings.unshift(removed); renderPractice(); });
}

async function removeProject(id: string): Promise<void> {
  const item = projects.find((entry) => entry.id === id); if (!item || !confirm(`Delete “${item.title}” and all of its recordings from this device?`)) return;
  await deleteProjectData(id); projects = projects.filter((entry) => entry.id !== id); renderHome(); showToast('Clip and its recordings deleted.');
}

function startSetup(): void { if (demoMode) { location.assign('/new/'); return; } navigateTo(!unlocked && projects.length >= FREE_PROJECTS ? 'upgrade' : 'setup'); }
function goHome(): void { if (recorder?.state === 'recording') recorder.stop(); project = null; navigateTo('home'); }
function prefersReducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
function formatBytes(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function showToast(message: string, action?: string, callback?: () => void | Promise<void>): void {
  const toast = document.querySelector<HTMLDivElement>('#toast'); if (!toast) return;
  window.clearTimeout(toastTimer); toast.hidden = false; toast.innerHTML = `<span>${escapeHtml(message)}</span>${action ? `<button>${escapeHtml(action)}</button>` : ''}`;
  if (callback) toast.querySelector('button')?.addEventListener('click', async () => { await callback(); toast.hidden = true; });
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 6000);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
}

function dataUrlToBlob(value: string): Blob {
  if (!value.startsWith('data:')) throw new Error('Invalid backup media.');
  const comma = value.indexOf(',');
  if (comma < 5) throw new Error('Invalid backup media.');
  const metadata = value.slice(5, comma);
  const base64 = metadata.endsWith(';base64');
  const mimeType = (base64 ? metadata.slice(0, -7) : metadata) || 'application/octet-stream';
  const payload = value.slice(comma + 1);
  if (base64) {
    const binary = atob(payload.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType });
}

async function exportData(): Promise<void> {
  const allRecordings = await listRecordings();
  const bundle: ExportBundle = { format: 'subtitle-ladder-backup', version: 1, exportedAt: new Date().toISOString(), projects: await Promise.all(projects.map(async ({ mediaBlob, ...item }) => ({ ...item, mediaBlob: await blobToDataUrl(mediaBlob) }))), recordings: await Promise.all(allRecordings.map(async ({ blob, ...item }) => ({ ...item, blob: await blobToDataUrl(blob) }))) };
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `subtitle-ladder-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); showToast('Backup exported. Keep it somewhere safe.');
}

async function importData(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 375 * 1024 * 1024) throw new Error('Backup is too large.');
    const raw = JSON.parse(await file.text()) as ExportBundle;
    if (raw.format !== 'subtitle-ladder-backup' || raw.version !== 1 || !Array.isArray(raw.projects) || !Array.isArray(raw.recordings)) throw new Error();
    if (!unlocked && raw.projects.length + projects.length > FREE_PROJECTS) { navigateTo('upgrade'); return; }
    const restoredProjects = raw.projects.map(({ mediaBlob, ...item }) => {
      if (typeof mediaBlob !== 'string') throw new Error('Invalid project media.');
      return { ...item, mediaBlob: dataUrlToBlob(mediaBlob) };
    });
    const restoredRecordings = raw.recordings.map(({ blob, ...item }) => {
      if (typeof blob !== 'string') throw new Error('Invalid recording media.');
      return { ...item, blob: dataUrlToBlob(blob) };
    });
    for (const item of restoredProjects) await saveProject(item);
    for (const item of restoredRecordings) await saveRecording(item);
    projects = await listProjects(); renderHome(); showToast(`${raw.projects.length} clip${raw.projects.length === 1 ? '' : 's'} imported.`);
  } catch { showToast('That file is not a valid Subtitle Ladder backup. Choose an exported Subtitle Ladder JSON file.'); }
  finally { input.value = ''; }
}

async function init(): Promise<void> {
  useStorageNamespace(demoMode ? 'demo' : 'real');
  setTheme((localStorage.getItem(localKey('sl-theme')) as 'light' | 'dark' | 'system') || 'system');
  const arrivedWithLicense = demoMode ? false : captureLicenseFromUrl();
  try { projects = await listProjects(); if (demoMode) await seedDemo(); } catch { statusMessage = 'Local storage is unavailable. Check private browsing or storage settings.'; }
  await restoreRoute();
  if (!demoMode && hasLicense()) {
    try { const result = await verifyLicense(arrivedWithLicense); const wasUnlocked = unlocked; unlocked = result?.valid === true; if (arrivedWithLicense) { navigateTo('upgrade', 'replace'); showToast(unlocked ? 'Purchase restored. Unlimited is now active.' : 'This license is not active.'); } else if (wasUnlocked !== unlocked && view === 'home') renderHome(); }
    catch { if (arrivedWithLicense) showToast('Saved the license, but verification is offline. Try restoring it later.'); }
  }
  window.addEventListener('online', () => { render(); showToast('Back online. Your local work is unchanged.'); });
  window.addEventListener('offline', render);
  window.addEventListener('popstate', () => { void restoreRoute(true); });
  document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector<HTMLElement>('#main')?.focus();
  });
  registerServiceWorker();
}

async function seedDemo(): Promise<void> {
  project = projects.find((item) => item.id === 'demo:morning-listening') || makeDemoProject();
  if (!projects.some((item) => item.id === project!.id)) await saveProject(project);
  projects = [project];
  recordings = (await listRecordings()).filter((item) => item.projectId === project!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  setProjectMedia(project);
  loopIndex = 0;
  stage = 0;
  view = 'practice';
  statusMessage = 'Sample lesson ready.';
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`);
    await navigator.serviceWorker.ready;
    let refreshRequested = false;
    const offerUpdate = () => {
      const toast = document.querySelector<HTMLDivElement>('#toast'); if (!toast) return;
      toast.hidden = false; toast.innerHTML = '<span>An app update is ready.</span><button>Update now</button>';
      toast.querySelector('button')?.addEventListener('click', () => { refreshRequested = true; registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); });
    };
    if (registration.waiting) offerUpdate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(); }));
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshRequested) location.reload(); });
  } catch { /* App remains usable without installation support. */ }
}

void init();
