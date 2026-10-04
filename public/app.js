const $ = id => document.getElementById(id);
let current = null;

const options = () => ({
  sortByDate: $('date').checked,
  dateGrouping: $('month').checked ? 'month' : 'year',
  renameFiles: $('rename').checked,
  detectDuplicates: $('duplicates').checked,
  cleanTemporaryFiles: $('clean').checked,
  recursive: $('recursive').checked
});

async function request(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Une erreur est survenue.');
  return result;
}

function setMessage(text, good = false) {
  $('message').textContent = text;
  $('message').dataset.state = good ? 'success' : 'error';
}

function invalidatePreview() {
  if (!current) return;
  current = null;
  $('apply').disabled = true;
  $('status').textContent = 'Options modifiées · relancez l’aperçu';
  $('status').classList.add('stale');
}

function show(plan) {
  current = plan;
  const summary = plan.summary;
  $('total').textContent = summary.total;
  $('moves').textContent = summary.moves;
  $('dupes').textContent = summary.duplicates;
  $('deletes').textContent = summary.deletes;
  $('categories').innerHTML = Object.entries(summary.categories)
    .map(([name, count]) => `<span class="category">${escapeHtml(name)} · ${count}</span>`)
    .join('');
  $('operations').innerHTML = plan.operations.length
    ? plan.operations.map(operation => `
      <div class="operation">
        <b>${operation.type === 'delete' ? 'SUPPRIMER' : 'DÉPLACER'}</b>
        <div><div>${escapeHtml(operation.source)}</div>
          ${operation.destination ? `<small>→ ${escapeHtml(operation.destination)}</small>` : ''}
        </div>
      </div>`).join('')
    : '<p class="hint">Ce dossier est déjà organisé selon ces règles.</p>';
  $('apply').disabled = plan.operations.length === 0;
  $('result').hidden = false;
  $('status').textContent = 'Mode aperçu · aucun fichier modifié';
  $('status').classList.remove('stale');
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = String(value);
  return element.innerHTML;
}

async function previewPlan() {
  const button = $('preview');
  button.disabled = true;
  setMessage('Analyse en cours…', true);
  try {
    const plan = await request('/api/preview', { folder: $('folder').value, options: options() });
    show(plan);
    setMessage('Aucune modification effectuée. Vérifiez l’aperçu avant de continuer.', true);
  } catch (error) {
    setMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

$('date').addEventListener('change', event => {
  $('month').disabled = !event.target.checked;
  if (!event.target.checked) $('month').checked = false;
});
$('preview').addEventListener('click', previewPlan);

for (const control of document.querySelectorAll('#folder, .options input')) {
  control.addEventListener('input', invalidatePreview);
  control.addEventListener('change', invalidatePreview);
}
$('folder').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !$('preview').disabled) previewPlan();
});

$('apply').addEventListener('click', async () => {
  if (!current || !confirm(`Confirmer ${current.operations.length} opération(s) ?`)) return;
  const button = $('apply');
  button.disabled = true;
  $('undo').disabled = true;
  $('preview').disabled = true;
  try {
    const done = await request('/api/apply', { planId: current.planId });
    current = null;
    await previewPlan();
    if (current) setMessage(`${done.count} opération(s) terminée(s). Vous pouvez les annuler avec le bouton ci-dessous.`, true);
  } catch (error) {
    setMessage(error.message);
    current = null;
    button.disabled = true;
  } finally {
    $('preview').disabled = false;
    $('undo').disabled = false;
  }
});

$('undo').addEventListener('click', async () => {
  if (!confirm('Annuler les déplacements de la dernière exécution ?')) return;
  const button = $('undo');
  button.disabled = true;
  $('preview').disabled = true;
  $('apply').disabled = true;
  try {
    const result = await request('/api/undo', { folder: $('folder').value });
    current = null;
    await previewPlan();
    if (current) setMessage(`${result.count} déplacement(s) restauré(s).${result.skippedDeletes ? ` ${result.skippedDeletes} suppression(s) ne peuvent pas être restaurées.` : ''}`, true);
  } catch (error) {
    setMessage(error.message);
  } finally {
    button.disabled = false;
    $('preview').disabled = false;
    $('apply').disabled = !current || current.operations.length === 0;
  }
});
