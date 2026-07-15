// KALIU DIGITADOR - VERSÃO FINAL COMPLETA
(function() {
    'use strict';

    const MISTRAL_API_KEYS = [
        "HJn0dgzp04QzEZkLnMc45lYYQWiIR6QM",
        "", 
        ""
    ];
    
    let currentApiKeyIndex = 0;

    const CONFIG = {
        NAMESPACE: '__kaliudigitador__',
        MODELO_MISTRAL: 'mistral-large-latest',
        API_ENDPOINT: 'https://api.mistral.ai/v1/chat/completions',
        VELOCIDADE: '1',
        MAX_PALAVRAS_PADRAO: 300,
        NOME_USUARIO: 'KALIU'
    };

    // Limpa instância anterior
    (function() {
        const state = window[CONFIG.NAMESPACE];
        if (state) {
            try {
                if (state.typingTimeoutId) clearTimeout(state.typingTimeoutId);
                if (state.onDocClick) document.removeEventListener('click', state.onDocClick, true);
            } catch(e) {}
        }
    })();

    const STATE = {
        typingTimeoutId: null,
        onDocClick: null,
        listenerInstalado: false,
        aguardandoCampo: false,
        modo: 'titulo',
        tituloRedacao: '',
        textoRedacao: '',
        maxPalavras: CONFIG.MAX_PALAVRAS_PADRAO,
        generoRedacao: ''
    };

    window[CONFIG.NAMESPACE] = STATE;

    // ============================================
    // ALTERAR NOME PARA KALIU
    // ============================================
    function alterarNomeKaliu() {
        // Procura elemento do nome (css-1l1p01z)
        const elementosNome = document.querySelectorAll('p.css-1l1p01z, p.MuiTypography-body2.css-1l1p01z');
        
        for (const el of elementosNome) {
            const texto = el.textContent?.trim() || '';
            if (texto.length > 2 && texto.length < 60 && !texto.includes('TEMA') && !texto.includes('GÊNERO')) {
                console.log('👤 Nome alterado:', texto, '→', CONFIG.NOME_USUARIO);
                el.textContent = CONFIG.NOME_USUARIO;
                el.style.color = '#e94560';
                el.style.fontWeight = 'bold';
                return;
            }
        }
        
        // Fallback: procura qualquer elemento com texto curto que pareça nome
        const todosP = document.querySelectorAll('p');
        for (const p of todosP) {
            const texto = p.textContent?.trim() || '';
            const irmaoAnterior = p.previousElementSibling;
            
            // Se tem um elemento antes com "Aluno:" ou similar
            if (irmaoAnterior && /aluno|usuário|user|nome/i.test(irmaoAnterior.textContent || '')) {
                console.log('👤 Nome alterado (fallback):', texto, '→', CONFIG.NOME_USUARIO);
                p.textContent = CONFIG.NOME_USUARIO;
                p.style.color = '#e94560';
                p.style.fontWeight = 'bold';
                return;
            }
        }
    }

    // ============================================
    // ENCONTRAR CAMPOS
    // ============================================
    function encontrarCampoTitulo() {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const input of inputs) {
            if (!input.value && !input.placeholder && input.offsetParent !== null) {
                return input;
            }
        }
        return document.querySelector('input.MuiOutlinedInput-input') || 
               document.querySelector('input.MuiInputBase-input');
    }

    function encontrarCampoRedacao() {
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
            const ph = (ta.placeholder || '').toLowerCase();
            if (ph.includes('comece') || ph.includes('redação') || ph.includes('escreva')) {
                return ta;
            }
        }
        return document.querySelector('textarea.MuiInputBase-inputMultiline') ||
               document.querySelector('textarea');
    }

    // ============================================
    // EXTRAIR DADOS DA PÁGINA
    // ============================================
    function extrairTema() {
        const elementos = document.querySelectorAll('p.MuiTypography-body2');
        for (const el of elementos) {
            const texto = el.textContent?.trim() || '';
            if (texto.toUpperCase().startsWith('TEMA:')) {
                let tema = texto.replace(/TEMA:\s*/i, '').trim();
                
                // Pega do próximo elemento se vazio
                if (!tema || tema.length < 3) {
                    const irmao = el.nextElementSibling;
                    if (irmao) tema = irmao.textContent?.trim() || '';
                }
                
                // Remove informações extras após "-"
                if (tema.includes('-')) tema = tema.split('-')[0].trim();
                
                if (tema.length >= 5) return tema;
            }
        }
        return null;
    }

    function extrairGenero() {
        const elementos = document.querySelectorAll('p.MuiTypography-body1');
        for (const el of elementos) {
            const texto = el.textContent?.trim() || '';
            if (texto.toUpperCase().includes('GÊNERO') || texto.toUpperCase().includes('GENERO')) {
                const irmao = el.nextElementSibling;
                return irmao ? irmao.textContent?.trim() || 'DISSERTAÇÃO' : 'DISSERTAÇÃO';
            }
        }
        return 'DISSERTAÇÃO';
    }

    // ============================================
    // GERAR REDAÇÃO
    // ============================================
    async function gerarRedacao(tema, maxPalavras, genero) {
        const minPalavras = Math.floor(maxPalavras * 0.85);
        
        const prompt = `Escreva uma redação de gênero "${genero}" sobre: "${tema}"

REGRAS:
- Entre ${minPalavras} e ${maxPalavras} palavras
- NÃO use asteriscos, hashtags ou markdown
- Português formal

Responda EXATAMENTE assim:
TITULO: [título]
TEXTO: [redação completa]`;

        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const key = MISTRAL_API_KEYS[currentApiKeyIndex];
            
            if (!key || key.trim() === '') {
                currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
                continue;
            }

            try {
                const resp = await fetch(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: CONFIG.MODELO_MISTRAL,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.8,
                        max_tokens: 4000
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const conteudo = data.choices?.[0]?.message?.content;
                    
                    if (conteudo) {
                        // Limpa formatação
                        const limpo = conteudo.replace(/\*\*/g, '').replace(/##/g, '').replace(/__/g, '');
                        
                        // Extrai título e texto
                        let titulo = '';
                        let texto = '';
                        
                        const t1 = limpo.match(/TITULO:\s*(.+)/i);
                        const t2 = limpo.match(/TEXTO:\s*([\s\S]+)/i);
                        
                        if (t1) titulo = t1[1].trim();
                        if (t2) texto = t2[1].trim();
                        
                        // Fallback
                        if (!titulo || !texto) {
                            const linhas = limpo.split('\n').filter(l => l.trim());
                            if (!titulo && linhas.length > 0) titulo = linhas[0].trim();
                            if (!texto && linhas.length > 1) texto = linhas.slice(1).join('\n').trim();
                            if (!texto) texto = limpo;
                        }
                        
                        titulo = titulo.replace(/\*/g, '').trim();
                        texto = texto.replace(/\*/g, '').trim();
                        
                        if (titulo.length > 150) titulo = titulo.substring(0, 150);
                        
                        const palavras = texto.split(/\s+/).filter(p => p.length > 0).length;
                        
                        return { titulo, texto, palavras };
                    }
                }
            } catch(e) {
                console.warn('Erro chave:', e.message);
            }
            
            currentApiKeyIndex = (currentApiKeyIndex + 1) % MISTRAL_API_KEYS.length;
        }
        
        return null;
    }

    // ============================================
    // DIGITAR TEXTO
    // ============================================
    function digitar(el, texto) {
        if (STATE.typingTimeoutId) clearTimeout(STATE.typingTimeoutId);
        
        STATE.currentElement = el;
        STATE.currentText = texto;
        
        try {
            el.readOnly = false;
            el.focus();
        } catch(e) {}
        
        let i = 0;
        
        function digitarChar() {
            if (i < texto.length) {
                try {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        const pos = el.selectionStart || el.value.length;
                        el.setRangeText(texto[i], pos, pos, 'end');
                    } else if (el.isContentEditable) {
                        document.execCommand('insertText', false, texto[i]);
                    }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                } catch(e) {}
                
                i++;
                STATE.typingTimeoutId = setTimeout(digitarChar, 1);
            } else {
                STATE.typingTimeoutId = null;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                continuar();
            }
        }
        
        STATE.typingTimeoutId = setTimeout(digitarChar, 1);
    }

    // ============================================
    // CONTINUAR FLUXO
    // ============================================
    function continuar() {
        if (STATE.modo === 'titulo') {
            STATE.modo = 'redacao';
            const campoRedacao = encontrarCampoRedacao();
            
            if (campoRedacao) {
                setTimeout(() => digitar(campoRedacao, STATE.textoRedacao), 300);
            } else {
                STATE.aguardandoCampo = true;
                alert('✅ TÍTULO INSERIDO!\n📄 Clique no campo de REDAÇÃO.');
            }
        } else {
            setTimeout(() => {
                const botoes = document.querySelectorAll('button');
                for (const btn of botoes) {
                    if (/salvar|save|enviar|publicar/i.test(btn.textContent || '')) {
                        btn.click();
                        return;
                    }
                }
                alert('✅ CONCLUÍDO!');
            }, 500);
        }
    }

    // ============================================
    // INTERFACE
    // ============================================
    function mostrarInterface(tema, genero, callback) {
        const overlay = document.createElement('div');
        overlay.id = 'kaliu-overlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.8);display:flex;align-items:center;
            justify-content:center;z-index:999999;font-family:Arial,sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);
                padding:30px;border-radius:20px;text-align:center;
                max-width:420px;width:90%;border:2px solid #e94560;
                box-shadow:0 20px 60px rgba(0,0,0,0.5);
            ">
                <div style="font-size:50px;margin-bottom:10px;">⚡</div>
                <h2 style="color:#e94560;margin:0 0 5px;font-size:26px;">KALIU DIGITADOR</h2>
                <p style="color:#888;margin:0 0 20px;font-size:13px;">Premium Auto Redação</p>
                
                <div style="background:rgba(255,255,255,0.05);border-radius:10px;
                    padding:12px;margin:10px 0;text-align:left;">
                    <span style="color:#e94560;font-size:11px;font-weight:bold;">📝 TEMA</span>
                    <p style="color:#fff;margin:5px 0 0;font-size:14px;">${tema}</p>
                </div>
                
                <div style="background:rgba(255,255,255,0.05);border-radius:10px;
                    padding:12px;margin:10px 0;text-align:left;">
                    <span style="color:#e94560;font-size:11px;font-weight:bold;">📄 GÊNERO</span>
                    <p style="color:#fff;margin:5px 0 0;font-size:14px;">${genero}</p>
                </div>
                
                <div style="margin:20px 0;">
                    <p style="color:#aaa;font-size:13px;margin:0 0 8px;">📊 Palavras: 
                        <span id="kaliu-valor" style="color:#e94560;font-size:22px;font-weight:bold;">300</span>
                    </p>
                    <input type="range" id="kaliu-slider" min="50" max="500" value="300" 
                        style="width:100%;accent-color:#e94560;">
                </div>
                
                <button id="kaliu-gerar" style="
                    background:linear-gradient(135deg,#e94560,#c23152);
                    color:#fff;border:none;padding:14px 35px;border-radius:25px;
                    font-size:16px;font-weight:bold;cursor:pointer;margin-top:10px;
                    transition:transform 0.2s;box-shadow:0 5px 20px rgba(233,69,96,0.3);
                ">🚀 GERAR REDAÇÃO</button>
                
                <p style="color:#444;font-size:10px;margin-top:12px;">by KALIU</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('kaliu-slider').oninput = function() {
            document.getElementById('kaliu-valor').textContent = this.value;
        };
        
        document.getElementById('kaliu-gerar').onclick = function() {
            const palavras = parseInt(document.getElementById('kaliu-slider').value);
            document.body.removeChild(overlay);
            callback(palavras);
        };
    }

    function mostrarLoading() {
        const el = document.createElement('div');
        el.id = 'kaliu-loading';
        el.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:rgba(0,0,0,0.9);color:#e94560;padding:20px 40px;
            border-radius:15px;z-index:999999;font-family:Arial,sans-serif;
            font-size:18px;font-weight:bold;
        `;
        el.textContent = '🤖 KALIU GERANDO REDAÇÃO...';
        document.body.appendChild(el);
        return el;
    }

    // ============================================
    // INICIAR
    // ============================================
    async function iniciar() {
        // ALTERA NOME PARA KALIU
        alterarNomeKaliu();
        
        const tema = extrairTema();
        if (!tema) {
            alert('❌ TEMA NÃO ENCONTRADO!');
            return;
        }
        
        const genero = extrairGenero();
        STATE.generoRedacao = genero;
        
        mostrarInterface(tema, genero, async (palavras) => {
            STATE.maxPalavras = palavras;
            
            const loading = mostrarLoading();
            
            const resultado = await gerarRedacao(tema, palavras, genero);
            
            if (loading.parentNode) loading.parentNode.removeChild(loading);
            
            if (!resultado) {
                alert('❌ ERRO AO GERAR REDAÇÃO!');
                return;
            }
            
            STATE.tituloRedacao = resultado.titulo;
            STATE.textoRedacao = resultado.texto;
            
            console.log('📌 TÍTULO:', resultado.titulo);
            console.log('📄 TEXTO:', resultado.texto.substring(0, 100) + '...');
            console.log('📊 PALAVRAS:', resultado.palavras);
            
            const campoTitulo = encontrarCampoTitulo();
            
            if (campoTitulo) {
                STATE.modo = 'titulo';
                digitar(campoTitulo, STATE.tituloRedacao);
            } else {
                alert('✅ REDAÇÃO GERADA! (' + resultado.palavras + ' palavras)\n🎯 Clique no campo de TÍTULO.');
                STATE.modo = 'titulo';
                STATE.aguardandoCampo = true;
                
                if (!STATE.listenerInstalado) {
                    STATE.onDocClick = function(e) {
                        if (!STATE.aguardandoCampo) return;
                        e.preventDefault();
                        e.stopPropagation();
                        STATE.aguardandoCampo = false;
                        
                        const texto = STATE.modo === 'titulo' ? STATE.tituloRedacao : STATE.textoRedacao;
                        digitar(e.target, texto);
                    };
                    document.addEventListener('click', STATE.onDocClick, true);
                    STATE.listenerInstalado = true;
                }
            }
        });
    }

    window.iniciarKaliu = iniciar;
    console.log('⚡ KALIU DIGITADOR CARREGADO!');
    iniciar();

})();
