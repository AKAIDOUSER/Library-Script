// AUTO DIGITADOR - APENA FUNÇÃO DE DIGITAÇÃO
(function() {
    'use strict';

    const NS = '__digitadorV2__';

    // ---- Limpeza de execuções anteriores ----
    if (window[NS]) {
        try {
            if (window[NS].listenerInstalado && window[NS].onDocClick) {
                document.removeEventListener('click', window[NS].onDocClick, true);
            }
            if (window[NS].typingIntervalId) clearTimeout(window[NS].typingIntervalId);
        } catch (_) {}
    }

    // ---- Estado global ----
    window[NS] = {
        aguardandoCampo: false,
        listenerInstalado: false,
        onDocClick: null,
        typingTimeoutId: null,
        paused: false,
        currentElement: null,
        currentText: '',
        currentIndex: 0,
        currentSpeed: 40
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
                alert('Esse não é um campo válido.');
                return;
            }

            const texto = prompt('Cole ou digite o texto:');
            if (texto == null) return;

            // Pergunta a velocidade
            const vel = prompt(
                'Velocidade (ms entre caracteres):\n\n' +
                '10 - Muito Rápido\n' +
                '20 - Rápido\n' +
                '40 - Normal (padrão)\n' +
                '60 - Devagar\n' +
                '100 - Muito Devagar\n' +
                'humana - Velocidade Humana\n\n' +
                'Digite o valor:',
                '10'
            );

            const velocidade = vel || '10';
            iniciarDigitacao(el, texto, velocidade);
        };

        window[NS].onDocClick = onDocClick;
        document.addEventListener('click', onDocClick, true);
        window[NS].listenerInstalado = true;
    }

    // ---- API pública ----
    window.iniciarModV2 = function() {
        ensureListenerInstalled();
        window[NS].aguardandoCampo = true;
        alert('Clique no campo onde deseja digitar o texto.');
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

    // ===============================
    // FUNÇÃO PRINCIPAL DE DIGITAÇÃO
    // ===============================
    function iniciarDigitacao(el, texto, velocidade) {
        // Limpa timeout anterior
        if (window[NS].typingTimeoutId) {
            clearTimeout(window[NS].typingTimeoutId);
            window[NS].typingTimeoutId = null;
        }

        // Salva estado
        window[NS].currentElement = el;
        window[NS].currentText = texto;
        window[NS].currentIndex = 0;
        window[NS].currentSpeed = velocidade;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        // Prepara o campo
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

                // Insere o caractere
                if (isInputEl) {
                    inserirCharEmInput(el, c);
                } else if (isContentEditable) {
                    inserirCharEmContentEditable(el, c);
                } else {
                    try {
                        el.innerText = (el.innerText || '') + c;
                    } catch (_) {}
                }

                // Dispara eventos
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                if (i % 25 === 0) {
                    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                }

                window[NS].currentIndex = i;
                window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
            } else {
                // Finalização
                window[NS].typingTimeoutId = null;

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

                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}

                alert('✅ Digitação concluída!');
            }
        }

        // Inicia
        //alert('🚀 Digitando...');
        window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
    }

    // ---- Início imediato ----
    window.iniciarModV2();

})();
