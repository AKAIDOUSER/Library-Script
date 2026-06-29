// AUTO DIGITADOR - COM TÍTULO, REDAÇÃO E SALVAR AUTOMÁTICO
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
        paused: false,
        currentElement: null,
        currentText: '',
        currentIndex: 0,
        currentSpeed: 40,
        // Novo: armazenar o botão para salvar depois
        botaoSalvar: null,
        // Flag para saber se é o título ou redação
        modo: 'titulo' // 'titulo' ou 'redacao'
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
                alert('Esse não é um campo válido. Clique em um INPUT ou TEXTAREA.');
                return;
            }

            // Pergunta o texto baseado no modo
            let mensagem = 'Cole ou digite o texto para ' + window[NS].modo + ':';
            const texto = prompt(mensagem);
            if (texto == null) return;

            // Iniciar digitação com a velocidade já definida
            iniciarDigitacao(el, texto, window[NS].currentSpeed);
        };

        window[NS].onDocClick = onDocClick;
        document.addEventListener('click', onDocClick, true);
        window[NS].listenerInstalado = true;
    }

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
    // FUNÇÃO PARA PROCURAR BOTÃO SALVAR
    // ===============================
    function encontrarBotaoSalvar() {
        // Tenta encontrar pelos seletores mais comuns
        const seletores = [
            'button[type="submit"]',
            'button:has-text("Salvar")',
            'button:has-text("salvar")',
            'button:has-text("Enviar")',
            'button:has-text("Publicar")',
            '.MuiBox-root.css-1nuzzzk', // Seletor específico do seu caso
            'button[class*="salvar"]',
            'button[class*="save"]',
            'button[class*="submit"]',
            'input[type="submit"]'
        ];

        for (const seletor of seletores) {
            try {
                // Para seletores com :has-text, precisamos de uma abordagem diferente
                if (seletor.includes(':has-text')) {
                    const botoes = document.querySelectorAll('button, input[type="submit"]');
                    const textoBusca = seletor.match(/:has-text\("([^"]+)"\)/);
                    if (textoBusca) {
                        const texto = textoBusca[1].toLowerCase();
                        for (const btn of botoes) {
                            if (btn.textContent && btn.textContent.toLowerCase().includes(texto)) {
                                return btn;
                            }
                        }
                    }
                } else {
                    const el = document.querySelector(seletor);
                    if (el) return el;
                }
            } catch (_) {}
        }

        // Fallback: procurar qualquer botão que contenha "salvar" ou "enviar"
        const botoes = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of botoes) {
            const texto = btn.textContent || btn.value || '';
            if (texto.toLowerCase().includes('salvar') || 
                texto.toLowerCase().includes('save') ||
                texto.toLowerCase().includes('enviar') ||
                texto.toLowerCase().includes('publicar')) {
                return btn;
            }
        }

        return null;
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

                // Verifica se é o título ou redação
                if (window[NS].modo === 'titulo') {
                    //alert('✅ Título digitado com sucesso!');
                    // Chama o próximo passo: redação
                    iniciarModoRedacao();
                } else if (window[NS].modo === 'redacao') {
                    //alert('✅ Redação digitada com sucesso!');
                    // Procura e clica no botão salvar
                    setTimeout(function() {
                        const botao = encontrarBotaoSalvar();
                        if (botao) {
                            botao.click();
                           // alert('✅ Botão Salvar clicado com sucesso!');
                        } else {
                            alert('Botão Salvar não encontrado! Clique manualmente.');
                        }
                    }, 500);
                }
            }
        }

        // Inicia
        //alert('🚀 Digitando...');
        window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
    }

    // ===============================
    // FUNÇÃO PARA INICIAR MODO TÍTULO
    // ===============================
    function iniciarModoTitulo(velocidade) {
        window[NS].modo = 'titulo';
        window[NS].currentSpeed = velocidade;
        ensureListenerInstalled();
        window[NS].aguardandoCampo = true;
        alert('Clique no campo de TÍTULO onde deseja digitar.');
    }

    // ===============================
    // FUNÇÃO PARA INICIAR MODO REDAÇÃO
    // ===============================
    function iniciarModoRedacao() {
        window[NS].modo = 'redacao';
        window[NS].aguardandoCampo = true;
        alert('Clique no campo de REDAÇÃO onde deseja digitar.');
    }

    // ===============================
    // FUNÇÃO PARA ESCOLHER VELOCIDADE
    // ===============================
    function escolherVelocidade() {
        const opcao = prompt(
            'ESCOLHA A VELOCIDADE:\n\n' +
            '1 - Instantâneo (1ms)\n' +
            '2 - Muito Rápido (10ms)\n' +
            '3 - Normal (40ms)\n' +
            '4 - Devagar (70ms)\n' +
            '5 - Muito Devagar (100ms)\n' +
            '6 - Humana (aleatório)\n\n' +
            'Digite o número da opção:',
            '3'
        );

        const velocidades = {
            '1': '0',
            '2': '10',
            '3': '40',
            '4': '70',
            '5': '100',
            '6': 'humana'
        };

        const vel = velocidades[opcao];
        if (!vel) {
            alert('Opção inválida! Usando velocidade Normal (40ms).');
            return '40';
        }
        return vel;
    }

    // ===============================
    // FUNÇÃO PRINCIPAL - FLUXO COMPLETO
    // ===============================
    function iniciarFluxoCompleto() {
        // Passo 1: Escolher velocidade
        const velocidade = escolherVelocidade();
        if (!velocidade) return;

        // Passo 2: Digitar título
        iniciarModoTitulo(velocidade);
    }

    // ---- API pública ----
    window.iniciarModV2 = function() {
        iniciarFluxoCompleto();
    };

    // ---- Início imediato ----
    window.iniciarModV2();

})();
