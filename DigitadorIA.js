// AUTO 
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
        maxPalavras: CONFIG.MAX_PALAVRAS_PADRAO,
        generoRedacao: '',
        metodoInsercao: 'digitacao'
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // FORÇAR HABILITAÇÃO DE PASTE
    // ============================================
    function forcarHabilitacaoPaste() {
        const forceEnableCopyPaste = (e) => {
            e.stopImmediatePropagation();
            return true;
        };

        ['paste', 'copy'].forEach(event => {
            document.addEventListener(event, forceEnableCopyPaste, true);
        });
        
        console.log('✅ Paste/COPY forçadamente habilitados!');
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
                    console.log('✂️ Tema limpo:', temaExtraido);
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
                        console.log('✅ Tema encontrado (fallback):', temaExtraido);
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
        console.log('🔍 Procurando gênero da redação...');
        
        const todosElementos = document.querySelectorAll('p.MuiTypography-body1, p.MuiTypography-root.MuiTypography-body1');
        
        for (const el of todosElementos) {
            const textoCompleto = el.textContent?.trim() || '';
            
            if (textoCompleto.toUpperCase().includes('GÊNERO') || textoCompleto.toUpperCase().includes('GENERO')) {
                const proximoIrmao = el.nextElementSibling;
                if (proximoIrmao) {
                    const generoExtraido = proximoIrmao.textContent?.trim() || '';
                    console.log('✅ Gênero encontrado:', generoExtraido);
                    return generoExtraido;
                }
            }
        }
        
        for (const el of todosElementos) {
            const texto = el.textContent?.trim() || '';
            if (texto === 'RESENHA' || texto === 'DISSERTAÇÃO' || texto === 'ARTIGO' || 
                texto === 'CRÔNICA' || texto === 'CONTO' || texto === 'RELATO') {
                console.log('✅ Gênero encontrado (fallback):', texto);
                return texto;
            }
        }
        
        console.log('⚠️ Gênero não encontrado, usando padrão: DISSERTAÇÃO');
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
        texto = texto.replace(/\s+/g, ' ');
        texto = texto.replace(/\s+\./g, '.');
        texto = texto.replace(/\s+,/g, ',');
        return texto.trim();
    }

    async function gerarRedacaoComMistral(tema, maxPalavras, genero) {
        const minPalavras = Math.floor(maxPalavras * 0.8);
        
        let prompt = '';
        
        if (genero.toUpperCase() === 'RESENHA') {
            prompt = `Você é um especialista em redação. Escreva uma RESENHA CRÍTICA completa sobre o tema: "${tema}".
        
Instruções IMPORTANTES:
- NÃO use formatação markdown (sem **, sem ##, sem __)
- Crie um título criativo e relevante (SEM asteriscos)
- Estrutura da resenha:
  1. Introdução com apresentação do tema/obra
  2. Descrição e análise crítica
  3. Pontos positivos e negativos
  4. Conclusão com recomendação
- Use linguagem formal e culta
- A redação deve ter ENTRE ${minPalavras} E ${maxPalavras} palavras (NEM MENOS, NEM MAIS)
- NÃO repita o título no corpo da redação

IMPORTANTE: Responda EXATAMENTE neste formato (sem asteriscos):
TÍTULO: [título da resenha]
REDAÇÃO: [texto completo da resenha]`;
        } else if (genero.toUpperCase() === 'ARTIGO') {
            prompt = `Você é um especialista em redação. Escreva um ARTIGO DE OPINIÃO completo sobre o tema: "${tema}".
        
Instruções IMPORTANTES:
- NÃO use formatação markdown
- Crie um título criativo e relevante
- Estrutura do artigo:
  1. Introdução com contextualização
  2. Desenvolvimento com argumentos
  3. Dados e exemplos
  4. Conclusão com reflexão
- A redação deve ter ENTRE ${minPalavras} E ${maxPalavras} palavras

IMPORTANTE: Responda EXATAMENTE neste formato:
TÍTULO: [título do artigo]
REDAÇÃO: [texto completo do artigo]`;
        } else {
            prompt = `Você é um professor de redação. Escreva uma DISSERTAÇÃO ARGUMENTATIVA completa sobre o tema: "${tema}".
        
Instruções IMPORTANTES:
- NÃO use formatação markdown
- Crie um título criativo e relevante
- Faça uma introdução com tese clara
- Desenvolva em 2-3 parágrafos com argumentos
- Conclusão com proposta de intervenção
- A redação deve ter ENTRE ${minPalavras} E ${maxPalavras} palavras

IMPORTANTE: Responda EXATAMENTE neste formato:
TÍTULO: [título]
REDAÇÃO: [texto completo]`;
        }

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
        
        if (tituloMatch) {
            titulo = limparFormatacao(tituloMatch[1].trim());
            titulo = titulo.split('\n')[0].trim();
        }
        
        if (redacaoMatch) {
            redacao = limparFormatacao(redacaoMatch[1].trim());
            redacao = redacao.replace(/TÍTULO:.*?\n/g, '');
        } else {
            const linhas = aiResponseText.split('\n');
            const indexRedacao = linhas.findIndex(l => l.toUpperCase().includes('REDAÇÃO'));
            if (indexRedacao >= 0) {
                redacao = linhas.slice(indexRedacao + 1).join('\n');
                redacao = limparFormatacao(redacao);
            }
        }
        
        if (!titulo) {
            const linhas = aiResponseText.split('\n').filter(l => l.trim());
            titulo = linhas[0].replace(/TÍTULO:?\s*/i, '').trim();
            titulo = titulo.split('\n')[0].trim();
        }
        
        titulo = titulo.replace(/\*/g, '').trim();
        redacao = redacao.replace(/\*/g, '').trim();
        
        if (titulo.length > 200) {
            titulo = titulo.substring(0, 200) + '...';
        }
        
        const palavrasRedacao = redacao.split(/\s+/).length;
        console.log('📊 Palavras na redação:', palavrasRedacao);
        
        return { titulo, redacao, palavras: palavrasRedacao };
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

            if (STATE.metodoInsercao === 'colagem') {
                simularPasteManual(el, texto);
            } else {
                inserirTextoNoCampo(el, texto);
            }
        };

        document.addEventListener('click', STATE.onDocClick, true);
        STATE.listenerInstalado = true;
    }

    // ============================================
    // SIMULAR PASTE MANUAL (como se o usuário colasse)
    // ============================================
    async function simularPasteManual(el, texto) {
        try {
            // Força habilitação de paste
            forcarHabilitacaoPaste();
            
            // Foca no elemento
            el.focus();
            
            // Tenta usar a API Clipboard para escrever o texto
            try {
                await navigator.clipboard.writeText(texto);
                console.log('📋 Texto copiado para clipboard');
            } catch (err) {
                console.warn('⚠️ Não foi possível usar clipboard API:', err);
            }
            
            // Cria um evento de paste simulado
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
            });
            
            // Adiciona o texto ao clipboardData
            pasteEvent.clipboardData.setData('text/plain', texto);
            
            // Dispara o evento de paste no elemento
            const dispatched = el.dispatchEvent(pasteEvent);
            
            console.log('📋 Evento paste disparado:', dispatched);
            
            if (!dispatched) {
                // Se o evento foi cancelado, tenta método alternativo
                console.warn('⚠️ Evento paste cancelado, usando método alternativo');
                
                const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
                
                if (isInputEl) {
                    // Para inputs, simula a digitação do texto
                    const originalValue = el.value;
                    const pos = el.selectionStart || 0;
                    const antes = originalValue.substring(0, pos);
                    const depois = originalValue.substring(el.selectionEnd || pos);
                    el.value = antes + texto + depois;
                    
                    // Dispara eventos
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (el.isContentEditable) {
                    // Para contenteditable
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, texto);
                } else {
                    // Fallback
                    el.innerText = texto;
                }
            }
            
            console.log('✅ Texto colado com sucesso!');
            
            // Continua o fluxo
            setTimeout(() => continuarFluxo(), 500);
            
        } catch (error) {
            console.error('❌ Erro ao simular paste:', error);
            // Fallback para digitação
            alert('⚠️ Erro na colagem. Usando método de digitação...');
            inserirTextoNoCampo(el, texto);
        }
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
            alert('✅ Título inserido com sucesso!\n📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
            setTimeout(() => {
                const botao = encontrarBotaoSalvar();
                if (botao) {
                    botao.click();
                    console.log('✅ Salvo!');
                } else {
                    alert('✅ Redação inserida com sucesso!\n⚠️ Clique em Salvar manualmente.');
                }
            }, CONFIG.DELAY_SALVAR);
        }
    }

    async function iniciar() {
        // Pergunta o método usando confirm (nativo do navegador)
        const usarColagem = confirm('🔧 Método de inserção:\n\nClique em OK para COLAGEM (texto colado de uma vez)\nClique em CANCELAR para DIGITAÇÃO (caractere por caractere)');
        
        STATE.metodoInsercao = usarColagem ? 'colagem' : 'digitacao';
        console.log('🔧 Método selecionado:', STATE.metodoInsercao);
        
        if (STATE.metodoInsercao === 'colagem') {
            forcarHabilitacaoPaste();
        }

        const palavrasInput = prompt('📝 Quantas palavras para a redação? (Padrão: 300)', '300');
        const maxPalavras = parseInt(palavrasInput) || CONFIG.MAX_PALAVRAS_PADRAO;
        
        if (maxPalavras < 50) {
            STATE.maxPalavras = 300;
        } else if (maxPalavras > 2000) {
            STATE.maxPalavras = 2000;
        } else {
            STATE.maxPalavras = maxPalavras;
        }

        STATE.currentSpeed = CONFIG.VELOCIDADE_PADRAO;

        const genero = extrairGeneroRedacao();
        STATE.generoRedacao = genero;

        const tema = extrairTemaRedacao();
        if (!tema) {
            alert('❌ Tema não encontrado!');
            return;
        }
        
        const metodoNome = STATE.metodoInsercao === 'colagem' ? 'Colagem' : 'Digitação';
        alert('✅ Tema: "' + tema + '"\n📝 Gênero: ' + genero + '\n📊 Palavras: ' + STATE.maxPalavras + '\n🔧 Método: ' + metodoNome + '\n🤖 Gerando redação... Aguarde.');

        const redacao = await gerarRedacaoComMistral(tema, STATE.maxPalavras, genero);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        alert('✅ Redação criada! (' + redacao.palavras + ' palavras)\n🎯 Clique no campo de TÍTULO para inserir.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador carregado!');
    iniciar();

})();
