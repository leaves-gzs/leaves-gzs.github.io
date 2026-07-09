let allData = [], filteredData = [], currentPage = 1;
const pageSize = 20;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function init() {
    if (typeof APP_DATA === 'undefined') {
        $('tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">⚠️ 数据加载中...</td></tr>';
        return;
    }
    allData = APP_DATA;
    filteredData = [...allData];
    updateStats();
    renderTable();
    renderPagination();
    $('#searchBtn').addEventListener('click', applyFilters);
    $('#resetBtn').addEventListener('click', resetFilters);
    $('#searchInput').addEventListener('keyup', e => { if (e.key === 'Enter') applyFilters(); });
    $('#closeModal').addEventListener('click', () => $('#detailModal').classList.remove('show'));
    $('#detailModal').addEventListener('click', e => { if (e.target === $('#detailModal')) $('#detailModal').classList.remove('show'); });
}

function updateStats() {
    const total = allData.length;
    const totalAC = allData.reduce((s, u) => s + u.totalAC, 0);
    $('#totalUsers').textContent = total;
    $('#totalAC').textContent = totalAC;
    $('#avgAC').textContent = total > 0 ? Math.round(totalAC / total) : 0;
    $('#todayActive').textContent = allData.filter(u => u.totalAC > 0).length;
}

function applyFilters() {
    const kw = $('#searchInput').value.trim().toLowerCase();
    filteredData = allData.filter(u => !kw || u.name.includes(kw));
    currentPage = 1;
    renderTable();
    renderPagination();
}

function resetFilters() {
    $('#searchInput').value = '';
    $('#startDate').value = '';
    $('#endDate').value = '';
    filteredData = [...allData];
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const pageData = filteredData.slice(start, start + pageSize);
    if (!pageData.length) {
        $('#tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">📭 暂无数据</td></tr>';
        return;
    }
    let html = '';
    pageData.forEach((u, i) => {
        const rank = start + i + 1;
        let cls = 'rank';
        if (rank === 1) cls += ' rank-1';
        else if (rank === 2) cls += ' rank-2';
        else if (rank === 3) cls += ' rank-3';
        html += `<tr><td class="${cls}">#${rank}</td><td class="name">${u.name}</td><td class="ac-count">${u.totalAC}</td>`;
        html += `<td>${renderDifficulty(u.difficultyStats)}</td><td>${renderHeatmap(u.heatmap)}</td>`;
        html += `<td><button class="btn-detail" data-name="${u.name}" data-uid="${u.uid}">📋 详情</button></td></tr>`;
    });
    $('#tableBody').innerHTML = html;
    $$('.btn-detail').forEach(b => b.addEventListener('click', function() {
        showDetail(this.dataset.name, this.dataset.uid);
    }));
}

function renderDifficulty(stats) {
    if (!stats || !Object.keys(stats).length) return '<span style="color:#999;">暂无</span>';
    const colors = ['#22c55e','#3b82f6','#eab308','#f97316','#ef4444'];
    const levels = ['入门','普及-','普及/提高-','普及+/提高','提高+/省选-'];
    const total = Object.values(stats).reduce((a,b) => a + b, 0);
    let bars = '';
    levels.forEach((l, i) => {
        const p = total > 0 ? ((stats[l] || 0) / total * 100) : 0;
        bars += `<div class="difficulty-bar" style="width:${Math.max(p,2)}%;background:${colors[i]};" title="${l}: ${stats[l]||0}题"></div>`;
    });
    return `<div class="difficulty-chart">${bars}</div>`;
}

function renderHeatmap(hm) {
    if (!hm || !hm.length) return '<span style="color:#999;">暂无</span>';
    const max = Math.max(...hm.map(h => h.count), 1);
    let html = '<div class="heatmap">';
    hm.forEach(h => {
        const p = Math.round(h.count / max * 100);
        const c = p === 0 ? '#e8ecf1' : p < 25 ? '#c6e48b' : p < 50 ? '#7bc96f' : p < 75 ? '#239a3b' : '#196127';
        html += `<div class="heatmap-cell" style="background:${c};" title="${h.day}: ${h.count}">${h.count || ''}</div>`;
    });
    return html + '</div>';
}

function renderPagination() {
    const total = Math.ceil(filteredData.length / pageSize);
    if (total <= 1) { $('#pagination').innerHTML = ''; return; }
    let html = `<button ${currentPage===1?'disabled':''} onclick="goTo(${currentPage-1})">‹</button>`;
    for (let i = 1; i <= total; i++) {
        if (i === currentPage) html += `<button class="active">${i}</button>`;
        else if (i <= 3 || i > total - 3 || Math.abs(i - currentPage) <= 1) html += `<button onclick="goTo(${i})">${i}</button>`;
        else if (i === 4 || i === total - 3) html += `<button disabled>…</button>`;
    }
    html += `<button ${currentPage===total?'disabled':''} onclick="goTo(${currentPage+1})">›</button>`;
    $('#pagination').innerHTML = html;
}

function goTo(page) {
    const total = Math.ceil(filteredData.length / pageSize);
    if (page < 1 || page > total) return;
    currentPage = page;
    renderTable();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goTo = goTo;

function showDetail(name, uid) {
    const u = allData.find(x => x.name === name && x.uid === uid);
    if (!u) { $('#modalBody').innerHTML = '<p style="color:#999;">未找到数据</p>'; } else {
        $('#modalTitle').textContent = `📋 ${u.name} 的AC题目详情`;
        let html = `<div style="margin-bottom:16px;"><strong>AC总数：</strong>${u.totalAC} 题 <span style="margin-left:20px;"><strong>UID：</strong>${u.uid}</span></div>`;
        if (u.acProblems && u.acProblems.length) {
            html += '<div class="problem-list">';
            u.acProblems.forEach(p => html += `<span class="problem-tag">#${p}</span>`);
            html += '</div>';
        } else html += '<p style="color:#999;">暂无AC记录</p>';
        $('#modalBody').innerHTML = html;
    }
    $('#detailModal').classList.add('show');
}

document.addEventListener('DOMContentLoaded', init);
