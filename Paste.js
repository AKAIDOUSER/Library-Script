// BOOKMARKLET: MENU FLUTUANTE COM DIGITAÇÃO E PASTE
(function() {
    'use strict';

    // ===============================
    // REMOVER MENU ANTERIOR SE EXISTIR
    // ===============================
    const menuExistente = document.getElementById('floating-menu-container');
    if (menuExistente) {
        menuExistente.remove();
    }

    // ===============================
    // FORÇAR COPY/PASTE (sempre ativo)
    // ===============================
    const forceEnableCopyPaste = (e) => {
        e.stopImmediatePropagation();
        return true;
    };

    ['paste', 'copy', 'cut', 'contextmenu'].forEach(event => {
        document.addEventListener(event, forceEnableCopyPaste, true);
    });

    // ===============================
    // ESTADO GLOBAL DO DIGITADOR
    // ===============================
    const NS = '__digitadorV2__';
    if (window[NS]) {
        try {
            if (window[NS].listenerInstalado && window[NS].onDocClick) {
                document.removeEventListener('click', window[NS].onDocClick, true);
            }
            if (window[NS].typingTimeoutId) clearTimeout(window[NS].typingTimeoutId);
        } catch (_) {}
    }

    window[NS] = {
        aguardandoCampo: false,
        listenerInstalado: false,
        onDocClick: null,
        typingTimeoutId: null,
        paused: false,
        currentElement: null,
        currentText: '',
        currentIndex: 0,
        currentSpeed: 40,
        textoPendente: null,
        modo: 'titulo',
        modoDigitacao: 'caractere'
    };

    // ===============================
    // FUNÇÕES DE INSERÇÃO DE CARACTERES
    // ===============================
    function inserirCharEmInput(el, ch) {
        try {
            let pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
            if (typeof el.setRangeText === 'function') {
                el.setRangeText(ch, pos, pos, 'end');
            } else {
                const v = el.value || '';
                const before = v.slice(0, pos);
                const after = v.slice(pos);
                el.value = before + ch + after;
                const newPos = pos + ch.length;
                try { el.setSelectionRange(newPos, newPos); } catch (_) {}
            }
        } catch (err) {
            el.value = (el.value || '') + ch;
        }
    }

    function inserirCharEmContentEditable(el, ch) {
        try {
            const doc = el.ownerDocument || document;
            const sel = doc.getSelection ? doc.getSelection() : null;
            let range;
            if (sel && sel.rangeCount) {
                range = sel.getRangeAt(0).cloneRange();
                if (!el.contains(range.commonAncestorContainer)) {
                    range = null;
                }
            }
            if (!range) {
                range = doc.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
            }
            const txtNode = doc.createTextNode(ch);
            range.insertNode(txtNode);
            range.setStartAfter(txtNode);
            range.collapse(true);
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (err) {
            el.innerText = (el.innerText || '') + ch;
        }
    }

    function inserirBlocoEmInput(el, bloco) {
        try {
            const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
            const valor = el.value || '';
            el.value = valor.slice(0, pos) + bloco + valor.slice(pos);
            const newPos = pos + bloco.length;
            try { el.setSelectionRange(newPos, newPos); } catch (_) {}
        } catch (err) {
            el.value = (el.value || '') + bloco;
        }
    }

    function inserirBlocoEmContentEditable(el, bloco) {
        try {
            const doc = el.ownerDocument || document;
            const sel = doc.getSelection ? doc.getSelection() : null;
            let range;
            if (sel && sel.rangeCount) {
                range = sel.getRangeAt(0).cloneRange();
                if (!el.contains(range.commonAncestorContainer)) {
                    range = null;
                }
            }
            if (!range) {
                range = doc.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
            }
            const txtNode = doc.createTextNode(bloco);
            range.insertNode(txtNode);
            range.setStartAfter(txtNode);
            range.collapse(true);
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (err) {
            el.innerText = (el.innerText || '') + bloco;
        }
    }

    // ===============================
    // FUNÇÃO PARA COLAR TEXTO SUPER RÁPIDO
    // ===============================
    function colarTextoSuperRapido(el, texto, callback) {
        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        let prevReadOnly = null;
        try {
            if (isInputEl) {
                prevReadOnly = el.readOnly;
                el.readOnly = true;
                try { el.focus({ preventScroll: true }); } catch (_) { try { el.focus(); } catch (_) {} }
            }
        } catch (_) {}

        // INSERE O TEXTO TODO DE UMA VEZ
        if (isInputEl) {
            const pos = el.selectionStart || el.value.length;
            const valor = el.value || '';
            el.value = valor.slice(0, pos) + texto + valor.slice(pos);
            const newPos = pos + texto.length;
            try { el.setSelectionRange(newPos, newPos); } catch (_) {}
        } else if (isContentEditable) {
            try {
                const doc = el.ownerDocument || document;
                const sel = doc.getSelection ? doc.getSelection() : null;
                let range;
                if (sel && sel.rangeCount) {
                    range = sel.getRangeAt(0).cloneRange();
                    if (!el.contains(range.commonAncestorContainer)) {
                        range = null;
                    }
                }
                if (!range) {
                    range = doc.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                }
                const txtNode = doc.createTextNode(texto);
                range.insertNode(txtNode);
                range.setStartAfter(txtNode);
                range.collapse(true);
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } catch (err) {
                el.innerText = (el.innerText || '') + texto;
            }
        } else {
            try {
                el.innerText = (el.innerText || '') + texto;
            } catch (_) {}
        }

        // DISPARA EVENTOS INPUT PARA CADA CARACTERE
        let index = 0;
        const totalChars = texto.length;

        function dispararProximoEvento() {
            if (index < totalChars) {
                try {
                    const event = new Event('input', { bubbles: true });
                    event.data = texto[index];
                    el.dispatchEvent(event);
                } catch (_) {}
                index++;
                setTimeout(dispararProximoEvento, 1);
            } else {
                try {
                    if (isInputEl) {
                        try { el.blur(); } catch (_) {}
                        if (prevReadOnly !== null) {
                            try { el.readOnly = prevReadOnly; } catch (_) {}
                        } else {
                            try { el.readOnly = false; } catch (_) {}
                        }
                    }
                } catch (_) {}
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
                if (callback) callback();
            }
        }

        dispararProximoEvento();
    }

    // ===============================
    // FUNÇÃO DE DIGITAÇÃO NORMAL
    // ===============================
    function iniciarDigitacao(el, texto, velocidade, callback) {
        if (window[NS].typingTimeoutId) {
            clearTimeout(window[NS].typingTimeoutId);
            window[NS].typingTimeoutId = null;
        }

        window[NS].currentElement = el;
        window[NS].currentText = texto;
        window[NS].currentIndex = 0;
        window[NS].currentSpeed = velocidade;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        let prevReadOnly = null;
        try {
            if (isInputEl) {
                prevReadOnly = el.readOnly;
                el.readOnly = true;
                try { el.focus({ preventScroll: true }); } catch (_) { try { el.focus(); } catch (_) {} }
                try {
                    const len = el.value ? el.value.length : 0;
                    el.setSelectionRange(len, len);
                } catch (_) {}
            }
        } catch (_) {}

        let i = 0;

        function obterProximoIntervalo() {
            if (velocidade === 'humana') {
                if (i > 0 && Math.random() < 0.05) {
                    return 500 + Math.random() * 1000;
                }
                return 100 + Math.random() * 200;
            } else {
                return parseInt(velocidade, 10) || 40;
            }
        }

        function digitarProximoCaractere() {
            if (window[NS].paused) return;

            if (i < texto.length) {
                const c = texto[i++];
                if (isInputEl) {
                    inserirCharEmInput(el, c);
                } else if (isContentEditable) {
                    inserirCharEmContentEditable(el, c);
                } else {
                    try {
                        el.innerText = (el.innerText || '') + c;
                    } catch (_) {}
                }
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                if (i % 25 === 0) {
                    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                }
                window[NS].currentIndex = i;
                window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
            } else {
                window[NS].typingTimeoutId = null;
                try {
                    if (isInputEl) {
                        try { el.blur(); } catch (_) {}
                        if (prevReadOnly !== null) {
                            try { el.readOnly = prevReadOnly; } catch (_) {}
                        } else {
                            try { el.readOnly = false; } catch (_) {}
                        }
                    }
                } catch (_) {}
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
                if (callback) callback();
            }
        }

        window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
    }

    // ===============================
    // LISTENER DE CLIQUE PARA CAPTURAR CAMPOS
    // ===============================
    function ensureListenerInstalled() {
        if (window[NS].listenerInstalado && window[NS].onDocClick) {
            document.removeEventListener('click', window[NS].onDocClick, true);
            window[NS].listenerInstalado = false;
        }

        const onDocClick = (e) => {
            if (!window[NS].aguardandoCampo) return;

            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV2-'))) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            window[NS].aguardandoCampo = false;

            const el = e.target;
            if (!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
                alert('❌ Esse não é um campo válido.');
                return;
            }

            const texto = window[NS].textoPendente;
            if (texto == null) return;

            const callback = () => {
                alert('✅ Texto colado com sucesso!');
            };

            colarTextoSuperRapido(el, texto, callback);
        };

        window[NS].onDocClick = onDocClick;
        document.addEventListener('click', onDocClick, true);
        window[NS].listenerInstalado = true;
    }

    // ===============================
    // CRIAR MENU FLUTUANTE
    // ===============================
    function criarMenuFlutuante() {
        const container = document.createElement('div');
        container.id = 'floating-menu-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            font-family: Arial, sans-serif;
        `;

        // Botão principal
        const botaoToggle = document.createElement('button');
        botaoToggle.id = 'floating-menu-toggle';
        botaoToggle.textContent = '⚡ Ações';
        botaoToggle.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s;
            width: auto;
            min-width: 120px;
        `;
        botaoToggle.onmouseenter = () => { botaoToggle.style.transform = 'scale(1.05)'; };
        botaoToggle.onmouseleave = () => { botaoToggle.style.transform = 'scale(1)'; };

        // Menu (inicialmente escondido)
        const menu = document.createElement('div');
        menu.id = 'floating-menu';
        menu.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            gap: 6px;
            min-width: 200px;
            max-width: 280px;
        `;

        // Estilo dos botões do menu
        function criarBotaoMenu(texto, cor, acao) {
            const btn = document.createElement('button');
            btn.textContent = texto;
            btn.style.cssText = `
                background: ${cor};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 16px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                width: 100%;
            `;
            btn.onmouseenter = () => { btn.style.opacity = '0.8'; };
            btn.onmouseleave = () => { btn.style.opacity = '1'; };
            btn.onclick = () => {
                menu.style.display = 'none';
                botaoToggle.textContent = '⚡ Ações';
                acao();
            };
            return btn;
        }

        // ---- OPÇÕES DO MENU ----

        // 1. Colar texto (Paste)
        const btnPaste = criarBotaoMenu('📋 Colar Texto', '#2196F3', () => {
            const texto = prompt('📋 Cole ou digite o texto que deseja colar:');
            if (texto === null) return;
            window[NS].textoPendente = texto;
            ensureListenerInstalled();
            window[NS].aguardandoCampo = true;
            alert('✍️ Clique no campo onde deseja colar o texto.');
        });

        // 2. Digitar automático
        const btnDigitar = criarBotaoMenu('⌨️ Digitar Automático', '#FF9800', () => {
            const texto = prompt('📝 Digite ou cole o texto para digitar:');
            if (texto === null) return;

            const vel = prompt(
                '⚡ Velocidade:\n\n' +
                '1 - Instantâneo (1ms)\n' +
                '2 - Muito Rápido (10ms)\n' +
                '3 - Normal (40ms)\n' +
                '4 - Devagar (70ms)\n' +
                '5 - Humana\n\n' +
                'Digite o número:',
                '3'
            );

            const velocidades = {
                '1': '1', '2': '10', '3': '40',
                '4': '70', '5': 'humana'
            };
            const velocidade = velocidades[vel] || '40';

            window[NS].textoPendente = texto;
            window[NS].currentSpeed = velocidade;

            // Usa o listener para capturar o clique no campo
            const callback = () => {
                alert('✅ Digitação concluída!');
            };

            // Modo especial para digitar (não colar)
            const onDocClickTemp = (e) => {
                if (!window[NS].aguardandoCampo) return;
                window[NS].aguardandoCampo = false;

                const el = e.target;
                if (!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
                    alert('❌ Clique em um campo válido.');
                    return;
                }

                const texto = window[NS].textoPendente;
                if (texto == null) return;

                iniciarDigitacao(el, texto, window[NS].currentSpeed, () => {
                    alert('✅ Digitação concluída!');
                });

                document.removeEventListener('click', onDocClickTemp, true);
            };

            document.addEventListener('click', onDocClickTemp, true);
            window[NS].aguardandoCampo = true;
            alert('✍️ Clique no campo onde deseja digitar.');
        });

        // 3. Digitar por Palavras
        const btnPalavras = criarBotaoMenu('📝 Digitar por Palavras', '#9C27B0', () => {
            const texto = prompt('📝 Digite ou cole o texto para digitar por palavras:');
            if (texto === null) return;

            const vel = prompt(
                '⚡ Velocidade entre palavras (ms):\n\n' +
                '1 - Muito Rápido (10ms)\n' +
                '2 - Normal (40ms)\n' +
                '3 - Devagar (100ms)\n\n' +
                'Digite o número:',
                '2'
            );

            const velocidades = { '1': '10', '2': '40', '3': '100' };
            const velocidade = velocidades[vel] || '40';

            const palavras = texto.split(' ');
            let index = 0;
            let campo = null;

            function inserirProximaPalavra() {
                if (index < palavras.length && campo) {
                    const palavra = palavras[index];
                    const bloco = palavra + (index < palavras.length - 1 ? ' ' : '');
                    
                    if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
                        inserirBlocoEmInput(campo, bloco);
                    } else if (campo.isContentEditable) {
                        inserirBlocoEmContentEditable(campo, bloco);
                    }
                    
                    campo.dispatchEvent(new Event('input', { bubbles: true }));
                    index++;
                    setTimeout(inserirProximaPalavra, parseInt(velocidade, 10));
                } else if (campo) {
                    campo.dispatchEvent(new Event('change', { bubbles: true }));
                    alert('✅ Digitação por palavras concluída!');
                }
            }

            const onDocClickTemp = (e) => {
                if (!window[NS].aguardandoCampo) return;
                window[NS].aguardandoCampo = false;

                const el = e.target;
                if (!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
                    alert('❌ Clique em um campo válido.');
                    return;
                }

                campo = el;
                campo.focus();
                if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
                    const pos = campo.value ? campo.value.length : 0;
                    campo.setSelectionRange(pos, pos);
                }
                alert('🚀 Digitando por palavras...');
                inserirProximaPalavra();
                document.removeEventListener('click', onDocClickTemp, true);
            };

            document.addEventListener('click', onDocClickTemp, true);
            window[NS].aguardandoCampo = true;
            alert('✍️ Clique no campo onde deseja digitar.');
        });

        // 4. Forçar Copy/Paste (já está ativo, mas mostra status)
        const btnForcePaste = criarBotaoMenu('🔓 Forçar Copy/Paste', '#4CAF50', () => {
            alert('✅ Copy/Paste já está FORÇADO nesta página!\n\n' +
                  'Você pode usar Ctrl+C, Ctrl+V normalmente.');
        });

        // 5. Fechar menu
        const btnFechar = criarBotaoMenu('❌ Fechar Menu', '#f44336', () => {
            menu.style.display = 'none';
            botaoToggle.textContent = '⚡ Ações';
        });

        // Montar menu
        menu.appendChild(btnPaste);
        menu.appendChild(btnDigitar);
        menu.appendChild(btnPalavras);
        menu.appendChild(btnForcePaste);
        menu.appendChild(btnFechar);

        // Toggle do menu
        let menuAberto = false;
        botaoToggle.onclick = () => {
            menuAberto = !menuAberto;
            menu.style.display = menuAberto ? 'flex' : 'none';
            botaoToggle.textContent = menuAberto ? '✖ Fechar' : '⚡ Ações';
        };

        container.appendChild(menu);
        container.appendChild(botaoToggle);
        document.body.appendChild(container);

        // Mostrar notificação de inicialização
        const notificacao = document.createElement('div');
        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 999998;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: fadeOut 3s forwards;
        `;
        notificacao.textContent = '✅ Menu flutuante ativado! Copy/Paste liberado.';
        document.body.appendChild(notificacao);

        // Adicionar animação CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: translateY(0); }
                70% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);

        // Remover notificação após 3s
        setTimeout(() => {
            if (notificacao.parentNode) {
                notificacao.remove();
            }
        }, 3000);
    }

    // ===============================
    // INICIAR
    // ===============================
    criarMenuFlutuante();

})();
