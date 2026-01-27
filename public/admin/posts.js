// ===== JKZM Admin - Web Posts (Novinky) =====
// posts.js - verejné príspevky

let webPosts = [];
let webPostEditor = null;

async function loadWebPosts() {
    try {
        const json = await apiGet('public-posts');
        webPosts = json.data || [];
        renderWebPosts();
    } catch(e) {
        console.error('Load web posts error:', e);
        webPosts = [];
        renderWebPosts();
    }
}

function renderWebPosts() {
    const table = document.getElementById('webPostsTable');
    if (!table) return;
    
    if (!webPosts.length) {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray)">Žiadne príspevky</td></tr>';
        return;
    }
    
    table.innerHTML = webPosts.map(p => `
        <tr>
            <td>${new Date(p.published_at).toLocaleDateString('sk')}</td>
            <td><strong>${p.title}</strong></td>
            <td><code style="font-size:0.8rem">${p.slug}</code></td>
            <td>${p.category || 'news'}</td>
            <td><span class="badge badge-${p.is_published ? 'success' : 'gray'}">${p.is_published ? 'Publikovaný' : 'Koncept'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editWebPost('${p.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWebPost('${p.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80);
}

function openWebPostModal() {
    document.getElementById('webPostForm').reset();
    document.getElementById('webPostId').value = '';
    document.getElementById('webPostModalTitle').textContent = 'Nový príspevok';
    document.getElementById('webPostSlug').readOnly = false;
    
    // Inicializuj Quill editor ak ešte nie je
    initWebPostEditor();
    if (webPostEditor) webPostEditor.root.innerHTML = '';
    
    openModal('webPostModal');
}

function initWebPostEditor() {
    if (webPostEditor) return;
    const container = document.getElementById('webPostEditor');
    if (!container || typeof Quill === 'undefined') return;
    
    webPostEditor = new Quill('#webPostEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['link'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['clean']
            ]
        }
    });
}

async function editWebPost(id) {
    const p = webPosts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('webPostId').value = p.id;
    document.getElementById('webPostTitle').value = p.title || '';
    document.getElementById('webPostSlug').value = p.slug || '';
    document.getElementById('webPostSlug').readOnly = true; // Slug sa pri edit nemení
    document.getElementById('webPostCategory').value = p.category || 'news';
    document.getElementById('webPostExcerpt').value = p.excerpt || '';
    document.getElementById('webPostCover').value = p.cover_url || '';
    document.getElementById('webPostPublished').value = p.is_published ? 'true' : 'false';
    
    initWebPostEditor();
    if (webPostEditor) webPostEditor.root.innerHTML = p.body || '';
    
    document.getElementById('webPostModalTitle').textContent = 'Upraviť príspevok';
    openModal('webPostModal');
}

async function checkSlugAvailable(slug) {
    if (!slug) return false;
    try {
        const res = await apiGet(`public-posts/slug-available?slug=${encodeURIComponent(slug)}`);
        return res.available === true;
    } catch(e) {
        return true; // Ak endpoint neexistuje, predpokladáme že je OK
    }
}

async function saveWebPost() {
    const id = document.getElementById('webPostId').value;
    const title = document.getElementById('webPostTitle').value;
    let slug = document.getElementById('webPostSlug').value;
    
    if (!title) {
        showToast('Názov je povinný', 'error');
        return;
    }
    
    // Pre nový post generuj slug ak nie je zadaný
    if (!id && !slug) {
        slug = slugify(title);
    }
    
    const data = {
        title,
        category: document.getElementById('webPostCategory').value,
        excerpt: document.getElementById('webPostExcerpt').value || null,
        body: webPostEditor ? webPostEditor.root.innerHTML : null,
        cover_url: document.getElementById('webPostCover').value || null,
        is_published: document.getElementById('webPostPublished').value === 'true'
    };
    
    // Slug pridaj len pri create
    if (!id) {
        data.slug = slug;
    }
    
    try {
        if (id) {
            await apiPatch(`public-posts/${id}`, data);
        } else {
            await apiPost('public-posts', data);
        }
        closeModal('webPostModal');
        showToast(id ? 'Príspevok upravený' : 'Príspevok vytvorený', 'success');
        loadWebPosts();
    } catch(e) {
        showToast('Chyba: ' + e.message, 'error');
    }
}

async function deleteWebPost(id) {
    if (!confirm('Naozaj zmazať príspevok?')) return;
    try {
        await apiDelete(`public-posts/${id}`);
        showToast('Príspevok zmazaný', 'success');
        loadWebPosts();
    } catch(e) {
        showToast('Chyba', 'error');
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadWebPosts = loadWebPosts;
    window.renderWebPosts = renderWebPosts;
    window.openWebPostModal = openWebPostModal;
    window.editWebPost = editWebPost;
    window.saveWebPost = saveWebPost;
    window.deleteWebPost = deleteWebPost;
    window.checkSlugAvailable = checkSlugAvailable;
}
