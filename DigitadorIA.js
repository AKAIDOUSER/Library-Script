// AUTO DIGITADOR COM MISTRAL - CORRIGIDO
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
        console.log('🔍 Procurando campo de título...');
        
        const inputs = document.querySelectorAll('input.MuiOutlinedInput-input, input.MuiInputBase-input');
        
        for (const input of inputs) {
            if (input.type === 'text' && !input.placeholder && input.tagName === 'INPUT') {
                console.log('✅ Campo de título encontrado');
                return input;
            }
        }
        
        const todosInputs = document.querySelectorAll('input[type="text"]');
        for (const input of todosInputs) {
            if (!input.value && !input.placeholder) {
                console.log('✅ Campo de título (fallback)');
                return input;
            }
        }
        
        return null;
    }

    function detectarCampoRedacao() {
        console.log('🔍 Procurando campo de redação...');
        
        const textareas = document.querySelectorAll('textarea');
        
        for (const textarea of textareas) {
            const placeholder = (textarea.placeholder || '').toLowerCase();
            if (placeholder.includes('comece a escrever') || 
                placeholder.includes('redação') ||
                placeholder.includes('escreva') ||
                placeholder.includes('texto')) {
                console.log('✅ Campo de redação encontrado');
                return textarea;
            }
        }
        
        const textareasMultiline = document.querySelectorAll('textarea.MuiInputBase-inputMultiline');
        if (textareasMultiline.length > 0) {
            console.log('✅ Campo de redação (Multiline)');
            return textareasMultiline[0];
        }
        
        for (const textarea of textareas) {
            if (textarea.offsetParent !== null) {
                console.log('✅ Campo de redação (visível)');
                return textarea;
            }
        }
        
        return null;
    }

    // ============================================
    // EXTRAIR TEMA
    // ============================================
    function extrairTemaRedacao() {
        console.log('🔍 Procurando tema...');
        
        const elementos = document.querySelectorAll('p.MuiTypography-body2, p.MuiTypography-root.MuiTypography-body2');
        
        for (const el of elementos) {
            const texto = el.textContent?.trim() || '';
            
            if (texto.toUpperCase().includes('TEMA:')) {
                let tema = texto.replace(/TEMA:\s*/i, '').trim();
                
                if (!tema || tema.length < 5) {
                    const irmao = el.nextElementSibling;
                    if (irmao) tema = irmao.textContent?.trim() || '';
                }
                
                if (!tema || tema.length < 5) {
                    const pai = el.parentElement;
                    if (pai) {
                        const textoPai = pai.textContent?.trim() || '';
                        tema = textoPai.replace(/TEMA:\s*/i, '').trim();
                    }
                }
                
                tema = tema.replace(/^[:\s]+/, '').replace(/[\s]+$/, '').trim();
                
                if (tema.includes('-')) {
                    tema = tema.split('-')[0].trim();
                }
                
                if (tema && tema.length >= 5) {
                    console.log('✅ Tema:', tema);
                    return tema;
                }
            }
        }
        
        return null;
    }

    // ============================================
    // EXTRAIR GÊNERO
    // ============================================
    function extrairGeneroRedacao() {
        const elementos = document.querySelectorAll('p.MuiTypography-body1, p.MuiTypography-root.MuiTypography-body1');
        
        for (const el of elementos) {
            const texto = el.textContent?.trim() || '';
            if (texto.toUpperCase().includes('GÊNERO') || texto.toUpperCase().includes('GENERO')) {
                const irmao = el.nextElementSibling;
                if (irmao) {
                    const genero = irmao.textContent?.trim() || '';
                    console.log('✅ Gênero:', genero);
                    return genero;
                }
            }
        }
        
        return 'DISSERTAÇÃO';
    }

    async function fetchWithTimeout(resource, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    async function gerarRedacaoComMistral(tema, maxPalavras, genero) {
        const minPalavras = Math.floor(maxPalavras * 0.8);
        
        // Prompt mais direto e claro
        const prompt = `Escreva uma redação completa sobre o tema: "${tema}"

Gênero: ${genero}
Palavras: entre ${minPalavras} e ${maxPalavras}

REGRAS IMPORTANTES:
1. NÃO use asteriscos (**), hashtags (##), ou markdown
2. NÃO repita as instruções no texto
3. Escreva apenas o título e a redação

Responda EXATAMENTE neste formato (substitua os colchetes):

TITULO: [escreva aqui apenas o título, uma frase curta]
TEXTO: [escreva aqui a redação completa com todos os parágrafos]`;

        let respostaCompleta = null;

        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const currentKey = MISTRAL_API_KEYS[currentApiKeyIndex];
            
            if (!currentKey || currentKey.trim() === "") {
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
                        max_tokens: 4000
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        respostaCompleta = data.choices[0].message.content;
                        console.log('✅ Resposta recebida!');
                        console.log('📝 Resposta bruta:', respostaCompleta);
                        break;
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('❌ Erro API:', errorData);
                }
            } catch (error) {
                console.warn('❌ Erro:', error.message);
            }

            currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
        }

        if (!respostaCompleta) {
            alert('❌ Erro ao gerar redação!');
            return null;
        }

        // Remove formatação markdown
        respostaCompleta = respostaCompleta
            .replace(/\*\*/g, '')
            .replace(/##/g, '')
            .replace(/__/g, '');

        console.log('📝 Resposta limpa:', respostaCompleta);

        // Extrai título e texto
        let titulo = '';
        let texto = '';
        
        // Tenta encontrar "TITULO:" e "TEXTO:"
        const tituloRegex = /TITULO:\s*(.+?)(?:\n|$)/i;
        const textoRegex = /TEXTO:\s*([\s\S]+)/i;
        
        const tituloMatch = respostaCompleta.match(tituloRegex);
        const textoMatch = respostaCompleta.match(textoRegex);
        
        if (tituloMatch) {
            titulo = tituloMatch[1].trim();
            console.log('📌 Título encontrado:', titulo);
        }
        
        if (textoMatch) {
            texto = textoMatch[1].trim();
            console.log('📄 Texto encontrado (tamanho):', texto.length);
        }
        
        // Se não encontrou, tenta "TÍTULO:" e "REDAÇÃO:"
        if (!titulo || !texto) {
            const tituloRegex2 = /TÍTULO:\s*(.+?)(?:\n|$)/i;
            const textoRegex2 = /REDAÇÃO:\s*([\s\S]+)/i;
            
            const tituloMatch2 = respostaCompleta.match(tituloRegex2);
            const textoMatch2 = respostaCompleta.match(textoRegex2);
            
            if (!titulo && tituloMatch2) {
                titulo = tituloMatch2[1].trim();
            }
            
            if (!texto && textoMatch2) {
                texto = textoMatch2[1].trim();
            }
        }
        
        // Se ainda não encontrou, pega primeira linha como título e resto como texto
        if (!titulo && !texto) {
            const linhas = respostaCompleta.split('\n').filter(l => l.trim());
            if (linhas.length > 1) {
                titulo = linhas[0].trim();
                texto = linhas.slice(1).join('\n').trim();
            } else if (linhas.length === 1) {
                titulo = linhas[0].trim().substring(0, 100);
                texto = linhas[0].trim();
            }
        }
        
        // Se tem título mas não texto, o texto pode estar junto
        if (titulo && !texto) {
            texto = respostaCompleta.replace(titulo, '').trim();
            if (!texto || texto.length < 10) {
                texto = respostaCompleta.trim();
            }
        }
        
        // Se tem texto mas não título
        if (!titulo && texto) {
            const primeiraLinha = texto.split('\n')[0].trim();
            if (primeiraLinha.length < 100) {
                titulo = primeiraLinha;
                texto = texto.split('\n').slice(1).join('\n').trim();
            }
        }
        
        // Limpeza final
        titulo = titulo.replace(/\*/g, '').trim();
        texto = texto.replace(/\*/g, '').trim();
        
        // Garante que título não é o texto inteiro
        if (titulo.length > 200) {
            titulo = titulo.split('.')[0].trim();
            if (titulo.length > 200) {
                titulo = titulo.substring(0, 200);
            }
        }
        
        // Remove linhas em branco extras
        texto = texto.replace(/\n{3,}/g, '\n\n');
        
        const palavras = texto.split(/\s+/).filter(p => p.length > 0).length;
        
        console.log('📌 Título final:', titulo);
        console.log('📄 Texto final (palavras):', palavras);
        console.log('📄 Primeiros 100 caracteres:', texto.substring(0, 100));
        
        return { titulo, texto, palavras };
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
        
        try {
            if (isInputEl) {
                el.readOnly = false;
                el.focus();
                if (el.value) el.setSelectionRange(el.value.length, el.value.length);
            }
        } catch (_) {}

        let i = 0;
        const velocidade = 1; // Máxima velocidade

        function digitar() {
            if (i < texto.length) {
                const ch = texto[i++];
                
                try {
                    if (isInputEl) {
                        const pos = el.selectionStart || el.value.length;
                        el.setRangeText(ch, pos, pos, 'end');
                    } else if (el.isContentEditable) {
                        const doc = el.ownerDocument || document;
                        const sel = doc.getSelection();
                        let range;
                        if (sel && sel.rangeCount) {
                            range = sel.getRangeAt(0).cloneRange();
                        }
                        if (!range || !el.contains(range.commonAncestorContainer)) {
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
                    }
                    
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (_) {}
                
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
            
            if (STATE.autoDeteccao) {
                const campoRedacao = detectarCampoRedacao();
                if (campoRedacao) {
                    console.log('🎯 Auto-inserindo redação...');
                    setTimeout(() => {
                        digitarRapidamente(campoRedacao, STATE.textoRedacao);
                    }, 500);
                    return;
                }
            }
            
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

        STATE.generoRedacao = extrairGeneroRedacao();
        const tema = extrairTemaRedacao();
        
        if (!tema) {
            alert('❌ Tema não encontrado!');
            return;
        }
        
        alert('✅ Tema: "' + tema + '"\n📝 Gênero: ' + STATE.generoRedacao + '\n📊 Palavras: ' + STATE.maxPalavras + '\n🤖 Gerando redação...');

        const resultado = await gerarRedacaoComMistral(tema, STATE.maxPalavras, STATE.generoRedacao);
        if (!resultado) return;

        STATE.tituloRedacao = resultado.titulo;
        STATE.textoRedacao = resultado.texto;

        // Mostra preview no console para debug
        console.log('===================================');
        console.log('TÍTULO:', STATE.tituloRedacao);
        console.log('TEXTO:', STATE.textoRedacao);
        console.log('PALAVRAS:', resultado.palavras);
        console.log('===================================');

        const campoTitulo = detectarCampoTitulo();
        
        if (campoTitulo) {
            alert('✅ Redação criada! (' + resultado.palavras + ' palavras)\n🎯 Inserindo automaticamente...');
            STATE.modo = 'titulo';
            STATE.aguardandoCampo = false;
            digitarRapidamente(campoTitulo, STATE.tituloRedacao);
        } else {
            alert('✅ Redação criada! (' + resultado.palavras + ' palavras)\n🎯 Clique no campo de TÍTULO.');
            STATE.modo = 'titulo';
            STATE.aguardandoCampo = true;
            
            // Instala listener se ainda não tem
            if (!STATE.listenerInstalado) {
                STATE.onDocClick = (e) => {
                    if (!STATE.aguardandoCampo) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    STATE.aguardandoCampo = false;

                    const el = e.target;
                    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) {
                        alert('❌ Campo inválido!');
                        STATE.aguardandoCampo = true;
                        return;
                    }

                    const texto = STATE.modo === 'titulo' ? STATE.tituloRedacao : STATE.textoRedacao;
                    digitarRapidamente(el, texto);
                };
                
                document.addEventListener('click', STATE.onDocClick, true);
                STATE.listenerInstalado = true;
            }
        }
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador carregado!');
    iniciar();

})();
