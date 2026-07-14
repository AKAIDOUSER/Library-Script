// AUTO DIGITADOR COM MISTRAL - CORRIGIDO (TEMA CORRETO)
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
        VELOCIDADE_PADRAO: '10'
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
        usarColagem: false
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // EXTRAIR TEMA CORRETO
    // ============================================
    function extrairTemaRedacao() {
        // Pega TODOS os elementos com a classe
        const elementos = document.querySelectorAll('p.' + CONFIG.CLASSE_TEMA.replace(/ /g, '.'));
        
        console.log('🔍 Elementos encontrados:', elementos.length);
        
        // Array para armazenar os textos
        const textos = [];
        
        elementos.forEach((el, index) => {
            const texto = el.textContent.trim();
            console.log(`📄 Elemento ${index}: "${texto}"`);
            textos.push(texto);
        });
        
        // ESTRATÉGIA: Pula tokens e IDs
        // Um token/ID geralmente tem padrão hexadecimal (7FB42F63-647)
        // O tema real é um texto descritivo
        
        for (const texto of textos) {
            // Pula se for muito curto (token)
            if (texto.length < 10) continue;
            
            // Pula se parece um token/ID (hexadecimal)
            if (/^[A-F0-9-]+$/i.test(texto) && texto.length < 40) {
                console.log('⏭️ Pulando token:', texto);
                continue;
            }
            
            // Pula se contém "TEMA:" (é o label, não o tema)
            if (texto.toUpperCase().startsWith('TEMA')) continue;
            
            // Se chegou aqui, é provavelmente o tema
            console.log('✅ Tema encontrado:', texto);
            return texto;
        }
        
        // Fallback: pega o texto mais longo que não seja token
        const textoMaisLongo = textos
            .filter(t => t.length > 20 && !/^[A-F0-9-]+$/i.test(t))
            .sort((a, b) => b.length - a.length)[0];
        
        if (textoMaisLongo) {
            console.log('✅ Tema (fallback):', textoMaisLongo);
            return textoMaisLongo;
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

    async function gerarRedacaoComMistral(tema) {
        const prompt = `Você é um professor de redação. Escreva uma redação dissertativa-argumentativa completa sobre o tema: "${tema}".
        
Instruções:
- Crie um título criativo e relevante ao tema
- Faça uma introdução com tese clara
- Desenvolva em 2-3 parágrafos com argumentos
- Conclusão com proposta de intervenção
- Use linguagem formal e culta
- A redação deve ter entre 20-30 linhas

IMPORTANTE: Responda EXATAMENTE neste formato:
TÍTULO: [título da redação]
REDAÇÃO: [texto completo da redação]`;

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
                        max_tokens: 2000
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
            titulo: linhas[0].replace('TÍTULO:', '').trim(),
            redacao: linhas.slice(1).join('\n').replace('REDAÇÃO:', '').trim()
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
        STATE.currentSpeed = CONFIG.VELOCIDADE_PADRAO;

        const tema = extrairTemaRedacao();
        if (!tema) {
            alert('❌ Tema não encontrado! Verifique o console (F12).');
            return;
        }
        
        alert('📝 Tema: "' + tema + '"\n\n🤖 Gerando redação com Mistral...');

        const redacao = await gerarRedacaoComMistral(tema);
        if (!redacao) return;

        STATE.tituloRedacao = redacao.titulo;
        STATE.textoRedacao = redacao.redacao;

        alert('✅ Pronto!\n\n🎯 Clique no campo de TÍTULO.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV5 = iniciar;
    console.log('🚀 Digitador V5 (Mistral) carregado!');
    iniciar();

})();
