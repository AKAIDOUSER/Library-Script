// AUTO DIGITADOR COM GEMINI - VERSÃO CORRIGIDA E ORGANIZADA
(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES
    // ============================================
    const CONFIG = {
        NAMESPACE: '__digitadorV4__',
        MODELO_GEMINI: 'gemini-1.5-flash',
        API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
        CLASSE_TEMA: 'MuiTypography-root MuiTypography-body2 css-k1sw4y',
        DELAY_SALVAR: 500,
        DELAY_COLAGEM: 200
    };

    // ============================================
    // LIMPEZA DE INSTÂNCIAS ANTERIORES
    // ============================================
    function limparInstanciaAnterior() {
        const state = window[CONFIG.NAMESPACE];
        if (!state) return;

        try {
            if (state.listenerInstalado && state.onDocClick) {
                document.removeEventListener('click', state.onDocClick, true);
            }
            if (state.typingTimeoutId) {
                clearTimeout(state.typingTimeoutId);
            }
            if (state.pasteHandler) {
                document.removeEventListener('paste', state.pasteHandler, true);
            }
        } catch (e) {
            console.warn('Erro ao limpar instância anterior:', e);
        }
    }

    limparInstanciaAnterior();

    // ============================================
    // ESTADO GLOBAL
    // ============================================
    const STATE = {
        aguardandoCampo: false,
        listenerInstalado: false,
        onDocClick: null,
        typingTimeoutId: null,
        paused: false,
        currentElement: null,
        currentText: '',
        currentIndex: 0,
        currentSpeed: '40',
        modo: 'titulo',
        pasteHandler: null,
        tituloRedacao: '',
        textoRedacao: '',
        apiKey: '',
        usarColagem: false
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // FUNÇÕES DE COLEÇÃO (PASTE)
    // ============================================
    const pasteHandler = (e) => {
        e.stopImmediatePropagation();
        return true;
    };

    function liberarColagem() {
        document.addEventListener('paste', pasteHandler, true);
        STATE.pasteHandler = pasteHandler;
    }

    function bloquearColagem() {
        if (STATE.pasteHandler) {
            document.removeEventListener('paste', STATE.pasteHandler, true);
            STATE.pasteHandler = null;
        }
    }

    // ============================================
    // EXTRAIR TEMA DA REDAÇÃO
    // ============================================
    function extrairTemaRedacao() {
        // Tenta encontrar o elemento específico primeiro
        const elementoEspecifico = document.querySelector(`.${CONFIG.CLASSE_TEMA.replace(/ /g, '.')}`);
        
        if (elementoEspecifico) {
            const texto = elementoEspecifico.textContent || '';
            const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
            return texto.trim();
        }

        // Procura em todos os elementos P com a classe MuiTypography
        const elementos = document.querySelectorAll('p.MuiTypography-root.MuiTypography-body2');
        
        for (const el of elementos) {
            const texto = el.textContent || '';
            if (/tema/i.test(texto)) {
                const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
                if (match && match[1]) {
                    return match[1].trim();
                }
                return texto.trim();
            }
        }

        return null;
    }

    // ============================================
    // GERAR REDAÇÃO COM GEMINI
    // ============================================
    async function gerarRedacaoComGemini(tema) {
        if (!STATE.apiKey) {
            STATE.apiKey = prompt('🔑 Digite sua API Key do Gemini:');
            if (!STATE.apiKey || !STATE.apiKey.trim()) {
                alert('❌ API Key é necessária!');
                return null;
            }
            STATE.apiKey = STATE.apiKey.trim();
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

IMPORTANTE: Responda EXATAMENTE neste formato:
TÍTULO: [título da redação]
REDAÇÃO: [texto completo da redação com parágrafos separados por linha em branco]`;

        try {
            const url = `${CONFIG.API_ENDPOINT}/${CONFIG.MODELO_GEMINI}:generateContent?key=${STATE.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Resposta da API sem conteúdo');
            }

            const textoCompleto = data.candidates[0].content.parts[0].text;
            
            // Extrai título e redação
            const tituloMatch = textoCompleto.match(/TÍTULO:\s*(.+?)(?:\n|$)/);
            const redacaoMatch = textoCompleto.match(/REDAÇÃO:\s*([\s\S]+)/);
            
            if (tituloMatch && redacaoMatch) {
                return {
                    titulo: tituloMatch[1].trim(),
                    redacao: redacaoMatch[1].trim()
                };
            }
            
            // Fallback
            const linhas = textoCompleto.split('\n').filter(l => l.trim());
            return {
                titulo: linhas[0].replace(/^#+\s*/, '').replace('TÍTULO:', '').trim(),
                redacao: linhas.slice(1).join('\n').replace('REDAÇÃO:', '').trim()
            };

        } catch (error) {
            console.error('Erro Gemini:', error);
            
            if (error.message.includes('403')) {
                alert('❌ API Key inválida ou sem permissão!');
            } else if (error.message.includes('429')) {
                alert('⚠️ Muitas requisições! Aguarde um momento.');
            } else {
                alert('❌ Erro ao gerar redação: ' + error.message);
            }
            
            return null;
        }
    }

    // ============================================
    // LISTENER DE CLIQUE NOS CAMPOS
    // ============================================
    function instalarListenerClique() {
        if (STATE.listenerInstalado && STATE.onDocClick) {
            document.removeEventListener('click', STATE.onDocClick, true);
            STATE.listenerInstalado = false;
        }

        STATE.onDocClick = (e) => {
            if (!STATE.aguardandoCampo) return;

            // Ignora cliques nos elementos do próprio script
            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV4-'))) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            STATE.aguardandoCampo = false;

            const el = e.target;
            
            // Verifica se é um campo válido
            if (!el || (!el.isContentEditable && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) {
                alert('❌ Campo inválido! Clique em um INPUT ou TEXTAREA.');
                STATE.aguardandoCampo = true;
                return;
            }

            // Inicia a inserção do texto
            const texto = STATE.modo === 'titulo' ? STATE.tituloRedacao : STATE.textoRedacao;
            
            if (!texto) {
                alert('❌ Texto não encontrado!');
                return;
            }

            inserirTextoNoCampo(el, texto);
        };

        document.addEventListener('click', STATE.onDocClick, true);
        STATE.listenerInstalado = true;
    }

    // ============================================
    // INSERIR CARACTERES (DIGITAÇÃO)
    // ============================================
    function inserirCharInput(el, ch) {
        try {
            const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;

            if (typeof el.setRangeText === 'function') {
                el.setRangeText(ch, pos, pos, 'end');
            } else {
                const v = el.value || '';
                el.value = v.slice(0, pos) + ch + v.slice(pos);
                const newPos = pos + ch.length;
                try { el.setSelectionRange(newPos, newPos); } catch (_) {}
            }
        } catch (err) {
            el.value = (el.value || '') + ch;
        }
    }

    function inserirCharContentEditable(el, ch) {
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

    // ============================================
    // COLAR TEXTO (MÉTODO RÁPIDO)
    // ============================================
    function colarTexto(el, texto) {
        try {
            liberarColagem();
            el.focus();

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                // Usa setter nativo para inputs
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                ).set;
                nativeSetter.call(el, texto);
            } else if (el.isContentEditable) {
                el.innerText = texto;
            }

            // Dispara eventos
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(bloquearColagem, 100);
            return true;
        } catch (error) {
            console.error('Erro ao colar:', error);
            bloquearColagem();
            return false;
        }
    }

    // ============================================
    // ENCONTRAR BOTÃO SALVAR
    // ============================================
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
            if (/salvar|save|enviar|publicar|send|submit/.test(texto)) {
                return btn;
            }
        }

        return null;
    }

    // ============================================
    // FUNÇÃO PRINCIPAL DE INSERÇÃO DE TEXTO
    // ============================================
    function inserirTextoNoCampo(el, texto) {
        // Limpa timeout anterior
        if (STATE.typingTimeoutId) {
            clearTimeout(STATE.typingTimeoutId);
            STATE.typingTimeoutId = null;
        }

        STATE.currentElement = el;
        STATE.currentText = texto;
        STATE.currentIndex = 0;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        // MÉTODO DE COLAGEM (INSTANT)
        if (STATE.currentSpeed === 'instant') {
            colarTexto(el, texto);
            
            setTimeout(() => {
                continuarFluxo();
            }, CONFIG.DELAY_COLAGEM);
            
            return;
        }

        // MÉTODO DE DIGITAÇÃO
        let prevReadOnly = null;
        
        try {
            if (isInputEl) {
                prevReadOnly = el.readOnly;
                el.readOnly = true;
                el.focus({ preventScroll: true });
                const len = el.value ? el.value.length : 0;
                el.setSelectionRange(len, len);
            }
        } catch (_) {}

        let i = 0;

        function getIntervalo() {
            if (STATE.currentSpeed === 'humana') {
                if (i > 0 && Math.random() < 0.05) {
                    return 500 + Math.random() * 1000;
                }
                return 100 + Math.random() * 200;
            }
            return parseInt(STATE.currentSpeed, 10) || 40;
        }

        function digitarProximo() {
            if (STATE.paused) return;

            if (i < texto.length) {
                const ch = texto[i++];

                if (isInputEl) {
                    inserirCharInput(el, ch);
                } else if (isContentEditable) {
                    inserirCharContentEditable(el, ch);
                } else {
                    try { el.innerText = (el.innerText || '') + ch; } catch (_) {}
                }

                // Dispara eventos periodicamente
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                if (i % 25 === 0) {
                    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
                }

                STATE.currentIndex = i;
                STATE.typingTimeoutId = setTimeout(digitarProximo, getIntervalo());
            } else {
                // Finalizou a digitação
                STATE.typingTimeoutId = null;

                try {
                    if (isInputEl) {
                        el.blur();
                        if (prevReadOnly !== null && prevReadOnly !== undefined) {
                            el.readOnly = prevReadOnly;
                        } else {
                            el.readOnly = false;
                        }
                    }
                } catch (_) {}

                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));

                continuarFluxo();
            }
        }

        STATE.typingTimeoutId = setTimeout(digitarProximo, getIntervalo());
    }

    // ============================================
    // CONTINUAR FLUXO (PRÓXIMO CAMPO OU SALVAR)
    // ============================================
    function continuarFluxo() {
        if (STATE.modo === 'titulo') {
            // Passou para redação
            STATE.modo = 'redacao';
            STATE.aguardandoCampo = true;
            alert('📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
            // Finalizou, procura botão salvar
            setTimeout(() => {
                const botao = encontrarBotaoSalvar();
                if (botao) {
                    botao.click();
                    console.log('✅ Botão Salvar clicado!');
                } else {
                    alert('⚠️ Botão Salvar não encontrado! Clique manualmente.');
                }
            }, CONFIG.DELAY_SALVAR);
        }
    }

    // ============================================
    // PERGUNTAR CONFIGURAÇÕES AO USUÁRIO
    // ============================================
    function perguntarConfiguracoes() {
        // API Key
        STATE.apiKey = prompt('🔑 Digite sua API Key do Gemini:');
        if (!STATE.apiKey || !STATE.apiKey.trim()) {
            alert('❌ API Key é obrigatória!');
            return false;
        }
        STATE.apiKey = STATE.apiKey.trim();

        // Método
        STATE.usarColagem = confirm('📋 Deseja usar COLAGEM instantânea?\n\nOK = Colar texto\nCancelar = Digitar caractere por caractere');

        if (STATE.usarColagem) {
            STATE.currentSpeed = 'instant';
        } else {
            const opcao = prompt(
                '⚡ Escolha a velocidade de digitação:\n\n' +
                '1 - Muito Rápido (10ms)\n' +
                '2 - Normal (40ms)\n' +
                '3 - Devagar (70ms)\n' +
                '4 - Muito Devagar (100ms)\n' +
                '5 - Modo Humano (aleatório)\n\n' +
                'Digite o número:',
                '2'
            );

            const velocidades = {
                '1': '10',
                '2': '40',
                '3': '70',
                '4': '100',
                '5': 'humana'
            };

            STATE.currentSpeed = velocidades[opcao] || '40';
        }

        return true;
    }

    // ============================================
    // FLUXO PRINCIPAL
    // ============================================
    async function iniciar() {
        // Passo 1: Configurações
        if (!perguntarConfiguracoes()) return;

        // Passo 2: Extrair tema
        const tema = extrairTemaRedacao();
        
        if (!tema) {
            alert('❌ Tema não encontrado!\n\nProcure o elemento:\n"' + CONFIG.CLASSE_TEMA + '"');
            return;
        }
        
        console.log('📝 Tema encontrado:', tema);
        alert('📝 Tema encontrado: "' + tema + '"\n\n🤖 Gerando redação com Gemini...');

        // Passo 3: Gerar redação
        const redacao = await gerarRedacaoComGemini(tema);
        
        if (!redacao) {
            alert('❌ Falha ao gerar redação!');
            return;
        }

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        console.log('✅ Título:', redacao.titulo);
        console.log('✅ Redação gerada com sucesso!');
        
        alert(
            '✅ REDAÇÃO GERADA!\n\n' +
            'Título: "' + redacao.titulo + '"\n\n' +
            'Método: ' + (STATE.usarColagem ? 'Colagem instantânea' : 'Digitação ' + STATE.currentSpeed + 'ms')
        );

        // Passo 4: Instalar listener e aguardar clique no título
        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
        
        alert('🎯 CLIQUE NO CAMPO DE TÍTULO para inserir o texto.');
    }

    // ============================================
    // API PÚBLICA
    // ============================================
    window.iniciarDigitadorV4 = iniciar;

    // ============================================
    // INÍCIO AUTOMÁTICO
    // ============================================
    console.log('🚀 Auto Digitador com Gemini carregado!');
    console.log('ℹ️  Digite window.iniciarDigitadorV4() para começar.');
    
    // Inicia automaticamente
    iniciar();

})();
