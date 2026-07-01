// AUTO DIGITADOR COM GEMINI - TÍTULO, REDAÇÃO E SALVAR AUTOMÁTICO
(function() {
    'use strict';

    const NS = '__digitadorV3__';

    // ---- Limpeza de execuções anteriores ----
    if (window[NS]) {
        try {
            if (window[NS].listenerInstalado && window[NS].onDocClick) {
                document.removeEventListener('click', window[NS].onDocClick, true);
            }
            if (window[NS].typingTimeoutId) clearTimeout(window[NS].typingTimeoutId);
            if (window[NS].pasteHandler) {
                document.removeEventListener('paste', window[NS].pasteHandler, true);
            }
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
        botaoSalvar: null,
        modo: 'titulo',
        pasteHandler: null,
        temaRedacao: '',
        tituloRedacao: '',
        textoRedacao: '',
        // API Key padrão (você pode trocar aqui)
        apiKey: '' // Substitua pela sua chave
    };

    // ---- Função para liberar colagem ----
    const forceEnableCopyPaste = (e) => {
        e.stopImmediatePropagation();
        return true;
    };

    function liberarColagem() {
        document.addEventListener('paste', forceEnableCopyPaste, true);
        window[NS].pasteHandler = forceEnableCopyPaste;
    }

    function bloquearColagem() {
        if (window[NS].pasteHandler) {
            document.removeEventListener('paste', window[NS].pasteHandler, true);
            window[NS].pasteHandler = null;
        }
    }

    // ---- Função para extrair tema da redação ----
    function extrairTemaRedacao() {
        // Procura especificamente pelo elemento com a classe mencionada
        const elementos = document.querySelectorAll('.MuiTypography-root.MuiTypography-body2.css-k1sw4y');
        
        for (const el of elementos) {
            const texto = el.textContent || '';
            if (texto.toUpperCase().includes('TEMA')) {
                const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
                if (match && match[1]) {
                    return match[1].trim();
                }
                return texto.trim();
            }
        }
        
        // Fallback: procura em todos os elementos P com a classe
        const todosPs = document.querySelectorAll('p.MuiTypography-root.MuiTypography-body2');
        for (const el of todosPs) {
            const texto = el.textContent || '';
            if (texto.toUpperCase().includes('TEMA')) {
                const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
                if (match && match[1]) {
                    return match[1].trim();
                }
                return texto.trim();
            }
        }
        
        return null;
    }

    // ---- Função para gerar redação com Gemini ----
    async function gerarRedacaoComGemini(tema) {
        // Se não tiver API Key configurada, pede ao usuário
        if (!window[NS].apiKey || window[NS].apiKey === 'AIzaSyA6N8x8x8x8x8x8x8x8x8x8x8x8x8x8') {
            window[NS].apiKey = prompt('Digite sua API Key do Gemini:');
            if (!window[NS].apiKey) {
                alert('API Key é necessária!');
                return null;
            }
        }

        const prompt = `Escreva uma redação dissertativa-argumentativa completa sobre o tema: "${tema}". 
        
Requisitos:
- Título criativo e relevante
- Introdução com tese clara
- 2-3 parágrafos de desenvolvimento com argumentos sólidos
- Conclusão com proposta de intervenção
- Entre 20-30 linhas
- Linguagem formal e culta
- Respeitar a norma padrão da língua portuguesa

Formato da resposta (EXATAMENTE neste formato):
TÍTULO: [título da redação]
REDAÇÃO: [texto completo da redação com parágrafos separados por linha em branco]`;

        try {
            // CORREÇÃO: usando o endpoint e formato correto da API
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window[NS].apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro HTTP ${response.status}: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            console.log('Resposta Gemini:', data); // Debug
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const textoCompleto = data.candidates[0].content.parts[0].text;
                
                // Extrai título e redação do formato especificado
                const tituloMatch = textoCompleto.match(/TÍTULO:\s*(.+?)(?:\n|$)/);
                const redacaoMatch = textoCompleto.match(/REDAÇÃO:\s*([\s\S]+)/);
                
                let titulo, redacao;
                
                if (tituloMatch && redacaoMatch) {
                    titulo = tituloMatch[1].trim();
                    redacao = redacaoMatch[1].trim();
                } else {
                    // Fallback: tenta extrair de outra forma
                    const linhas = textoCompleto.split('\n').filter(l => l.trim());
                    titulo = linhas[0].replace(/^#+\s*/, '').replace('TÍTULO:', '').trim();
                    redacao = linhas.slice(1).join('\n').replace('REDAÇÃO:', '').trim();
                }
                
                if (!titulo || !redacao) {
                    throw new Error('Não foi possível extrair título e redação da resposta');
                }
                
                return { titulo, redacao };
            } else {
                throw new Error('Resposta da API não contém o conteúdo esperado');
            }
        } catch (error) {
            console.error('Erro ao gerar redação:', error);
            
            // Mensagem de erro mais amigável
            if (error.message.includes('403')) {
                alert('Erro 403: API Key inválida ou sem permissão. Verifique sua chave.');
            } else if (error.message.includes('429')) {
                alert('Erro 429: Muitas requisições. Aguarde um momento e tente novamente.');
            } else {
                alert(`Erro ao gerar redação: ${error.message}`);
            }
            
            return null;
        }
    }

    // ---- Listener único de clique ----
    function ensureListenerInstalled() {
        if (window[NS].listenerInstalado && window[NS].onDocClick) {
            document.removeEventListener('click', window[NS].onDocClick, true);
            window[NS].listenerInstalado = false;
        }

        const onDocClick = (e) => {
            if (!window[NS].aguardandoCampo) return;

            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV3-'))) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            window[NS].aguardandoCampo = false;

            const el = e.target;
            if (!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
                alert('Esse não é um campo válido. Clique em um INPUT ou TEXTAREA.');
                return;
            }

            // Usa o texto apropriado baseado no modo
            if (window[NS].modo === 'titulo') {
                iniciarDigitacao(el, window[NS].tituloRedacao, window[NS].currentSpeed);
            } else if (window[NS].modo === 'redacao') {
                iniciarDigitacao(el, window[NS].textoRedacao, window[NS].currentSpeed);
            }
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
    // FUNÇÃO PARA COLAR TEXTO (ALTERNATIVA RÁPIDA)
    // ===============================
    function colarTextoNoCampo(el, texto) {
        try {
            // Libera a colagem
            liberarColagem();
            
            // Foca no elemento
            el.focus();
            
            // Se o elemento for input/textarea
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                // Método direto para inputs
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                ).set;
                
                nativeInputValueSetter.call(el, texto);
                
                // Dispara eventos
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.isContentEditable) {
                // Para contentEditable
                el.innerText = texto;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Bloqueia novamente
            setTimeout(() => {
                bloquearColagem();
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Erro ao colar:', error);
            bloquearColagem();
            return false;
        }
    }

    // ===============================
    // FUNÇÃO PARA PROCURAR BOTÃO SALVAR
    // ===============================
    function encontrarBotaoSalvar() {
        const seletores = [
            'button[type="submit"]',
            '.MuiBox-root.css-1nuzzzk',
            'button[class*="salvar"]',
            'button[class*="save"]',
            'button[class*="submit"]',
            'button[class*="enviar"]',
            'input[type="submit"]'
        ];

        for (const seletor of seletores) {
            try {
                const el = document.querySelector(seletor);
                if (el) return el;
            } catch (_) {}
        }

        const botoes = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of botoes) {
            const texto = (btn.textContent || btn.value || '').toLowerCase();
            if (texto.includes('salvar') || 
                texto.includes('save') ||
                texto.includes('enviar') ||
                texto.includes('publicar')) {
                return btn;
            }
        }

        return null;
    }

    // ===============================
    // FUNÇÃO PRINCIPAL DE DIGITAÇÃO
    // ===============================
    function iniciarDigitacao(el, texto, velocidade) {
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

        // Se velocidade for "instant", cola o texto diretamente
        if (velocidade === 'instant') {
            colarTextoNoCampo(el, texto);
            
            // Continua o fluxo
            setTimeout(() => {
                if (window[NS].modo === 'titulo') {
                    iniciarModoRedacao();
                } else if (window[NS].modo === 'redacao') {
                    setTimeout(() => {
                        const botao = encontrarBotaoSalvar();
                        if (botao) {
                            botao.click();
                            console.log('✅ Botão Salvar clicado!');
                        } else {
                            alert('⚠️ Botão Salvar não encontrado! Clique manualmente.');
                        }
                    }, 500);
                }
            }, 200);
            return;
        }

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
                        if (prevReadOnly !== null && typeof prevReadOnly !== 'undefined') {
                            try { el.readOnly = prevReadOnly; } catch (_) {}
                        } else {
                            try { el.readOnly = false; } catch (_) {}
                        }
                    }
                } catch (_) {}

                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}

                if (window[NS].modo === 'titulo') {
                    iniciarModoRedacao();
                } else if (window[NS].modo === 'redacao') {
                    setTimeout(function() {
                        const botao = encontrarBotaoSalvar();
                        if (botao) {
                            botao.click();
                            console.log('✅ Botão Salvar clicado!');
                        } else {
                            alert('⚠️ Botão Salvar não encontrado! Clique manualmente.');
                        }
                    }, 500);
                }
            }
        }

        window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
    }

    // ===============================
    // FUNÇÕES DE MODO
    // ===============================
    function iniciarModoTitulo(velocidade) {
        window[NS].modo = 'titulo';
        window[NS].currentSpeed = velocidade;
        ensureListenerInstalled();
        window[NS].aguardandoCampo = true;
        alert('📝 Clique no campo de TÍTULO onde deseja digitar.');
    }

    function iniciarModoRedacao() {
        window[NS].modo = 'redacao';
        window[NS].aguardandoCampo = true;
        alert('📄 Clique no campo de REDAÇÃO onde deseja digitar.');
    }

    // ===============================
    // FUNÇÃO PARA ESCOLHER VELOCIDADE
    // ===============================
    function escolherVelocidade() {
        const opcao = prompt(
            '⚡ ESCOLHA A VELOCIDADE:\n\n' +
            '1 - Instantâneo (cola o texto)\n' +
            '2 - Muito Rápido (10ms)\n' +
            '3 - Normal (40ms)\n' +
            '4 - Devagar (70ms)\n' +
            '5 - Muito Devagar (100ms)\n' +
            '6 - Humana (aleatório)\n\n' +
            'Digite o número da opção:',
            '3'
        );

        const velocidades = {
            '1': 'instant',
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
    async function iniciarFluxoCompleto() {
        // Passo 1: Extrair tema
        const tema = extrairTemaRedacao();
        
        if (!tema) {
            alert('❌ Tema não encontrado!\n\nProcure o elemento com classe:\n"MuiTypography-root MuiTypography-body2 css-k1sw4y"');
            return;
        }
        
        alert(`🎯 Tema encontrado: "${tema}"\n🤖 Gerando redação com Gemini...`);

        // Passo 2: Gerar redação
        const redacao = await gerarRedacaoComGemini(tema);
        
        if (!redacao) {
            alert('❌ Falha ao gerar redação!');
            return;
        }

        // Armazena título e redação
        window[NS].tituloRedacao = redacao.titulo;
        window[NS].textoRedacao = redacao.redacao;

        alert(`✅ Redação gerada com sucesso!\n\nTítulo: "${redacao.titulo}"\n\nA redação será inserida automaticamente.`);

        // Passo 3: Escolher velocidade
        const velocidade = escolherVelocidade();
        if (!velocidade) return;

        // Passo 4: Iniciar com título
        iniciarModoTitulo(velocidade);
    }

    // ---- API pública ----
    window.iniciarDigitador = function() {
        iniciarFluxoCompleto();
    };

    // ---- Início automático ----
    console.log('🚀 Auto Digitador com Gemini iniciado!');
    console.log('ℹ️ Para executar manualmente: window.iniciarDigitador()');
    
    // Inicia automaticamente
    iniciarFluxoCompleto();

})();
