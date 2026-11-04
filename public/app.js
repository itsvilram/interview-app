// Same origin as the backend. If the frontend is hosted separately,
// change this to the full backend URL, e.g. 'http://1.2.3.4:3000/api/items'.
const API = '/api/items';

const list = document.getElementById('list');
const form = document.getElementById('add-form');
const input = document.getElementById('title');
const statusEl = document.getElementById('status');

// Small fetch wrapper: sends JSON, throws a readable error on non-2xx.
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

function render(items) {
  statusEl.textContent = items.length === 0 ? 'No items yet.' : '';
  list.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.done;
      checkbox.addEventListener('change', () => run(() =>
        request(`${API}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ done: checkbox.checked }) })
      ));

      const span = document.createElement('span');
      span.textContent = item.title; // textContent (not innerHTML) so user input can't inject HTML
      if (item.done) span.className = 'done';

      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.addEventListener('click', () => run(() =>
        request(`${API}/${item.id}`, { method: 'DELETE' })
      ));

      li.append(checkbox, span, del);
      return li;
    })
  );
}

async function load() {
  try {
    render(await request(API));
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

// Run an action, show any error, then reload the list.
async function run(action) {
  try {
    await action();
  } catch (err) {
    statusEl.textContent = err.message;
    return;
  }
  await load();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  run(async () => {
    await request(API, { method: 'POST', body: JSON.stringify({ title }) });
    input.value = '';
  });
});

load();
