// AUTO DIGITADOR COM MISTRAL - COM AUTO-DETECÇÃO DE CAMPOS
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
        VELOCIDADE: '1',
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
        currentSpeed: CONFIG.VELOCIDADE,
        modo: 'titulo',
        tituloRedacao: '',
        textoRedacao: '',
        maxPalavras: CONFIG.MAX_PALAVRAS_PADRAO,
        generoRedacao: '',
        autoDeteccao: true
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // AUTO-DETECÇÃO DE CAMPOS
    // ============================================
    function detectarCampoTitulo() {
        console.log('🔍 Auto-detectando campo de título...');
        
        // Procura por INPUT com as classes específicas
        const inputs = document.querySelectorAll('input.MuiOutlinedInput-input, input.MuiInputBase-input');
        
        for (const input of inputs) {
            const classes = input.className || '';
            
            // Verifica se é um input de texto (não password, email, etc)
            if (input.type === 'text' && !input.placeholder) {
                // Verifica se NÃO é uma textarea (campo de redação)
                if (input.tagName === 'INPUT' && !classes.includes('Multiline')) {
                    console.log('✅ Campo de título encontrado:', input);
                    return input;
                }
            }
        }
        
        // Fallback: primeiro input de texto vazio
        const todosInputs = document.querySelectorAll('input[type="text"]');
        for (const input of todosInputs) {
            if (!input.value && !input.placeholder) {
                console.log('✅ Campo de título (fallback):', input);
                return input;
            }
        }
        
        console.warn('⚠️ Campo de título não encontrado automaticamente');
        return null;
    }

    function detectarCampoRedacao() {
        console.log('🔍 Auto-detectando campo de redação...');
        
        // Procura por TEXTAREA com as classes específicas
        const textareas = document.querySelectorAll('textarea.MuiOutlinedInput-input, textarea.MuiInputBase-input');
        
        for (const textarea of textareas) {
            const placeholder = textarea.placeholder || '';
            
            // Verifica pelo placeholder característico
            if (placeholder.includes('Comece a escrever') || 
                placeholder.includes('redação') ||
                placeholder.includes('escreva')) {
                console.log('✅ Campo de redação encontrado pelo placeholder:', textarea);
                return textarea;
            }
        }
        
        // Fallback: procura por textarea com classe Multiline
        const textareasMultiline = document.querySelectorAll('textarea.MuiInputBase-inputMultiline');
        for (const textarea of textareasMultiline) {
            console.log('✅ Campo de redação encontrado (Multiline):', textarea);
            return textarea;
        }
        
        // Segundo fallback: qualquer textarea visível
        const todasTextareas = document.querySelectorAll('textarea');
        for (const textarea of todasTextareas) {
            if (textarea.offsetParent !== null) { // Verifica se está visível
                console.log('✅ Campo de redação (fallback):', textarea);
                return textarea;
            }
        }
        
        console.warn('⚠️ Campo de redação não encontrado automaticamente');
        return null;
    }

    function autoInserirTexto(campo, texto) {
        if (!campo) return false;
        
        console.log('🎯 Inserindo texto automaticamente no campo:', campo);
        
        // Foca no campo
        campo.focus();
        
        // Se for input, remove readonly
        if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
            campo.readOnly = false;
        }
        
        // Insere o texto
        digitarRapidamente(campo, texto);
        
        return true;
    }

    // ============================================
    // EXTRAIR TEMA CORRETO
    // ============================================
    function extrairTemaRedacao() {
        console.log('🔍 Procurando tema da redação...');
        
        const elementosAlvo = document.querySelectorAll('p.MuiTypography-body2, p.MuiTypography-root.MuiTypography-body2');
        
        for (const el of elementosAlvo) {
            const textoCompleto = el.textContent?.trim() || '';
            
            if (textoCompleto.toUpperCase().includes('TEMA:')) {
                let temaExtraido = textoCompleto.replace(/TEMA:\s*/i, '').trim();
                
                if (!temaExtraido || temaExtraido.length < 5) {
                    const proximoIrmao = el.nextElementSibling;
                    if (proximoIrmao) {
                        temaExtraido = proximoIrmao.textContent?.trim() || '';
                    }
                }
                
                if (!temaExtraido || temaExtraido.length < 5) {
                    const elementoPai = el.parentElement;
                    if (elementoPai) {
                        const textoPai = elementoPai.textContent?.trim() || '';
                        temaExtraido = textoPai.replace(/TEMA:\s*/i, '').trim();
                    }
                }
                
                temaExtraido = temaExtraido.replace(/^[:\s]+/, '').replace(/[\s]+$/, '').trim();
                
                // Remove tudo após o primeiro "-"
                if (temaExtraido.includes('-')) {
                    temaExtraido = temaExtraido.split('-')[0].trim();
                }
                
                if (temaExtraido && temaExtraido.length >= 5 && !/^[A-F0-9-]+$/i.test(temaExtraido)) {
                    console.log('✅ Tema encontrado:', temaExtraido);
                    return temaExtraido;
                }
            }
        }
        
        const todosElementos = document.querySelectorAll('*');
        for (const el of todosElementos) {
            if (el.children.length === 0) {
                const texto = el.textContent?.trim() || '';
                if (texto.toUpperCase().startsWith('TEMA:')) {
                    let temaExtraido = texto.replace(/TEMA:\s*/i, '').trim();
                    if (temaExtraido.includes('-')) {
                        temaExtraido = temaExtraido.split('-')[0].trim();
                    }
                    if (temaExtraido && temaExtraido.length >= 5) {
                        console.log('✅ Tema encontrado:', temaExtraido);
                        return temaExtraido;
                    }
                }
            }
        }
        
        console.error('❌ Tema não encontrado!');
        return null;
    }

    // ============================================
    // EXTRAIR GÊNERO DA REDAÇÃO
    // ============================================
    function extrairGeneroRedacao() {
        console.log('🔍 Procurando gênero...');
        
        const todosElementos = document.querySelectorAll('p.MuiTypography-body1, p.MuiTypography-root.MuiTypography-body1');
        
        for (const el of todosElementos) {
            const textoCompleto = el.textContent?.trim() || '';
            
            if (textoCompleto.toUpperCase().includes('GÊNERO') || textoCompleto.toUpperCase().includes('GENERO')) {
                const proximoIrmao = el.nextElementSibling;
                if (proximoIrmao) {
                    const generoExtraido = proximoIrmao.textContent?.trim() || '';
                    console.log('✅ Gênero:', generoExtraido);
                    return generoExtraido;
                }
            }
        }
        
        for (const el of todosElementos) {
            const texto = el.textContent?.trim() || '';
            if (texto === 'RESENHA' || texto === 'DISSERTAÇÃO' || texto === 'ARTIGO' || 
                texto === 'CRÔNICA' || texto === 'CONTO' || texto === 'RELATO') {
                return texto;
            }
        }
        
        return 'DISSERTAÇÃO';
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
        return texto.trim();
    }

    async function gerarRedacaoComMistral(tema, maxPalavras, genero) {
        const minPalavras = Math.floor(maxPalavras * 0.8);
        
        let prompt = '';
        
        if (genero.toUpperCase() === 'RESENHA') {
            prompt = `Escreva uma RESENHA CRÍTICA sobre: "${tema}".
        
REGRAS:
- NÃO use asteriscos (**), hashtags (##) ou formatação markdown
- Título criativo e relevante
- Estrutura: introdução, análise, pontos positivos/negativos, conclusão
- Linguagem formal
- ENTRE ${minPalavras} E ${maxPalavras} palavras

FORMATO EXATO:
TÍTULO: [título]
REDAÇÃO: [texto]`;
        } else if (genero.toUpperCase() === 'ARTIGO') {
            prompt = `Escreva um ARTIGO DE OPINIÃO sobre: "${tema}".
        
REGRAS:
- NÃO use asteriscos ou formatação markdown
- Título criativo
- Estrutura: introdução, argumentos, exemplos, conclusão
- ENTRE ${minPalavras} E ${maxPalavras} palavras

FORMATO EXATO:
TÍTULO: [título]
REDAÇÃO: [texto]`;
        } else {
            prompt = `Escreva uma DISSERTAÇÃO ARGUMENTATIVA sobre: "${tema}".
        
REGRAS:
- NÃO use asteriscos ou formatação markdown
- Título criativo
- Introdução com tese, 2-3 parágrafos de desenvolvimento, conclusão com intervenção
- ENTRE ${minPalavras} E ${maxPalavras} palavras

FORMATO EXATO:
TÍTULO: [título]
REDAÇÃO: [texto]`;
        }

        let aiResponseText = null;

        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const currentKey = MISTRAL_API_KEYS[currentApiKeyIndex];
            
            if (!currentKey || currentKey.trim() === "") {
                currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
                continue;
            }

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
                        break;
                    }
                }
            } catch (error) {
                console.warn('Erro na chave:', error.message);
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
        
        if (tituloMatch) {
            titulo = tituloMatch[1].trim().split('\n')[0].trim();
        }
        
        if (redacaoMatch) {
            redacao = redacaoMatch[1].trim();
        } else {
            const linhas = aiResponseText.split('\n');
            const idx = linhas.findIndex(l => l.toUpperCase().includes('REDAÇÃO'));
            if (idx >= 0) redacao = linhas.slice(idx + 1).join('\n').trim();
        }
        
        if (!titulo) {
            const linhas = aiResponseText.split('\n').filter(l => l.trim());
            titulo = linhas[0].replace(/TÍTULO:?\s*/i, '').trim();
        }
        
        titulo = titulo.replace(/\*/g, '').trim();
        redacao = redacao.replace(/\*/g, '').trim();
        
        if (titulo.length > 200) titulo = titulo.substring(0, 200);
        
        const palavras = redacao.split(/\s+/).length;
        
        return { titulo, redacao, palavras };
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
                alert('❌ Campo inválido!');
                STATE.aguardandoCampo = true;
                return;
            }

            const texto = STATE.modo === 'titulo' ? STATE.tituloRedacao : STATE.textoRedacao;
            if (!texto) {
                alert('❌ Texto não encontrado!');
                return;
            }

            digitarRapidamente(el, texto);
        };

        document.addEventListener('click', STATE.onDocClick, true);
        STATE.listenerInstalado = true;
    }

    function digitarRapidamente(el, texto) {
        if (STATE.typingTimeoutId) {
            clearTimeout(STATE.typingTimeoutId);
            STATE.typingTimeoutId = null;
        }

        STATE.currentElement = el;
        STATE.currentText = texto;
        STATE.currentIndex = 0;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        try {
            if (isInputEl) {
                el.readOnly = false;
                el.focus();
                if (el.value) el.setSelectionRange(el.value.length, el.value.length);
            }
        } catch (_) {}

        let i = 0;
        const velocidade = parseInt(STATE.currentSpeed, 10) || 1;

        function digitar() {
            if (i < texto.length) {
                const ch = texto[i++];
                
                try {
                    if (isInputEl) {
                        const pos = el.selectionStart || el.value.length;
                        if (typeof el.setRangeText === 'function') {
                            el.setRangeText(ch, pos, pos, 'end');
                        } else {
                            el.value = el.value.slice(0, pos) + ch + el.value.slice(pos);
                            el.setSelectionRange(pos + 1, pos + 1);
                        }
                    } else if (isContentEditable) {
                        const doc = el.ownerDocument || document;
                        const sel = doc.getSelection();
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
                        range.insertNode(doc.createTextNode(ch));
                        range.collapse(false);
                        if (sel) {
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    } else {
                        el.innerText = (el.innerText || '') + ch;
                    }
                    
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (_) {}
                
                STATE.currentIndex = i;
                STATE.typingTimeoutId = setTimeout(digitar, velocidade);
            } else {
                STATE.typingTimeoutId = null;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                continuarFluxo();
            }
        }

        STATE.typingTimeoutId = setTimeout(digitar, velocidade);
    }

    function encontrarBotaoSalvar() {
        const botoes = document.querySelectorAll('button');
        for (const btn of botoes) {
            const texto = (btn.textContent || '').toLowerCase();
            if (/salvar|save|enviar|publicar/.test(texto)) return btn;
        }
        return document.querySelector('button[type="submit"]');
    }

    function continuarFluxo() {
        if (STATE.modo === 'titulo') {
            STATE.modo = 'redacao';
            
            // Tenta auto-detectar o campo de redação
            if (STATE.autoDeteccao) {
                const campoRedacao = detectarCampoRedacao();
                if (campoRedacao) {
                    console.log('🎯 Auto-inserindo redação...');
                    setTimeout(() => {
                        autoInserirTexto(campoRedacao, STATE.textoRedacao);
                    }, 500);
                    return;
                }
            }
            
            // Fallback: modo manual
            STATE.aguardandoCampo = true;
            alert('✅ Título inserido!\n📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
            setTimeout(() => {
                const botao = encontrarBotaoSalvar();
                if (botao) {
                    botao.click();
                    console.log('✅ Salvo!');
                } else {
                    alert('✅ Redação inserida!\n⚠️ Clique em Salvar manualmente.');
                }
            }, CONFIG.DELAY_SALVAR);
        }
    }

    async function iniciar() {
        const palavrasInput = prompt('📝 Quantas palavras para a redação? (Padrão: 300)', '300');
        STATE.maxPalavras = parseInt(palavrasInput) || CONFIG.MAX_PALAVRAS_PADRAO;
        if (STATE.maxPalavras < 50) STATE.maxPalavras = 300;
        if (STATE.maxPalavras > 2000) STATE.maxPalavras = 2000;

        STATE.currentSpeed = CONFIG.VELOCIDADE;

        STATE.generoRedacao = extrairGeneroRedacao();
        const tema = extrairTemaRedacao();
        
        if (!tema) {
            alert('❌ Tema não encontrado!');
            return;
        }
        
        alert('✅ Tema: "' + tema + '"\n📝 Gênero: ' + STATE.generoRedacao + '\n📊 Palavras: ' + STATE.maxPalavras + '\n⚡ Velocidade máxima\n🤖 Gerando redação...');

        const redacao = await gerarRedacaoComMistral(tema, STATE.maxPalavras, STATE.generoRedacao);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        // Tenta auto-detectar o campo de título
        const campoTitulo = detectarCampoTitulo();
        
        if (campoTitulo) {
            alert('✅ Redação criada! (' + redacao.palavras + ' palavras)\n🎯 Inserindo automaticamente no campo de TÍTULO...');
            
            STATE.modo = 'titulo';
            STATE.aguardandoCampo = false;
            autoInserirTexto(campoTitulo, STATE.tituloRedacao);
        } else {
            alert('✅ Redação criada! (' + redacao.palavras + ' palavras)\n🎯 Clique no campo de TÍTULO.');
            
            STATE.modo = 'titulo';
            STATE.aguardandoCampo = true;
            instalarListenerClique();
        }
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador com auto-detecção carregado!');
    iniciar();

})();
