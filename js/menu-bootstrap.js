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
            'system': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/></svg>',
            'network': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            'services': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
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

            // Check active children
            let hasActiveChild = false;
            if (hasSubmenu) {
                submenuChildren.forEach(subchild => {
                    // Check index baseIndex + 1
                    if (dispatchPath.length > baseIndex + 1 && dispatchPath[baseIndex + 1] === subchild.name) {
                        hasActiveChild = true;
                    }
                });
            }

            // Consistency check: isActive and hasActiveChild
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
                    const subIsActive = dispatchPath.length > subIndex && dispatchPath[subIndex] === subchild.name;

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