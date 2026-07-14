// AUTO DIGITADOR COM MISTRAL - VERSÃO FINAL
(function() {
    'use strict';

    const MISTRAL_API_KEYS = [
        "HJn0dgzp04QzEZkLnMc45lYYQWiIR6QM",
        "", 
        ""
    ];
    
    let currentApiKeyIndex = 0;

    const CONFIG = {
        NAMESPACE: '__digitadorV5__',
        MODELO_MISTRAL: 'mistral-large-latest',
        API_ENDPOINT: 'https://api.mistral.ai/v1/chat/completions',
        CLASSE_TEMA: 'MuiTypography-root MuiTypography-body2 css-k1sw4y',
        DELAY_SALVAR: 500,
        VELOCIDADE_PADRAO: '10',
        MAX_PALAVRAS_PADRAO: 300
    };

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
        usarColagem: false,
        maxPalavras: CONFIG.MAX_PALAVRAS_PADRAO
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // EXTRAIR TEMA CORRETO - CORRIGIDO
    // ============================================
    function extrairTemaRedacao() {
        console.log('🔍 Procurando tema da redação...');
        
        // Procura pelo elemento específico com a classe MuiTypography-body2
        const elementosAlvo = document.querySelectorAll('p.MuiTypography-body2, p.MuiTypography-root.MuiTypography-body2');
        
        console.log(`📊 Elementos encontrados: ${elementosAlvo.length}`);
        
        for (const el of elementosAlvo) {
            const textoCompleto = el.textContent?.trim() || '';
            console.log('📝 Analisando:', textoCompleto);
            
            if (textoCompleto.toUpperCase().includes('TEMA:')) {
                // Remove "TEMA:" e pega o texto depois
                let temaExtraido = textoCompleto.replace(/TEMA:\s*/i, '').trim();
                
                // Se estiver vazio, procura no próximo elemento
                if (!temaExtraido || temaExtraido.length < 5) {
                    const proximoIrmao = el.nextElementSibling;
                    if (proximoIrmao) {
                        temaExtraido = proximoIrmao.textContent?.trim() || '';
                    }
                }
                
                // Se ainda vazio, procura no elemento pai
                if (!temaExtraido || temaExtraido.length < 5) {
                    const elementoPai = el.parentElement;
                    if (elementoPai) {
                        const textoPai = elementoPai.textContent?.trim() || '';
                        temaExtraido = textoPai.replace(/TEMA:\s*/i, '').trim();
                    }
                }
                
                // Limpa e valida
                temaExtraido = temaExtraido.replace(/^[:\s]+/, '').replace(/[\s]+$/, '').trim();
                
                if (temaExtraido && temaExtraido.length >= 10 && !/^[A-F0-9-]+$/i.test(temaExtraido)) {
                    console.log('✅ Tema encontrado:', temaExtraido);
                    return temaExtraido;
                }
            }
        }
        
        // Fallback: procura qualquer elemento com "TEMA:"
        const todosElementos = document.querySelectorAll('*');
        for (const el of todosElementos) {
            if (el.children.length === 0) {
                const texto = el.textContent?.trim() || '';
                if (texto.toUpperCase().startsWith('TEMA:')) {
                    const temaExtraido = texto.replace(/TEMA:\s*/i, '').trim();
                    if (temaExtraido && temaExtraido.length >= 10) {
                        console.log('✅ Tema encontrado (fallback):', temaExtraido);
                        return temaExtraido;
                    }
                }
            }
        }
        
        console.error('❌ Tema não encontrado!');
        return null;
    }

    async function fetchWithTimeout(resource, options = {}, timeout = 15000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') throw new Error('Timeout');
            throw error;
        }
    }

    function limparFormatacao(texto) {
        texto = texto.replace(/\*\*/g, '');
        texto = texto.replace(/##/g, '');
        texto = texto.replace(/__/g, '');
        texto = texto.replace(/\n{3,}/g, '\n\n');
        texto = texto.split('\n').map(linha => linha.trim()).join('\n');
        texto = texto.replace(/\s+/g, ' ');
        texto = texto.replace(/\s+\./g, '.');
        texto = texto.replace(/\s+,/g, ',');
        return texto.trim();
    }

    async function gerarRedacaoComMistral(tema, maxPalavras) {
        const prompt = `Você é um professor de redação. Escreva uma redação dissertativa-argumentativa completa sobre o tema: "${tema}".
        
Instruções IMPORTANTES:
- NÃO use formatação markdown (sem **, sem ##, sem __)
- NÃO coloque asteriscos no título ou no texto
- Crie um título criativo e relevante ao tema (SEM asteriscos)
- Faça uma introdução com tese clara
- Desenvolva em 2-3 parágrafos com argumentos
- Conclusão com proposta de intervenção
- Use linguagem formal e culta
- A redação deve ter NO MÁXIMO ${maxPalavras} palavras
- NÃO repita o título no corpo da redação
- NÃO use marcadores de formatação

IMPORTANTE: Responda EXATAMENTE neste formato (sem asteriscos):
TÍTULO: [título da redação - sem formatação]
REDAÇÃO: [texto completo da redação - sem formatação]`;

        let aiResponseText = null;

        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const currentKey = MISTRAL_API_KEYS[currentApiKeyIndex];
            
            if (!currentKey || currentKey.trim() === "") {
                console.warn(`⏭️ Chave #${currentApiKeyIndex + 1} vazia. Pulando...`);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
                continue;
            }

            console.log(`🔑 Tentando chave #${currentApiKeyIndex + 1}...`);

            try {
                const response = await fetchWithTimeout(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentKey}`
                    },
                    body: JSON.stringify({
                        model: CONFIG.MODELO_MISTRAL,
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7,
                        max_tokens: Math.min(maxPalavras * 2, 4000)
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        aiResponseText = data.choices[0].message.content;
                        console.log(`✅ Sucesso!`);
                        break;
                    }
                }
            } catch (error) {
                console.warn(`❌ Erro na chave #${currentApiKeyIndex + 1}: ${error.message}`);
            }

            currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
        }

        if (!aiResponseText) {
            alert('❌ Erro ao gerar redação!');
            return null;
        }

        aiResponseText = limparFormatacao(aiResponseText);

        const tituloMatch = aiResponseText.match(/TÍTULO:\s*(.+?)(?:\n|$)/i);
        const redacaoMatch = aiResponseText.match(/REDAÇÃO:\s*([\s\S]+)/i);
        
        let titulo = '';
        let redacao = '';
        
        if (tituloMatch && redacaoMatch) {
            titulo = limparFormatacao(tituloMatch[1].trim());
            redacao = limparFormatacao(redacaoMatch[1].trim());
        } else {
            const linhas = aiResponseText.split('\n').filter(l => l.trim());
            for (let i = 0; i < linhas.length; i++) {
                if (linhas[i].toUpperCase().includes('TÍTULO')) {
                    titulo = limparFormatacao(linhas[i].replace(/TÍTULO:?\s*/i, '').trim());
                    if (!titulo && i + 1 < linhas.length) {
                        titulo = limparFormatacao(linhas[i + 1].trim());
                    }
                }
                if (linhas[i].toUpperCase().includes('REDAÇÃO')) {
                    redacao = linhas.slice(i + 1).join('\n');
                    redacao = limparFormatacao(redacao.replace(/REDAÇÃO:?\s*/i, '').trim());
                    break;
                }
            }
        }
        
        titulo = titulo.replace(/\*/g, '');
        redacao = redacao.replace(/\*/g, '');
        redacao = redacao.replace(/\n{3,}/g, '\n\n');
        
        return { titulo, redacao };
    }

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

    function encontrarBotaoSalvar() {
        const seletores = [
            'button[type="submit"]',
            'button[class*="salvar"]',
            'button[class*="save"]',
            'button[class*="submit"]',
            'button[class*="enviar"]'
        ];
        for (const seletor of seletores) {
            try {
                const el = document.querySelector(seletor);
                if (el) return el;
            } catch (_) {}
        }
        const botoes = document.querySelectorAll('button');
        for (const btn of botoes) {
            const texto = (btn.textContent || '').toLowerCase();
            if (/salvar|save|enviar|publicar/.test(texto)) return btn;
        }
        return null;
    }

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
                STATE.currentIndex = i;
                STATE.typingTimeoutId = setTimeout(digitarProximo, getIntervalo());
            } else {
                STATE.typingTimeoutId = null;
                try {
                    if (isInputEl) {
                        el.blur();
                        if (prevReadOnly !== null) el.readOnly = prevReadOnly;
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

    function continuarFluxo() {
        if (STATE.modo === 'titulo') {
            STATE.modo = 'redacao';
            STATE.aguardandoCampo = true;
            alert('✅ Título inserido!\n📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
            setTimeout(() => {
                const botao = encontrarBotaoSalvar();
                if (botao) {
                    botao.click();
                    console.log('✅ Salvo!');
                } else {
                    alert('⚠️ Redação inserida! Clique em Salvar manualmente.');
                }
            }, CONFIG.DELAY_SALVAR);
        }
    }

    async function iniciar() {
        const palavrasInput = prompt('📝 Quantas palavras MÁXIMAS para a redação? (Padrão: 300)', '300');
        const maxPalavras = parseInt(palavrasInput) || CONFIG.MAX_PALAVRAS_PADRAO;
        
        if (maxPalavras < 50) {
            STATE.maxPalavras = 300;
        } else if (maxPalavras > 2000) {
            STATE.maxPalavras = 2000;
        } else {
            STATE.maxPalavras = maxPalavras;
        }

        STATE.currentSpeed = CONFIG.VELOCIDADE_PADRAO;

        const tema = extrairTemaRedacao();
        if (!tema) {
            alert('❌ Tema não encontrado!');
            return;
        }
        
        alert('✅ Tema: "' + tema + '"\n🤖 Gerando redação... Aguarde.');

        const redacao = await gerarRedacaoComMistral(tema, STATE.maxPalavras);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        alert('✅ Redação criada!\n🎯 Clique no campo de TÍTULO para inserir.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador carregado!');
    iniciar();

})();
