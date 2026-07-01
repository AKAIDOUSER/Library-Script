// AUTO DIGITADOR COM GEMINI - MÚLTIPLAS API KEYS
(function() {
    'use strict';

    // ============================================
    // LISTA DE API KEYS (IGUAL AO QUIZIZZ)
    // ============================================
    const GEMINI_API_KEYS = [
        "AQ.Ab8RN6IpJib85YU_qPAJsRrqW3z85vdVgTTnn64zKfoDwVWp0A",
        "AQ.Ab8RN6JxltVwQISLYQvpUL4vjZO8LoVSwzbOl6V4tlRBytoMew", 
        "SUA_API_KEY_3",
        "SUA_API_KEY_4",
        "SUA_API_KEY_5"
    ];
    
    let currentApiKeyIndex = 0;

    const CONFIG = {
        NAMESPACE: '__digitadorV5__',
        MODELO_GEMINI: 'gemini-2.0-flash',
        API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
        CLASSE_TEMA: 'MuiTypography-root MuiTypography-body2 css-k1sw4y',
        DELAY_SALVAR: 500,
        DELAY_COLAGEM: 200,
        VELOCIDADE_PADRAO: '10'
    };

    // ============================================
    // LIMPEZA
    // ============================================
    function limparInstanciaAnterior() {
        const state = window[CONFIG.NAMESPACE];
        if (!state) return;
        try {
            if (state.listenerInstalado && state.onDocClick) {
                document.removeEventListener('click', state.onDocClick, true);
            }
            if (state.typingTimeoutId) clearTimeout(state.typingTimeoutId);
            if (state.pasteHandler) {
                document.removeEventListener('paste', state.pasteHandler, true);
            }
        } catch (e) {}
    }

    limparInstanciaAnterior();

    const STATE = {
        aguardandoCampo: false,
        listenerInstalado: false,
        onDocClick: null,
        typingTimeoutId: null,
        paused: false,
        currentElement: null,
        currentText: '',
        currentIndex: 0,
        currentSpeed: CONFIG.VELOCIDADE_PADRAO,
        modo: 'titulo',
        pasteHandler: null,
        tituloRedacao: '',
        textoRedacao: '',
        usarColagem: false
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // COLEÇÃO
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
    // EXTRAIR TEMA
    // ============================================
    function extrairTemaRedacao() {
        const elementoEspecifico = document.querySelector('.MuiTypography-root.MuiTypography-body2.css-k1sw4y');
        if (elementoEspecifico) {
            const texto = elementoEspecifico.textContent || '';
            const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
            return match ? match[1].trim() : texto.trim();
        }
        const elementos = document.querySelectorAll('p.MuiTypography-root.MuiTypography-body2');
        for (const el of elementos) {
            const texto = el.textContent || '';
            if (/tema/i.test(texto)) {
                const match = texto.match(/(?:TEMA|Tema|tema)\s*:?\s*(.+)/i);
                return match ? match[1].trim() : texto.trim();
            }
        }
        return null;
    }

    // ============================================
    // FETCH COM TIMEOUT (IGUAL AO QUIZIZZ)
    // ============================================
    async function fetchWithTimeout(resource, options = {}, timeout = 15000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Timeout: requisição cancelada.');
            }
            throw error;
        }
    }

    // ============================================
    // GERAR REDAÇÃO COM MÚLTIPLAS CHAVES
    // ============================================
    async function gerarRedacaoComGemini(tema) {
        const prompt = `Escreva uma redação dissertativa-argumentativa completa sobre o tema: "${tema}". 
        
Requisitos:
- Título criativo e relevante
- Introdução com tese clara
- 2-3 parágrafos de desenvolvimento
- Conclusão com proposta de intervenção
- Entre 20-30 linhas
- Linguagem formal e culta

Responda EXATAMENTE neste formato:
TÍTULO: [título]
REDAÇÃO: [texto completo]`;

        let aiResponseText = null;
        let todasFalharam = true;

        // Tenta cada chave da lista
        for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
            const currentKey = GEMINI_API_KEYS[currentApiKeyIndex];
            
            // Pula placeholders
            if (!currentKey || currentKey.includes("SUA_") || currentKey.length < 30) {
                console.warn(`⏭️ Chave #${currentApiKeyIndex + 1} é placeholder. Pulando...`);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % GEMINI_API_KEYS.length;
                continue;
            }

            const url = `${CONFIG.API_ENDPOINT}/${CONFIG.MODELO_GEMINI}:generateContent?key=${currentKey}`;
            
            console.log(`🔑 Tentando chave #${currentApiKeyIndex + 1}...`);

            try {
                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        aiResponseText = data.candidates[0].content.parts[0].text;
                        console.log(`✅ Sucesso com chave #${currentApiKeyIndex + 1}!`);
                        todasFalharam = false;
                        break;
                    }
                }

                const errorData = await response.json();
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                console.warn(`❌ Chave #${currentApiKeyIndex + 1} falhou: ${errorMessage}`);

            } catch (error) {
                console.warn(`❌ Erro na chave #${currentApiKeyIndex + 1}: ${error.message}`);
            }

            // Próxima chave
            currentApiKeyIndex = (currentApiKeyIndex + 1) % GEMINI_API_KEYS.length;
        }

        if (todasFalharam || !aiResponseText) {
            alert('❌ Todas as API Keys falharam! Verifique suas chaves.');
            return null;
        }

        // Extrai título e redação
        const tituloMatch = aiResponseText.match(/TÍTULO:\s*(.+?)(?:\n|$)/);
        const redacaoMatch = aiResponseText.match(/REDAÇÃO:\s*([\s\S]+)/);
        
        if (tituloMatch && redacaoMatch) {
            return {
                titulo: tituloMatch[1].trim(),
                redacao: redacaoMatch[1].trim()
            };
        }
        
        const linhas = aiResponseText.split('\n').filter(l => l.trim());
        return {
            titulo: linhas[0].replace(/^#+\s*/, '').replace('TÍTULO:', '').trim(),
            redacao: linhas.slice(1).join('\n').replace('REDAÇÃO:', '').trim()
        };
    }

    // ============================================
    // LISTENER DE CLIQUE
    // ============================================
    function instalarListenerClique() {
        if (STATE.listenerInstalado && STATE.onDocClick) {
            document.removeEventListener('click', STATE.onDocClick, true);
            STATE.listenerInstalado = false;
        }

        STATE.onDocClick = (e) => {
            if (!STATE.aguardandoCampo) return;
            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV5-'))) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            STATE.aguardandoCampo = false;

            const el = e.target;
            if (!el || (!el.isContentEditable && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) {
                alert('❌ Campo inválido! Clique em um INPUT ou TEXTAREA.');
                STATE.aguardandoCampo = true;
                return;
            }

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
    // INSERIR CARACTERES
    // ============================================
    function inserirCharInput(el, ch) {
        try {
            const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
            if (typeof el.setRangeText === 'function') {
                el.setRangeText(ch, pos, pos, 'end');
            } else {
                const v = el.value || '';
                el.value = v.slice(0, pos) + ch + v.slice(pos);
                try { el.setSelectionRange(pos + 1, pos + 1); } catch (_) {}
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
                if (!el.contains(range.commonAncestorContainer)) range = null;
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
            if (/salvar|save|enviar|publicar|send|submit/.test(texto)) return btn;
        }
        return null;
    }

    // ============================================
    // INSERIR TEXTO NO CAMPO
    // ============================================
    function inserirTextoNoCampo(el, texto) {
        if (STATE.typingTimeoutId) {
            clearTimeout(STATE.typingTimeoutId);
            STATE.typingTimeoutId = null;
        }

        STATE.currentElement = el;
        STATE.currentText = texto;
        STATE.currentIndex = 0;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

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
            return parseInt(STATE.currentSpeed, 10) || 10;
        }

        function digitarProximo() {
            if (STATE.paused) return;
            if (i < texto.length) {
                const ch = texto[i++];
                if (isInputEl) inserirCharInput(el, ch);
                else if (isContentEditable) inserirCharContentEditable(el, ch);
                else try { el.innerText = (el.innerText || '') + ch; } catch (_) {}
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                if (i % 25 === 0) try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
                STATE.currentIndex = i;
                STATE.typingTimeoutId = setTimeout(digitarProximo, getIntervalo());
            } else {
                STATE.typingTimeoutId = null;
                try {
                    if (isInputEl) {
                        el.blur();
                        if (prevReadOnly !== null && prevReadOnly !== undefined) el.readOnly = prevReadOnly;
                        else el.readOnly = false;
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
    // CONTINUAR FLUXO
    // ============================================
    function continuarFluxo() {
        if (STATE.modo === 'titulo') {
            STATE.modo = 'redacao';
            STATE.aguardandoCampo = true;
            alert('📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
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
    // INICIAR
    // ============================================
    async function iniciar() {
        // Sempre usa velocidade 10ms
        STATE.currentSpeed = CONFIG.VELOCIDADE_PADRAO;
        STATE.usarColagem = false;

        const tema = extrairTemaRedacao();
        if (!tema) {
            alert('❌ Tema não encontrado!');
            return;
        }
        
        console.log('📝 Tema:', tema);
        alert('📝 Tema: "' + tema + '"\n\n🤖 Gerando redação...');

        const redacao = await gerarRedacaoComGemini(tema);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        console.log('✅ Título:', redacao.titulo);
        console.log('✅ Redação gerada!');
        
        alert('✅ REDAÇÃO GERADA!\n\nTítulo: "' + redacao.titulo + '"\n\n🎯 Clique no campo de TÍTULO.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador IA V5 carregado!');
    iniciar();

})();
