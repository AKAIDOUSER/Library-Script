// VERSÃO CORRIGIDA
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
    // EXTRAIR TEMA CORRETO - MELHORADO
    // ============================================
    function extrairTemaRedacao() {
        console.log('🔍 Procurando tema da redação...');
        
        // Estratégia 1: Procurar elementos que contenham "TEMA:"
        const todosElementos = document.querySelectorAll('*');
        const candidatos = [];
        
        for (const el of todosElementos) {
            // Ignora elementos muito grandes ou scripts
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HTML' || el.tagName === 'BODY') {
                continue;
            }
            
            const texto = el.textContent?.trim() || '';
            
            // Procura por "TEMA:" no texto
            if (texto.includes('TEMA:') || texto.includes('Tema:') || texto.includes('tema:')) {
                console.log('📝 Encontrado elemento com "TEMA:":', texto.substring(0, 100));
                candidatos.push({elemento: el, texto: texto});
            }
            
            // Também verifica se o elemento tem a classe específica
            if (el.className && typeof el.className === 'string' && 
                el.className.includes('MuiTypography-body2')) {
                console.log('📝 Encontrado elemento com classe MuiTypography-body2:', texto.substring(0, 100));
                if (!candidatos.find(c => c.elemento === el)) {
                    candidatos.push({elemento: el, texto: texto});
                }
            }
        }
        
        console.log(`📊 Total de candidatos encontrados: ${candidatos.length}`);
        
        // Analisa cada candidato para encontrar o tema
        for (const candidato of candidatos) {
            let textoLimpo = candidato.texto;
            
            // Remove "TEMA:" ou variações
            textoLimpo = textoLimpo.replace(/TEMA:\s*/i, '');
            textoLimpo = textoLimpo.replace(/Tema:\s*/g, '');
            
            // Divide por linhas e procura a linha com o tema
            const linhas = textoLimpo.split(/[\n\r]+/).filter(l => l.trim());
            
            for (const linha of linhas) {
                const linhaLimpa = linha.trim();
                
                // Pula linhas muito curtas (tokens, IDs)
                if (linhaLimpa.length < 10) continue;
                
                // Pula se parece um token/ID (hexadecimal)
                if (/^[A-F0-9-]+$/i.test(linhaLimpa) && linhaLimpa.length < 40) {
                    console.log('⏭️ Pulando token:', linhaLimpa);
                    continue;
                }
                
                // Pula se é apenas números
                if (/^\d+$/.test(linhaLimpa)) continue;
                
                // Se chegou aqui, é provavelmente o tema
                console.log('✅ Tema encontrado:', linhaLimpa);
                return linhaLimpa;
            }
        }
        
        // Fallback: procura em elementos com a classe específica
        const elementosClasse = document.querySelectorAll('p.' + CONFIG.CLASSE_TEMA.replace(/ /g, '.'));
        for (const el of elementosClasse) {
            const texto = el.textContent.trim();
            if (texto.length > 10 && !/^[A-F0-9-]+$/i.test(texto)) {
                console.log('✅ Tema encontrado (fallback classe):', texto);
                return texto;
            }
        }
        
        console.error('❌ Nenhum tema válido encontrado!');
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
        // Remove marcadores de markdown como ** e ##
        texto = texto.replace(/\*\*/g, '');
        texto = texto.replace(/##/g, '');
        texto = texto.replace(/__/g, '');
        
        // Remove linhas em branco extras
        texto = texto.replace(/\n{3,}/g, '\n\n');
        
        // Remove espaços extras no início e fim de cada linha
        texto = texto.split('\n').map(linha => linha.trim()).join('\n');
        
        // Remove espaços extras
        texto = texto.replace(/\s+/g, ' ');
        
        // Corrige pontuação
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
        let todasFalharam = true;

        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const currentKey = MISTRAL_API_KEYS[currentApiKeyIndex];
            
            if (!currentKey || currentKey.includes("SUA_") || currentKey.length < 30) {
                console.warn(`⏭️ Chave #${currentApiKeyIndex + 1} é placeholder. Pulando...`);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
                continue;
            }

            console.log(`🔑 Tentando chave Mistral #${currentApiKeyIndex + 1}...`);

            try {
                const response = await fetchWithTimeout(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentKey}`
                    },
                    body: JSON.stringify({
                        model: CONFIG.MODELO_MISTRAL,
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: Math.min(maxPalavras * 2, 4000)
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        aiResponseText = data.choices[0].message.content;
                        console.log(`✅ Sucesso com chave Mistral #${currentApiKeyIndex + 1}!`);
                        todasFalharam = false;
                        break;
                    }
                }

                const errorData = await response.json().catch(() => ({}));
                console.warn(`❌ Chave Mistral #${currentApiKeyIndex + 1} falhou: ${errorData.error?.message || errorData.message || 'Erro'}`);

            } catch (error) {
                console.warn(`❌ Erro na chave Mistral #${currentApiKeyIndex + 1}: ${error.message}`);
            }

            currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
        }

        if (todasFalharam || !aiResponseText) {
            alert('❌ Todas as API Keys do Mistral falharam!');
            return null;
        }

        // Limpa a formatação da resposta
        aiResponseText = limparFormatacao(aiResponseText);
        
        console.log('📝 Resposta limpa:', aiResponseText.substring(0, 200) + '...');

        const tituloMatch = aiResponseText.match(/TÍTULO:\s*(.+?)(?:\n|$)/i);
        const redacaoMatch = aiResponseText.match(/REDAÇÃO:\s*([\s\S]+)/i);
        
        let titulo = '';
        let redacao = '';
        
        if (tituloMatch && redacaoMatch) {
            titulo = limparFormatacao(tituloMatch[1].trim());
            redacao = limparFormatacao(redacaoMatch[1].trim());
        } else {
            // Fallback: tenta encontrar TÍTULO e REDAÇÃO sem dois pontos
            const linhas = aiResponseText.split('\n').filter(l => l.trim());
            for (let i = 0; i < linhas.length; i++) {
                if (linhas[i].toUpperCase().includes('TÍTULO') || linhas[i].toUpperCase().includes('TITULO')) {
                    titulo = limparFormatacao(linhas[i].replace(/TÍTULO:?\s*/i, '').trim());
                    // Se o título estiver vazio, pega a próxima linha
                    if (!titulo && i + 1 < linhas.length) {
                        titulo = limparFormatacao(linhas[i + 1].trim());
                    }
                }
                if (linhas[i].toUpperCase().includes('REDAÇÃO') || linhas[i].toUpperCase().includes('REDACAO')) {
                    redacao = linhas.slice(i + 1).join('\n');
                    redacao = limparFormatacao(redacao.replace(/REDAÇÃO:?\s*/i, '').trim());
                    break;
                }
            }
        }
        
        // Se ainda não encontrou, usa o texto todo como redação
        if (!titulo && !redacao) {
            const linhas = aiResponseText.split('\n').filter(l => l.trim());
            if (linhas.length > 0) {
                titulo = limparFormatacao(linhas[0]);
                redacao = linhas.slice(1).join('\n');
                redacao = limparFormatacao(redacao);
            }
        }
        
        // Verificação final: remove qualquer asterisco remanescente
        titulo = titulo.replace(/\*/g, '');
        redacao = redacao.replace(/\*/g, '');
        
        // Remove linhas em branco extras
        redacao = redacao.replace(/\n{3,}/g, '\n\n');
        
        console.log('📌 Título final:', titulo);
        console.log('📄 Redação final (primeiros 100 chars):', redacao.substring(0, 100));
        
        return {
            titulo: titulo,
            redacao: redacao
        };
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
            '.MuiBox-root.css-1nuzzzk',
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
            alert('📄 Agora clique no campo de REDAÇÃO.');
        } else if (STATE.modo === 'redacao') {
            setTimeout(() => {
                const botao = encontrarBotaoSalvar();
                if (botao) {
                    botao.click();
                    console.log('✅ Salvo!');
                } else {
                    alert('⚠️ Clique em Salvar manualmente.');
                }
            }, CONFIG.DELAY_SALVAR);
        }
    }

    async function iniciar() {
        // Pergunta quantas palavras máximas
        const palavrasInput = prompt('📝 Quantas palavras MÁXIMAS para a redação? (Padrão: 300)', '300');
        const maxPalavras = parseInt(palavrasInput) || CONFIG.MAX_PALAVRAS_PADRAO;
        
        if (maxPalavras < 50) {
            alert('⚠️ Mínimo de 50 palavras. Usando 300 como padrão.');
            STATE.maxPalavras = 300;
        } else if (maxPalavras > 2000) {
            alert('⚠️ Máximo de 2000 palavras. Usando 2000.');
            STATE.maxPalavras = 2000;
        } else {
            STATE.maxPalavras = maxPalavras;
        }
        
        console.log('📊 Palavras máximas configuradas:', STATE.maxPalavras);
        
        STATE.currentSpeed = CONFIG.VELOCIDADE_PADRAO;

        const tema = extrairTemaRedacao();
        if (!tema) {
            alert('❌ Tema não encontrado! Verifique o console (F12).');
            return;
        }
        
        alert('📝 Tema: "' + tema + '"\n📊 Máximo de palavras: ' + STATE.maxPalavras + '\n\n🤖 Gerando redação com Mistral...');

        const redacao = await gerarRedacaoComMistral(tema, STATE.maxPalavras);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        // Mostra preview
        console.log('📌 Título:', STATE.tituloRedacao);
        console.log('📄 Redação:', STATE.textoRedacao);
        console.log('📊 Palavras na redação:', STATE.textoRedacao.split(/\s+/).length);
        
        alert('✅ Redação gerada!\n\n📌 Título: ' + STATE.tituloRedacao + '\n📊 Palavras: ' + STATE.textoRedacao.split(/\s+/).length + '\n\n🎯 Clique no campo de TÍTULO.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador V5 (Mistral) carregado!');
    
    // Inicia automaticamente
    iniciar();

})();
