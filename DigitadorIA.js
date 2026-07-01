// AUTO DIGITADOR COM GEMINI - VERSÃO GRATUITA
(function() {
    'use strict';

    const CONFIG = {
        NAMESPACE: '__digitadorV4__',
        MODELO_GEMINI: 'gemini-2.0-flash',
        API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
        CLASSE_TEMA: 'MuiTypography-root MuiTypography-body2 css-k1sw4y',
        DELAY_SALVAR: 500,
        DELAY_COLAGEM: 200
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
        currentSpeed: '40',
        modo: 'titulo',
        pasteHandler: null,
        tituloRedacao: '',
        textoRedacao: '',
        apiKey: '',
        usarColagem: false
    };

    window[CONFIG.NAMESPACE] = STATE;

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
- 2-3 parágrafos de desenvolvimento
- Conclusão com proposta de intervenção
- Entre 20-30 linhas
- Linguagem formal e culta

Responda EXATAMENTE neste formato:
TÍTULO: [título]
REDAÇÃO: [texto completo]`;

        try {
            const url = `${CONFIG.API_ENDPOINT}/${CONFIG.MODELO_GEMINI}:generateContent?key=${STATE.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
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
            const tituloMatch = textoCompleto.match(/TÍTULO:\s*(.+?)(?:\n|$)/);
            const redacaoMatch = textoCompleto.match(/REDAÇÃO:\s*([\s\S]+)/);
            
            if (tituloMatch && redacaoMatch) {
                return {
                    titulo: tituloMatch[1].trim(),
                    redacao: redacaoMatch[1].trim()
                };
            }
            
            const linhas = textoCompleto.split('\n').filter(l => l.trim());
            return {
                titulo: linhas[0].replace(/^#+\s*/, '').replace('TÍTULO:', '').trim(),
                redacao: linhas.slice(1).join('\n').replace('REDAÇÃO:', '').trim()
            };

        } catch (error) {
            console.error('Erro Gemini:', error);
            alert('❌ Erro ao gerar redação: ' + error.message);
            return null;
        }
    }

    function instalarListenerClique() {
        if (STATE.listenerInstalado && STATE.onDocClick) {
            document.removeEventListener('click', STATE.onDocClick, true);
            STATE.listenerInstalado = false;
        }

        STATE.onDocClick = (e) => {
            if (!STATE.aguardandoCampo) return;
            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV4-'))) return;

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

    function colarTexto(el, texto) {
        try {
            liberarColagem();
            el.focus();
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                ).set;
                nativeSetter.call(el, texto);
            } else if (el.isContentEditable) {
                el.innerText = texto;
            }
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

        if (STATE.currentSpeed === 'instant') {
            colarTexto(el, texto);
            setTimeout(() => continuarFluxo(), CONFIG.DELAY_COLAGEM);
            return;
        }

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
                if (i > 0 && Math.random() < 0.05) return 500 + Math.random() * 1000;
                return 100 + Math.random() * 200;
            }
            return parseInt(STATE.currentSpeed, 10) || 40;
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

    async function iniciar() {
        if (!STATE.apiKey) {
            STATE.apiKey = prompt('🔑 Digite sua API Key do Gemini:');
            if (!STATE.apiKey || !STATE.apiKey.trim()) {
                alert('❌ API Key é obrigatória!');
                return;
            }
            STATE.apiKey = STATE.apiKey.trim();
        }

        if (!STATE.currentSpeed || STATE.currentSpeed === '40') {
            const usarColagem = confirm('📋 Deseja usar COLAGEM instantânea?\n\nOK = Colar texto\nCancelar = Digitar');
            if (usarColagem) {
                STATE.currentSpeed = 'instant';
                STATE.usarColagem = true;
            } else {
                const opcao = prompt(
                    '⚡ Escolha a velocidade:\n\n' +
                    '1 - Muito Rápido (10ms)\n' +
                    '2 - Normal (40ms)\n' +
                    '3 - Devagar (70ms)\n' +
                    '4 - Muito Devagar (100ms)\n' +
                    '5 - Humana (aleatório)\n\n' +
                    'Digite o número:',
                    '2'
                );
                const velocidades = { '1': '10', '2': '40', '3': '70', '4': '100', '5': 'humana' };
                STATE.currentSpeed = velocidades[opcao] || '40';
                STATE.usarColagem = false;
            }
        }

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
        
        alert('✅ REDAÇÃO GERADA!\n\nTítulo: "' + redacao.titulo + '"\n\n🎯 Clique no campo de TÍTULO.');

        STATE.modo = 'titulo';
        STATE.aguardandoCampo = true;
        instalarListenerClique();
    }

    window.iniciarDigitadorV4 = iniciar;
    console.log('🚀 Digitador IA carregado! Digite window.iniciarDigitadorV4() para começar.');
    iniciar();

})();
