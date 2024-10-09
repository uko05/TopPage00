const toggleButton = document.getElementById('toggle-button');
const sidebar = document.getElementById('sidebar');
const parentNode = document.querySelector('.parent-node');
const childNodes = document.querySelector('.child-nodes');

toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('hidden'); // hiddenクラスを切り替え
    const isExpanded = !sidebar.classList.contains('hidden');
    toggleButton.setAttribute('aria-expanded', isExpanded);
    toggleButton.setAttribute('aria-label', isExpanded ? 'メニューを閉じる' : 'メニューを開く');
});

parentNode.addEventListener('click', (event) => {
    event.preventDefault(); // デフォルトのリンク動作を防止
    childNodes.classList.toggle('active'); // 子ノードの表示・非表示を切り替え
    const isActive = childNodes.classList.contains('active');
    parentNode.textContent = `${isActive ? '▼' : '▶'} 推しキャラランキング`; // テキストを更新
});
