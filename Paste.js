// AUTO DIGITADOR - VERSÃO "COLAGEM RÁPIDA" (texto todo de uma vez)
(function() {
    'use strict';

    const NS = '__digitadorV2__';

    // ---- Limpeza de execuções anteriores ----
    if (window[NS]) {
        try {
            if (window[NS].listenerInstalado && window[NS].onDocClick) {
                document.removeEventListener('click', window[NS].onDocClick, true);
            }
            if (window[NS].typingTimeoutId) clearTimeout(window[NS].typingTimeoutId);
        } catch (_) {}
    }

    // ---- Estado global ----
    window[NS] = {
        aguardandoCampo: false,
        listenerInstalado: false,
        onDocClick: null,
        typingTimeoutId: null,
        currentElement: null,
        currentText: '',
        currentSpeed: 1 // Sempre 1ms (super rápido)
    };

    // ---- Listener único de clique ----
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

            // PEGA O TEXTO DO PRIMEIRO POPUP
            const texto = window[NS].textoPendente;
            if (texto == null) return;

            // USA O MODO DE COLAGEM RÁPIDA
            colarTextoSuperRapido(el, texto);
        };

        window[NS].onDocClick = onDocClick;
        document.addEventListener('click', onDocClick, true);
        window[NS].listenerInstalado = true;
    }

    // ===============================
    // FUNÇÃO PRINCIPAL: COLA TUDO DE UMA VEZ
    // ===============================
    function colarTextoSuperRapido(el, texto) {
        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        // Prepara o campo
        let prevReadOnly = null;
        try {
            if (isInputEl) {
                prevReadOnly = el.readOnly;
                el.readOnly = true;
                try { el.focus({ preventScroll: true }); } catch (_) { try { el.focus(); } catch (_) {} }
            }
        } catch (_) {}

        // ============================================
        // PASSO 1: INSERE O TEXTO TODO DE UMA VEZ
        // ============================================
        if (isInputEl) {
            // Para inputs e textareas
            const pos = el.selectionStart || el.value.length;
            const valor = el.value || '';
            el.value = valor.slice(0, pos) + texto + valor.slice(pos);
            const newPos = pos + texto.length;
            try { el.setSelectionRange(newPos, newPos); } catch (_) {}
        } else if (isContentEditable) {
            // Para contentEditable
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

        // ============================================
        // PASSO 2: DISPARA EVENTOS "INPUT" PARA CADA CARACTERE
        // ============================================
        // Isso faz o site acreditar que cada tecla foi pressionada
        let index = 0;
        const totalChars = texto.length;

        function dispararProximoEvento() {
            if (index < totalChars) {
                // Dispara evento de input para o caractere atual
                try {
                    const event = new Event('input', { bubbles: true });
                    // Adiciona dados customizados para simular digitação
                    event.data = texto[index];
                    el.dispatchEvent(event);
                } catch (_) {}

                index++;

                // Dispara próximo evento com 1ms de intervalo (super rápido)
                window[NS].typingTimeoutId = setTimeout(dispararProximoEvento, 1);
            } else {
                // ============================================
                // PASSO 3: FINALIZA
                // ============================================
                window[NS].typingTimeoutId = null;

                // Restaura campo
                try {
                    if (isInputEl) {
                        try { el.blur(); } catch (_) {}
                        if (prevReadOnly !== null && typeof prevReadOnly !== 'undefined') {
                            try { el.readOnly = prevReadOnly; } catch (_) {}
                        } else {
                            try { el.readOnly = false; } catch (_) {}
                        }
                    }
                } catch (_) {}

                // Dispara eventos finais
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
                try { el.dispatchEvent(new Event('blur', { bubbles: true })); } catch (_) {}

                alert('✅ Texto colado com sucesso! (' + totalChars + ' caracteres)');
            }
        }

        // Inicia
        alert('🚀 Colando texto super rápido (' + totalChars + ' caracteres)...');
        window[NS].typingTimeoutId = setTimeout(dispararProximoEvento, 10);
    }

    // ===============================
    // INÍCIO - APENAS 2 POPUPS
    // ===============================
    
    // POPUP 1: Pede o texto
    const texto = prompt('📋 Cole ou digite o texto que deseja colar:');
    if (texto === null) return; // Cancelou

    // Salva o texto para usar depois
    window[NS].textoPendente = texto;

    // POPUP 2: Apenas confirmação (já que a velocidade é fixa)
    alert('⚡ Clique em OK e depois clique no campo onde deseja colar o texto.\n\n' +
          'O texto será colado instantaneamente com eventos de teclado simulados.');

    // Inicia o listener
    ensureListenerInstalled();
    window[NS].aguardandoCampo = true;

})();
