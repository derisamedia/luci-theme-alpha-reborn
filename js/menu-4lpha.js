'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
    __init__() {
        // Ensure ui.menu is available before loading
        if (ui && ui.menu && typeof ui.menu.load === 'function') {
            ui.menu.load().then(L.bind(this.render, this)).catch(function (err) {
                console.error('Failed to load menu:', err);
            });
        } else {
            console.warn('LuCI menu system not available');
        }
    },

    render(tree) {
        let node = tree;
        let url = '';

        // Render mode menu (breadcrumb in footer)
        this.renderModeMenu(tree);

        // Render sidebar menu (main navigation in sidebar)
        this.renderSidebarMenu(tree);

        // Render tab menu if needed
        if (L.env.dispatchpath.length >= 3) {
            for (var i = 0; i < 3 && node; i++) {
                node = node.children[L.env.dispatchpath[i]];
                url = url + (url ? '/' : '') + L.env.dispatchpath[i];
            }

            if (node)
                this.renderTabMenu(node, url);
        }

        // Update page subtitle with current page title
        this.updatePageSubtitle(tree);

        // Render Mobile Bottom Navbar
        this.renderMobileBottomNav(tree);
    },

    renderMobileBottomNav(tree) {
        // Remove existing if any (re-render safety)
        const existing = document.querySelector('.mobile-bottom-nav');
        if (existing) existing.remove();

        const existingModal = document.querySelector('#mobile-nav-config-modal');
        if (existingModal) existingModal.remove();

        // --- Configuration Logic ---
        const LS_KEY = 'alpha_mobile_nav_config';
        const defaultIconMap = {
            'status': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
            'system': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
            'network': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            'services': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'modem': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/></svg>',
            'docker': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M7 7h.01M17 7h.01M17 17h.01M7 17h.01"/></svg>',
            'control': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
            'nas': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
            'vpn': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
            'logout': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
            'default': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
        };

        // Helper to generate default config from tree
        const generateDefaultConfig = () => {
            let items = ui.menu.getChildren(tree);
            let pPath = '';
            if (items.length === 1) {
                pPath = items[0].name;
                items = ui.menu.getChildren(items[0]);
            }

            const priorities = ['status', 'system', 'services', 'network'];
            const result = [];

            // 1. Add prioritized items if they exist
            priorities.forEach(name => {
                const found = items.find(i => i.name === name);
                if (found) {
                    result.push({
                        name: found.name,
                        title: found.title,
                        url: pPath ? L.url(pPath, found.name) : L.url(found.name),
                        icon: defaultIconMap[found.name] || defaultIconMap['default']
                    });
                }
            });

            // 2. Add Logout Manually
            result.push({
                name: 'logout',
                title: 'Logout',
                url: L.url('admin/logout'),
                icon: defaultIconMap['logout']
            });

            return result;
        };

        // Load or Init
        let savedConfig = localStorage.getItem(LS_KEY);
        let config = savedConfig ? JSON.parse(savedConfig) : generateDefaultConfig();

        // 3. Render Navbar from Config
        const nav = E('div', { 'class': 'mobile-bottom-nav' });

        // Add Toggle Button at the top (for desktop vertical mode)
        const toggleBtn = E('button', {
            'class': 'mobile-nav-toggle',
            'aria-label': 'Toggle Navigation'
        });
        toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';

        // Toggle functionality
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nav.classList.toggle('collapsed');

            // Save state to localStorage
            const isCollapsed = nav.classList.contains('collapsed');
            localStorage.setItem('alpha_nav_collapsed', isCollapsed ? 'true' : 'false');
        });

        nav.appendChild(toggleBtn);

        // Restore collapsed state from localStorage
        const savedCollapsed = localStorage.getItem('alpha_nav_collapsed');
        if (savedCollapsed === 'true') {
            nav.classList.add('collapsed');
        }

        config.forEach(item => {
            const link = E('a', {
                'class': 'mobile-nav-item',
                'href': item.url
            });

            // Logic: if icon starts with <svg, render as HTML. else as img
            if (item.icon && item.icon.trim().startsWith('<svg')) {
                link.innerHTML = item.icon;
            } else {
                link.innerHTML = '<img src="' + item.icon + '" alt="icon" style="width:24px;height:24px;object-fit:contain;">';
            }

            nav.appendChild(link);
        });

        // 4. Add "Edit" Trigger
        const editBtn = E('button', { 'class': 'mobile-nav-item mobile-nav-edit-trigger' });
        editBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openConfigModal();
        });

        nav.appendChild(editBtn);
        document.body.appendChild(nav);

        // --- Modal Logic ---
        function openConfigModal() {
            // Local state for editing
            let editConfig = JSON.parse(JSON.stringify(config));

            // Create Modal DOM
            const modal = E('div', { 'class': 'nav-config-modal', 'id': 'mobile-nav-config-modal' }, [
                E('div', { 'class': 'nav-config-card' }, [
                    E('div', { 'class': 'nav-config-header' }, [
                        E('h3', { 'class': 'nav-config-title' }, [_('Customize Navbar')]),
                        E('button', { 'class': 'nav-config-close', 'click': closeConfigModal }, ['✕'])
                    ]),
                    E('div', { 'class': 'nav-config-body' }, []), // Rows injected here
                    E('div', { 'class': 'nav-config-actions' }, [
                        (function () {
                            const btn = E('button', {
                                'class': 'btn-add',
                                'style': 'background:#e0f2fe; color:#0369a1; border:none; border-radius:4px; padding:8px 16px; font-weight:600; font-size:14px; display:flex; align-items:center; gap:8px; cursor:pointer;',
                                'click': addItem
                            });
                            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Item';
                            return btn;
                        })(),
                        E('div', { 'class': 'spacer', 'style': 'flex:1' }, []),
                        E('button', { 'class': 'btn-reset', 'click': resetConfig }, [_('Reset')]),
                        E('button', { 'class': 'btn-save', 'click': saveConfig }, [_('Save')])
                    ])
                ])
            ]);

            const body = modal.querySelector('.nav-config-body');

            function renderRows() {
                body.innerHTML = '';
                editConfig.forEach((item, idx) => {
                    const row = E('div', { 'class': 'nav-item-editor' }, [
                        E('div', { 'class': 'form-group' }, [
                            E('label', {}, ['Title']),
                            E('input', { 'type': 'text', 'class': 'form-control', 'value': item.title || '', 'change': (e) => item.title = e.target.value })
                        ]),
                        E('div', { 'class': 'form-group' }, [
                            E('label', {}, ['URL']),
                            E('input', { 'type': 'text', 'class': 'form-control', 'value': item.url || '#', 'change': (e) => item.url = e.target.value })
                        ]),
                        E('div', { 'class': 'form-group' }, [
                            E('label', {}, ['Icon']),
                            E('input', { 'type': 'text', 'class': 'form-control', 'placeholder': 'SVG or URL', 'value': (item.icon && item.icon.startsWith('<svg')) ? 'SVG Icon' : item.icon, 'disabled': true }),
                            E('input', {
                                'type': 'file', 'accept': 'image/*', 'style': 'margin-top:5px', 'change': (e) => {
                                    if (e.target.files[0]) {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                            item.icon = evt.target.result;
                                            renderRows(); // Re-render to show update (optional, or just update state)
                                        };
                                        reader.readAsDataURL(e.target.files[0]);
                                    }
                                }
                            })
                        ]),
                        (function () {
                            const btn = E('button', {
                                'class': 'btn-delete',
                                'style': 'background:#ef4444; color:white; border:none; border-radius:4px; padding:0; height:38px; width:38px; min-width:38px; display:flex; align-items:center; justify-content:center; margin-top:24px; cursor:pointer;',
                                'title': 'Remove Item',
                                'click': () => {
                                    editConfig.splice(idx, 1);
                                    renderRows();
                                }
                            });
                            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
                            return btn;
                        })()
                    ]);
                    body.appendChild(row);
                });
            }

            function addItem() {
                editConfig.push({
                    title: 'New Item',
                    url: '/cgi-bin/luci/admin/',
                    icon: defaultIconMap['default']
                });
                renderRows();
            }

            function saveConfig() {
                config = editConfig;
                localStorage.setItem(LS_KEY, JSON.stringify(config));
                closeConfigModal();
                self.renderMobileBottomNav(tree);
            }

            function resetConfig() {
                if (confirm(_('Reset to default 5 items?'))) {
                    localStorage.removeItem(LS_KEY);
                    config = generateDefaultConfig();
                    closeConfigModal();
                    self.renderMobileBottomNav(tree);
                }
            }

            renderRows();
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('open'), 10);
        }

        function closeConfigModal() {
            const modal = document.querySelector('#mobile-nav-config-modal');
            if (modal) {
                modal.classList.remove('open');
                setTimeout(() => modal.remove(), 300);
            }
        }
    },

    renderTabMenu(tree, url, level) {
        const container = document.querySelector('#tabmenu');
        const ul = E('ul', { 'class': 'tabs' });
        const children = ui.menu.getChildren(tree);
        let activeNode = null;

        children.forEach(child => {
            const isActive = (L.env.dispatchpath[3 + (level || 0)] == child.name);
            const activeClass = isActive ? ' active' : '';
            const className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

            ul.appendChild(E('li', { 'class': className }, [
                E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
            ]));

            if (isActive)
                activeNode = child;
        });

        if (ul.children.length == 0)
            return E([]);

        container.appendChild(ul);
        container.style.display = '';

        if (activeNode)
            this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

        return ul;
    },

    renderMainMenu(tree, url, level) {
        const ul = level ? E('ul', { 'class': 'dropdown-menu' }) : document.querySelector('#topmenu');
        const children = ui.menu.getChildren(tree);

        // If topmenu doesn't exist (new sidebar layout), skip rendering
        if (!ul && !level) {
            return E([]);
        }

        if (children.length == 0 || level > 1)
            return E([]);

        children.forEach(child => {
            const submenu = this.renderMainMenu(child, url + '/' + child.name, (level || 0) + 1);
            const subclass = (!level && submenu.firstElementChild) ? 'dropdown' : '';
            const linkclass = (!level && submenu.firstElementChild) ? 'menu' : '';
            const linkurl = submenu.firstElementChild ? '#' : L.url(url, child.name);

            const li = E('li', { 'class': subclass }, [
                E('a', { 'class': linkclass, 'href': linkurl }, [_(child.title)]),
                submenu
            ]);

            if (ul) {
                ul.appendChild(li);
            }
        });

        if (ul) {
            ul.style.display = '';
        }
        return ul || E([]);
    },

    renderSidebarMenu(tree) {
        const sidebarMenu = document.querySelector('#sidebar-menu');
        if (!sidebarMenu) {
            console.warn('Sidebar menu element (#sidebar-menu) not found');
            return;
        }

        // Get the active top-level menu (usually 'admin')
        // We want to render its children (Status, System, Services, Network)
        // not the 'admin' item itself
        let menuItems = ui.menu.getChildren(tree);
        let parentPath = ''; // Store parent path for URL generation

        // If we only have one top-level item (like 'admin'), use its children instead
        if (menuItems.length === 1) {
            const topItem = menuItems[0];
            parentPath = topItem.name; // Store 'admin' as parent path

            menuItems = ui.menu.getChildren(topItem);
        }

        if (!menuItems || menuItems.length === 0) {
            console.warn('No menu items found');
            return;
        }

        // Determine base index: 1 if we have parentPath (skipped admin), else 0
        const baseIndex = parentPath ? 1 : 0;
        const requestPath = L.env.requestpath;
        const dispatchPath = L.env.dispatchpath;



        // Icon mapping for menu items
        const iconMap = {
            'status': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
            'system': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
            'network': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            'services': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'modem': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/></svg>',
            'docker': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M7 7h.01M17 7h.01M17 17h.01M7 17h.01"/></svg>',
            'control': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
            'nas': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
            'vpn': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
            'logout': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
            'default': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
        };

        menuItems.forEach((child, index) => {
            // Check if this main menu item is active
            const isActive = requestPath.length > baseIndex ? child.name === requestPath[baseIndex] : (requestPath.length === 0 && index === 0);
            const icon = iconMap[child.name] || iconMap['default'];

            // Create icon span
            const iconSpan = E('span', { 'class': 'sidebar-nav-icon' });
            iconSpan.innerHTML = icon;

            // Check submenu
            const submenuChildren = ui.menu.getChildren(child);
            const hasSubmenu = submenuChildren.length > 0;

            // Check if this main menu item matches the current path component
            const isCurrentPath = dispatchPath.length > baseIndex && dispatchPath[baseIndex] === child.name;

            // Check active children
            let hasActiveChild = false;
            if (hasSubmenu && isCurrentPath) {
                submenuChildren.forEach(subchild => {
                    // Check index baseIndex + 1
                    if (dispatchPath.length > baseIndex + 1 && dispatchPath[baseIndex + 1] === subchild.name) {
                        hasActiveChild = true;
                    }
                });
            }

            // Consistency check: isActive and hasActiveChild
            // We expand if we are on this path (isCurrentPath) and have active children, or if we are the leaf active item
            const shouldExpand = isActive || hasActiveChild;

            const link = E('a', {
                'class': 'sidebar-nav-link' + (isActive ? ' active' : '') + (hasSubmenu ? ' has-submenu' : ''),
                'href': hasSubmenu ? '#' : (parentPath ? L.url(parentPath, child.name) : L.url(child.name))
            }, [
                iconSpan,
                _(child.title)
            ]);

            const li = E('li', { 'class': 'sidebar-nav-item' }, [link]);

            // Add submenu if exists
            if (hasSubmenu) {
                // Determine expansion state

                // Use 'expanded' class instead of inline style for animation
                const submenu = E('ul', {
                    'class': 'sidebar-submenu' + (shouldExpand ? ' expanded' : '')
                });

                submenuChildren.forEach(subchild => {
                    const subIndex = baseIndex + 1;
                    // Only mark child active if parent is also on the current path
                    const subIsActive = isCurrentPath && (dispatchPath.length > subIndex && dispatchPath[subIndex] === subchild.name);

                    // Build proper URL with parent path
                    const submenuUrl = parentPath ? L.url(parentPath, child.name, subchild.name) : L.url(child.name, subchild.name);

                    const subli = E('li', { 'class': 'sidebar-submenu-item' }, [
                        E('a', {
                            'class': 'sidebar-submenu-link' + (subIsActive ? ' active' : ''),
                            'href': submenuUrl
                        }, [_(subchild.title)])
                    ]);
                    submenu.appendChild(subli);
                });

                li.appendChild(submenu);

                // Add toggle functionality with accordion behavior
                link.addEventListener('click', function (e) {
                    if (submenuChildren.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();

                        const wasExpanded = submenu.classList.contains('expanded');


                        if (wasExpanded) {
                            // Closing
                            submenu.classList.remove('expanded');
                            link.classList.remove('active');
                        } else {
                            // Opening
                            // Close ALL others first (Safety: select all, not just expanded)
                            const allSubmenus = document.querySelectorAll('.sidebar-submenu');
                            const allParentLinks = document.querySelectorAll('.sidebar-nav-link.has-submenu');

                            allSubmenus.forEach(el => el.classList.remove('expanded'));
                            allParentLinks.forEach(el => el.classList.remove('active'));

                            // Open this one
                            submenu.classList.add('expanded');
                            link.classList.add('active');
                        }
                    }
                });
            }

            sidebarMenu.appendChild(li);
        });


    },

    renderModeMenu(tree) {
        const ul = document.querySelector('#modemenu');
        const children = ui.menu.getChildren(tree);

        children.forEach((child, index) => {
            const isActive = L.env.requestpath.length ? child.name === L.env.requestpath[0] : index === 0;

            ul.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
                E('a', { 'href': L.url(child.name) }, [_(child.title)])
            ]));

            if (isActive)
                this.renderMainMenu(child, child.name);
        });

        if (ul.children.length > 1)
            ul.style.display = '';
    },

    updatePageSubtitle(tree) {
        const subtitle = document.querySelector('#page-subtitle');
        if (!subtitle) return;

        // Navigate to current page node
        let node = tree;
        let title = '';

        // Try to follow dispatch path
        if (L.env.dispatchpath.length > 0) {
            for (var i = 0; i < L.env.dispatchpath.length; i++) {
                const pathItem = L.env.dispatchpath[i];
                if (node.children && node.children[pathItem]) {
                    node = node.children[pathItem];
                    // Keep updating title as we go deeper
                    if (node.title) {
                        title = node.title;
                    }
                } else {
                    break;
                }
            }
        }

        // Update subtitle if we found a title
        if (title) {
            subtitle.textContent = _(title);

        } else {
            console.warn('Could not find active page title');
        }

        // Initialize interactions (mobile toggle, indicators)
        this.initInteractions();

        // Initialize typewriter effect
        this.initTypewriter();
    },

    initInteractions() {
        const toggleBtn = document.querySelector('#mobile-menu-toggle');
        const sidebar = document.querySelector('#sidebar');

        // Mobile Menu Logic
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.toggle('open');

            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                        sidebar.classList.remove('open');
                    }
                }
            });
        }

        // Poll Status functionality
        const pollIndicator = document.querySelector('[data-indicator="poll-status"]');
        if (pollIndicator) {
            pollIndicator.addEventListener('click', function () {
                if (window.L && L.Request && L.Request.poll) {
                    if (L.Request.poll.active()) {
                        L.Request.poll.stop();
                        pollIndicator.textContent = 'Paused';
                        pollIndicator.removeAttribute('data-style');
                        pollIndicator.style.opacity = '0.7';
                    } else {
                        L.Request.poll.start();
                        pollIndicator.textContent = 'Refreshing';
                        pollIndicator.setAttribute('data-style', 'active');
                        pollIndicator.style.opacity = '1';
                    }
                }
            });

            // Initial state check
            if (window.L && L.Request && L.Request.poll && L.Request.poll.active()) {
                pollIndicator.setAttribute('data-style', 'active');
            }
        }
    },

    initTypewriter() {
        const target = document.getElementById('typewriter-text');
        if (!target || !window.boardInfoConfig) return;

        const text = 'Hello! ' + (window.boardInfoConfig.hostname || 'User');
        let charIndex = 0;
        let typeSpeed = 100;

        const type = () => {
            target.textContent = text.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex < text.length) {
                setTimeout(type, typeSpeed);
            }
        };

        // Start typing
        type();
    },

    initToastSystem() {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const transformAndMove = (node) => {
            // Validation: Must be an element, an alert-message, and not already processed/in-container
            if (node.nodeType === 1 && node.classList.contains('alert-message') && !node.classList.contains('processed-toast')) {

                // Mark as processed immediately
                node.classList.add('processed-toast');

                // 1. Create New Toast Wrapper
                const toast = document.createElement('div');
                toast.className = 'toast-notification';

                // Map classes
                if (node.classList.contains('warning')) toast.classList.add('warning');
                else if (node.classList.contains('success')) toast.classList.add('success');
                else if (node.classList.contains('error') || node.classList.contains('danger')) toast.classList.add('error');
                else if (node.classList.contains('notice')) toast.classList.add('success');

                // 2. Extract Content
                let titleText = 'Notification';
                let messageContent = '';

                // H4 handling
                const h4 = node.querySelector('h4');
                if (h4) {
                    titleText = h4.textContent;
                    // Don't remove h4 from original node to preserve it if we ever unhide, just clone content
                }

                // Get message (ignoring h4)
                const clone = node.cloneNode(true);
                const cloneH4 = clone.querySelector('h4');
                if (cloneH4) cloneH4.remove();

                // Remove existing close buttons from content if any
                const existingClose = clone.querySelector('.close');
                if (existingClose) existingClose.remove();

                messageContent = clone.innerHTML.trim();

                // 3. Build Toast Structure
                const header = document.createElement('div');
                header.className = 'toast-header';

                const titleEl = document.createElement('h4');
                titleEl.className = 'toast-title';
                titleEl.textContent = titleText;

                const closeBtn = document.createElement('button');
                closeBtn.className = 'toast-close';
                closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
                closeBtn.onclick = function () {
                    const t = this.closest('.toast-notification');
                    t.classList.add('fade-out');
                    t.addEventListener('animationend', () => t.remove());
                };

                header.appendChild(titleEl);
                header.appendChild(closeBtn);

                const body = document.createElement('div');
                body.className = 'toast-message';
                body.innerHTML = messageContent;

                toast.appendChild(header);
                toast.appendChild(body);

                // 4. Deploy
                // Hide original strongly
                node.style.setProperty('display', 'none', 'important');
                container.appendChild(toast);
            }
        };

        // Check existing alerts
        document.querySelectorAll('.alert-message').forEach(transformAndMove);

        // Watch for new alerts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.classList.contains('alert-message')) {
                            transformAndMove(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('.alert-message').forEach(transformAndMove);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });


    }
});
