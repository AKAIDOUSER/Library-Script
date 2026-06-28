// AUTO DIGITADOR COM IA - VERSÃO 3.0
(function() {
    'use strict';

    const NS = '__digitadorV3__';

    // ========================
    // CONFIGURAÇÃO DA API
    // ========================
    const CONFIG = {
        // 🔑 COLOQUE SUA API KEY AQUI
        DEEPSEEK_API_KEY: 'sk-95c12e2ebbee4589a269ef9fc9cb9930',
        API_URL: 'https://api.deepseek.com/v1/chat/completions',
        MODEL: 'deepseek-chat'
    };

    // ========================
    // LIMPEZA DE EXECUÇÕES ANTERIORES
    // ========================
    if (window[NS]) {
        try {
            if (window[NS].listenerInstalado && window[NS].onDocClick) {
                document.removeEventListener('click', window[NS].onDocClick, true);
            }
            if (window[NS].typingIntervalId) clearTimeout(window[NS].typingIntervalId);
            if (window[NS].digitarTimeout) clearTimeout(window[NS].digitarTimeout);
        } catch (_) {}
    }

    // ========================
    // ESTADO GLOBAL
    // ========================
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
        tituloRedacao: '',
        temaRedacao: '',
        palavrasMinimas: 0
    };

    // ========================
    // FUNÇÃO PARA GERAR REDAÇÃO COM IA
    // ========================
    async function gerarRedacaoComIA(tema, palavrasMinimas) {
        try {
            // Mostra popup de carregamento
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'digitadorV2-loading';
            loadingMsg.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                z-index: 999999;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 18px;
            `;
            loadingMsg.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 15px;">🤖</div>
                <div style="font-weight: bold; margin-bottom: 10px;">Gerando redação com IA...</div>
                <div style="font-size: 14px; color: #666;">Isso pode levar alguns segundos</div>
                <div style="margin-top: 15px;">
                    <div style="display: inline-block; width: 30px; height: 30px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loadingMsg);

            // Verifica se a API key está configurada
            if (CONFIG.DEEPSEEK_API_KEY === 'sua-api-key-aqui') {
                throw new Error('⚠️ Configure sua API Key do DeepSeek no código (linha 14)');
            }

            // Prepara o prompt
            const prompt = `Escreva uma redação sobre o tema: "${tema}". 
            A redação deve ter aproximadamente ${palavrasMinimas} palavras.
            A redação deve ser bem estruturada com introdução, desenvolvimento e conclusão.
            Não inclua título no texto.
            Apenas o conteúdo da redação.`;

            // Faz a requisição para a API
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um assistente especialista em escrever redações de alta qualidade.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const textoGerado = data.choices[0].message.content.trim();

            // Gera um título para a redação
            const tituloPrompt = `Gere apenas o título para uma redação sobre o tema: "${tema}". 
            O título deve ser criativo, conciso e ter no máximo 10 palavras.
            Responda APENAS com o título, sem aspas ou formatação.`;

            const tituloResponse = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um especialista em criar títulos criativos para redações.'
                        },
                        {
                            role: 'user',
                            content: tituloPrompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 50
                })
            });

            let titulo = '';
            if (tituloResponse.ok) {
                const tituloData = await tituloResponse.json();
                titulo = tituloData.choices[0].message.content.trim();
            } else {
                titulo = `Redação sobre ${tema}`;
            }

            // Remove o loading
            document.body.removeChild(loadingMsg);

            // Salva o título
            window[NS].tituloRedacao = titulo;

            return {
                texto: textoGerado,
                titulo: titulo
            };

        } catch (error) {
            // Remove o loading se existir
            const loading = document.getElementById('digitadorV2-loading');
            if (loading) document.body.removeChild(loading);
            
            alert(`❌ Erro ao gerar redação: ${error.message}`);
            throw error;
        }
    }

    // ========================
    // LISTENER ÚNICO DE CLIQUE
    // ========================
    function ensureListenerInstalled() {
        if (window[NS].listenerInstalado && window[NS].onDocClick) {
            document.removeEventListener('click', window[NS].onDocClick, true);
            window[NS].listenerInstalado = false;
        }

        const onDocClick = async (e) => {
            if (!window[NS].aguardandoCampo) return;

            const path = e.composedPath ? e.composedPath() : [];
            if (path.some(n => n && n.id && String(n.id).startsWith('digitadorV2-'))) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            window[NS].aguardandoCampo = false;

            const el = e.target;
            if (!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
                alert('❌ Esse não é um campo válido.');
                return;
            }

            try {
                // ========================
                // POPUP 1: TEMA DA REDAÇÃO
                // ========================
                const tema = prompt(
                    '📝 TEMA DA REDAÇÃO\n\n' +
                    'Digite o tema sobre o qual a redação deve ser escrita:\n' +
                    '(Exemplo: "A importância da inteligência artificial na educação")',
                    ''
                );
                if (tema === null) return;
                if (!tema.trim()) {
                    alert('❌ O tema não pode estar vazio.');
                    return;
                }

                // ========================
                // POPUP 2: PALAVRAS MÍNIMAS
                // ========================
                const palavrasInput = prompt(
                    '📊 QUANTIDADE DE PALAVRAS\n\n' +
                    'Digite o número mínimo de palavras que a redação deve ter:\n' +
                    '(Exemplo: 300)',
                    '300'
                );
                if (palavrasInput === null) return;
                
                const palavrasMinimas = parseInt(palavrasInput, 10);
                if (isNaN(palavrasMinimas) || palavrasMinimas < 50) {
                    alert('❌ Por favor, digite um número válido (mínimo 50 palavras).');
                    return;
                }

                // ========================
                // PERGUNTA VELOCIDADE
                // ========================
                const vel = prompt(
                    '⚡ VELOCIDADE DE DIGITAÇÃO\n\n' +
                    '10 - Muito Rápido\n' +
                    '20 - Rápido\n' +
                    '40 - Normal (padrão)\n' +
                    '60 - Devagar\n' +
                    '100 - Muito Devagar\n' +
                    'humana - Velocidade Humana\n\n' +
                    'Digite o valor:',
                    '40'
                );

                const velocidade = vel || '40';

                // ========================
                // GERAR REDAÇÃO COM IA
                // ========================
                alert('🤖 Gerando redação com IA... (aguarde)');
                
                const resultado = await gerarRedacaoComIA(tema, palavrasMinimas);
                
                if (!resultado || !resultado.texto) {
                    throw new Error('Não foi possível gerar a redação.');
                }

                // Inicia a digitação
                iniciarDigitacao(el, resultado.texto, velocidade, resultado.titulo);

            } catch (error) {
                console.error('Erro:', error);
                alert(`❌ Ocorreu um erro: ${error.message}`);
            }
        };

        window[NS].onDocClick = onDocClick;
        document.addEventListener('click', onDocClick, true);
        window[NS].listenerInstalado = true;
    }

    // ========================
    // API PÚBLICA
    // ========================
    window.iniciarModV3 = function() {
        ensureListenerInstalled();
        window[NS].aguardandoCampo = true;
        alert('✍️ Clique no campo onde deseja digitar a redação gerada pela IA.');
    };

    // ========================
    // FUNÇÕES DE INSERÇÃO DE CARACTERES
    // ========================
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

    // ========================
    // FUNÇÃO PRINCIPAL DE DIGITAÇÃO
    // ========================
    function iniciarDigitacao(el, texto, velocidade, titulo) {
        // Limpa timeout anterior
        if (window[NS].typingTimeoutId) {
            clearTimeout(window[NS].typingTimeoutId);
            window[NS].typingTimeoutId = null;
        }

        // Salva estado
        window[NS].currentElement = el;
        window[NS].currentText = texto;
        window[NS].currentIndex = 0;
        window[NS].currentSpeed = velocidade;

        const isInputEl = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        const isContentEditable = !!el.isContentEditable;

        // Prepara o campo
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
        const speed = velocidade;

        function obterProximoIntervalo() {
            if (speed === 'humana') {
                if (i > 0 && Math.random() < 0.05) {
                    return 500 + Math.random() * 1000;
                }
                return 100 + Math.random() * 200;
            } else {
                return parseInt(speed, 10) || 40;
            }
        }

        function digitarProximoCaractere() {
            if (window[NS].paused) return;

            if (i < texto.length) {
                const c = texto[i++];

                // Insere o caractere
                if (isInputEl) {
                    inserirCharEmInput(el, c);
                } else if (isContentEditable) {
                    inserirCharEmContentEditable(el, c);
                } else {
                    try {
                        el.innerText = (el.innerText || '') + c;
                    } catch (_) {}
                }

                // Dispara eventos
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                if (i % 25 === 0) {
                    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
                }

                window[NS].currentIndex = i;
                window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
            } else {
                // Finalização
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

                // ========================
                // POPUP FINAL COM O TÍTULO
                // ========================
                alert(`✅ Digitação concluída!\n\n📖 Título: ${titulo || 'Sem título'}`);
            }
        }

        // Inicia
        alert(`🚀 Digitando redação: "${titulo || 'Sem título'}"`);
        window[NS].typingTimeoutId = setTimeout(digitarProximoCaractere, obterProximoIntervalo());
    }

    // ========================
    // INÍCIO IMEDIATO
    // ========================
    window.iniciarModV3();

    // Instruções no console
    console.log('%c🤖 Auto Digitador com IA - V3.0', 'font-size: 20px; font-weight: bold;');
    console.log('%c📌 Configure sua API Key do DeepSeek na linha 14 do script', 'color: #ff6b6b;');
    console.log('%c🚀 Execute window.iniciarModV3() para iniciar', 'color: #4ecdc4;');
})();
