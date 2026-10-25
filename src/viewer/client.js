(function () {
  var boot = window.__OMP__ || { mode: 'static', doc: null };
  var state = { doc: boot.doc || null, mounted: null, node: null };

  var FIELD_ORDER = [
    ['description', 'Description'],
    ['context', 'Context'],
    ['constraint', 'Constraint'],
    ['concern', 'Concern'],
    ['todo', 'Todo'],
    ['note', 'Note'],
  ];

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('omp-theme', theme); } catch (err) { /* private mode */ }
    var button = document.getElementById('theme');
    if (button) {
      button.textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
      button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    if (state.mounted && state.mounted.refresh) state.mounted.refresh();
  }

  function savedTheme() {
    try {
      var stored = localStorage.getItem('omp-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (err) { /* ignore */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function partsFromHash() {
    var raw = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    if (!raw) return [];
    return raw.split('/').filter(Boolean);
  }

  function hashFor(nodePath) {
    return '#/' + nodePath.split('/').map(encodeURIComponent).join('/');
  }

  function findNode(parts) {
    if (!state.doc || !state.doc.perspectives.length) return null;
    if (!parts.length) return state.doc.perspectives[0];
    var node = null;
    var nodes = state.doc.perspectives;
    for (var i = 0; i < parts.length; i += 1) {
      node = null;
      for (var j = 0; j < nodes.length; j += 1) {
        if (nodes[j].id === parts[i]) {
          node = nodes[j];
          break;
        }
      }
      if (!node) return state.doc.perspectives[0];
      nodes = node.children;
    }
    return node;
  }

  function ancestors(node) {
    if (!node) return [];
    var parts = node.path.split('/');
    var chain = [];
    var acc = [];
    for (var i = 0; i < parts.length; i += 1) {
      acc.push(parts[i]);
      var found = findNode(acc);
      if (found) chain.push(found);
    }
    return chain;
  }

  function renderTree(current) {
    var root = document.getElementById('tree');
    root.replaceChildren();
    if (!state.doc) return;
    state.doc.perspectives.forEach(function (perspective) {
      root.appendChild(nodeItem(perspective, current));
    });
  }

  function nodeItem(node, current) {
    var li = document.createElement('li');
    var button = document.createElement('button');
    button.type = 'button';
    button.appendChild(document.createTextNode(node.title));
    if (node.children.length) {
      var count = document.createElement('small');
      count.textContent = String(node.children.length);
      button.appendChild(count);
    }
    if (current && current.path === node.path) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', function () {
      location.hash = hashFor(node.path);
    });
    li.appendChild(button);
    if (node.children.length) {
      var ul = document.createElement('ul');
      node.children.forEach(function (child) {
        ul.appendChild(nodeItem(child, current));
      });
      li.appendChild(ul);
    }
    return li;
  }

  function renderCrumbs(node) {
    var crumbs = document.getElementById('crumbs');
    crumbs.replaceChildren();
    ancestors(node).forEach(function (item, index, all) {
      if (index) {
        var sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '/';
        crumbs.appendChild(sep);
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.title;
      if (index === all.length - 1) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', function () {
        location.hash = hashFor(item.path);
      });
      crumbs.appendChild(button);
    });
  }

  function renderCanvas(node) {
    var canvas = document.getElementById('canvas');
    var hint = document.getElementById('hint');
    var error = document.getElementById('diagram-error');
    var chips = document.getElementById('chips');
    if (state.mounted) {
      state.mounted.destroy();
      state.mounted = null;
    }
    canvas.replaceChildren();
    error.hidden = true;
    error.textContent = '';
    chips.replaceChildren();

    if (!node) {
      canvas.innerHTML = '<div class="empty-state"><h2>No architecture docs yet</h2><p>Run /pele-scan in your coding agent, then come back. Nothing is uploaded.</p></div>';
      hint.hidden = true;
      return;
    }

    node.children.forEach(function (child) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = child.title;
      chip.addEventListener('click', function () {
        location.hash = hashFor(child.path);
      });
      chips.appendChild(chip);
    });

    if (!node.fields.diagram || !String(node.fields.diagram).trim()) {
      canvas.innerHTML = '<div class="empty-state"><h2>No diagram</h2><p>This element has notes, but no diagram.mmd.</p></div>';
      hint.hidden = true;
      return;
    }

    var host = document.createElement('div');
    host.className = 'mount';
    canvas.appendChild(host);
    hint.hidden = false;
    hint.textContent = node.children.length
      ? 'Highlighted nodes and the chips below open a child diagram. Drag to pan. Ctrl-scroll to zoom.'
      : 'Drag to pan. Ctrl-scroll to zoom.';

    if (!window.pele || !window.pele.mount) {
      error.hidden = false;
      error.textContent = 'pele did not load. The viewer stays offline and will not fetch it from a CDN.';
      return;
    }

    try {
      state.mounted = window.pele.mount(host, node.fields.diagram, {
        zoom: true,
        onRender: function () { markDrill(node); },
        onError: function (err) { showDiagramError(err); },
      });
      if (state.mounted && state.mounted.error) showDiagramError(state.mounted.error);
    } catch (err) {
      showDiagramError(err);
    }
  }

  function markDrill(node) {
    var ids = {};
    node.children.forEach(function (child) { ids[child.id] = true; });
    document.querySelectorAll('#canvas .pele-node').forEach(function (shape) {
      var id = shape.getAttribute('data-id');
      if (id && ids[id]) shape.classList.add('omp-drill');
    });
  }

  function showDiagramError(err) {
    var error = document.getElementById('diagram-error');
    var message = err && err.message ? err.message : String(err);
    var line = err && err.line ? 'line ' + err.line : '';
    var column = err && err.column ? 'column ' + err.column : '';
    var where = [line, column].filter(Boolean).join(', ');
    error.hidden = false;
    error.textContent = (where ? where + '\n' : '') + message;
  }

  function renderFields(node) {
    var panel = document.getElementById('inspector');
    panel.replaceChildren();
    if (!node) return;
    var title = document.createElement('h2');
    title.textContent = node.title;
    panel.appendChild(title);
    var meta = document.createElement('p');
    meta.className = 'meta-line mono';
    var filled = FIELD_ORDER.filter(function (pair) { return node.fields[pair[0]]; }).length;
    meta.textContent = node.path + ' · ' + filled + ' of 7 fields';
    panel.appendChild(meta);

    FIELD_ORDER.forEach(function (pair) {
      var value = node.fields[pair[0]];
      if (!value || !String(value).trim()) return;
      var card = document.createElement('section');
      card.className = 'card ' + pair[0];
      var heading = document.createElement('h3');
      heading.textContent = pair[1];
      card.appendChild(heading);
      var body = document.createElement('div');
      body.innerHTML = renderMarkdown(value);
      card.appendChild(body);
      panel.appendChild(card);
    });

    if (node.fields.diagram && String(node.fields.diagram).trim()) {
      var details = document.createElement('details');
      details.className = 'source';
      var summary = document.createElement('summary');
      summary.textContent = 'Diagram source';
      var pre = document.createElement('pre');
      pre.textContent = node.fields.diagram;
      details.appendChild(summary);
      details.appendChild(pre);
      panel.appendChild(details);
    }
  }

  function renderMarkdown(src) {
    var text = escapeHtml(String(src).replace(/\r\n/g, '\n').trim());
    var fence = '```';
    return text.split(/\n{2,}/).map(function (block) {
      var lines = block.split('\n');
      if (lines.every(function (line) { return /^[-*] /.test(line); })) {
        return '<ul>' + lines.map(function (line) {
          return '<li>' + inline(line.slice(2)) + '</li>';
        }).join('') + '</ul>';
      }
      if (lines.every(function (line) { return /^\d+\. /.test(line); })) {
        return '<ol>' + lines.map(function (line) {
          return '<li>' + inline(line.replace(/^\d+\. /, '')) + '</li>';
        }).join('') + '</ol>';
      }
      if (lines[0].indexOf(fence) === 0) {
        var code = block.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '');
        return '<pre><code>' + code + '</code></pre>';
      }
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }

  function inline(value) {
    return value
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function render() {
    var node = findNode(partsFromHash());
    state.node = node;
    var project = document.getElementById('project');
    if (state.doc && project) project.textContent = state.doc.project;
    if (state.doc) document.title = 'oh-my-pele — ' + state.doc.project;
    renderTree(node);
    renderCrumbs(node);
    renderCanvas(node);
    renderFields(node);
  }

  document.getElementById('canvas').addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var shape = target.closest('.pele-node');
    if (!shape || !state.node) return;
    var id = shape.getAttribute('data-id');
    if (!id) return;
    for (var i = 0; i < state.node.children.length; i += 1) {
      if (state.node.children[i].id === id) {
        location.hash = hashFor(state.node.children[i].path);
        return;
      }
    }
  });

  document.getElementById('theme').addEventListener('click', function () {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !state.node) return;
    var parts = state.node.path.split('/');
    if (parts.length < 2) return;
    parts.pop();
    location.hash = hashFor(parts.join('/'));
  });

  window.addEventListener('hashchange', render);
  applyTheme(document.documentElement.dataset.theme || savedTheme());

  if (boot.mode === 'live') {
    var load = function () {
      return fetch('/api/doc').then(function (res) {
        if (!res.ok) throw new Error('Could not read /api/doc');
        return res.json();
      }).then(function (doc) {
        state.doc = doc;
        render();
      }).catch(function (err) {
        var error = document.getElementById('diagram-error');
        error.hidden = false;
        error.textContent = err.message || String(err);
      });
    };
    load();
    if (window.EventSource) {
      var events = new EventSource('/events');
      events.addEventListener('change', function () { load(); });
    }
  } else {
    render();
  }
})();
