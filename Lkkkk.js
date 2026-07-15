// KALIU DIGITADOR - COLAGEM INSTANTÂNEA
(function() {
    'use strict';

    // PRIMEIRA COISA: MUDA NOME PARA KALIU
    const nomeEl = document.querySelector('p.css-1l1p01z, p.MuiTypography-body2.css-1l1p01z');
    if (nomeEl && nomeEl.textContent.trim().length > 2 && nomeEl.textContent.trim().length < 60) {
        nomeEl.textContent = 'KALIU';
    }

    // SEGUNDA COISA: FORÇA LIBERAÇÃO DE PASTE/COPY
    const forceEnable = (e) => {
        e.stopImmediatePropagation();
        return true;
    };
    ['paste', 'copy', 'cut', 'keydown', 'keyup', 'keypress', 'input', 'change'].forEach(event => {
        document.addEventListener(event, forceEnable, true);
    });

    const API_KEYS = ["HJn0dgzp04QzEZkLnMc45lYYQWiIR6QM", "", ""];
    let keyIndex = 0;
    let titulo = '';
    let texto = '';
    let maxPalavras = 300;

    function campoInput() {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const i of inputs) {
            if (!i.value && !i.placeholder && i.offsetParent) return i;
        }
        return document.querySelector('input.MuiInputBase-input') || document.querySelector('input');
    }

    function campoTextarea() {
        const tas = document.querySelectorAll('textarea');
        for (const t of tas) {
            if (/comece|redação|escreva/i.test(t.placeholder || '')) return t;
        }
        return document.querySelector('textarea');
    }

    function pegarTema() {
        const els = document.querySelectorAll('p.MuiTypography-body2');
        for (const el of els) {
            const t = el.textContent.trim();
            if (/^TEMA:/i.test(t)) {
                let tema = t.replace(/TEMA:\s*/i, '').trim();
                if (!tema || tema.length < 3) {
                    const irmao = el.nextElementSibling;
                    if (irmao) tema = irmao.textContent.trim();
                }
                if (tema.includes('-')) tema = tema.split('-')[0].trim();
                if (tema.length >= 5) return tema;
            }
        }
        return null;
    }

    function pegarGenero() {
        const els = document.querySelectorAll('p.MuiTypography-body1');
        for (const el of els) {
            if (/GÊNERO|GENERO/i.test(el.textContent)) {
                const irmao = el.nextElementSibling;
                return irmao ? irmao.textContent.trim() : 'DISSERTAÇÃO';
            }
        }
        return 'DISSERTAÇÃO';
    }

    // Remove TODAS as restrições do campo
    function liberarCampo(el) {
        try {
            // Remove atributos bloqueadores
            el.removeAttribute('readonly');
            el.removeAttribute('disabled');
            el.removeAttribute('onpaste');
            el.removeAttribute('oncopy');
            el.removeAttribute('oncut');
            el.removeAttribute('onkeydown');
            el.removeAttribute('onkeyup');
            el.removeAttribute('onkeypress');
            el.removeAttribute('oninput');
            
            el.readOnly = false;
            el.disabled = false;
            
            // Remove listeners antigos
            const novoEl = el.cloneNode(true);
            if (el.parentNode) {
                el.parentNode.replaceChild(novoEl, el);
            }
            
            return novoEl;
        } catch(e) {
            return el;
        }
    }

    // COLA TEXTO INSTANTANEAMENTE (simula paste real)
    function colarInstantaneo(el, txt) {
        const campo = liberarCampo(el);
        
        // Tenta método 1: simular evento paste
        try {
            campo.focus();
            
            // Cria DataTransfer com o texto
            const dt = new DataTransfer();
            dt.setData('text/plain', txt);
            
            // Cria e dispara evento paste
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt
            });
            
            campo.dispatchEvent(pasteEvent);
            
            // Verifica se colou
            setTimeout(() => {
                const valorAtual = campo.value || campo.textContent || '';
                if (valorAtual.includes(txt.substring(0, 20))) {
                    console.log('✅ Colado via paste event');
                    campo.dispatchEvent(new Event('input', { bubbles: true }));
                    campo.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }
            }, 100);
            
        } catch(e) {
            console.warn('Método 1 falhou:', e.message);
        }
        
        // Método 2: setRangeText
        try {
            campo.focus();
            
            if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
                campo.select();
                campo.setRangeText(txt, 0, campo.value.length, 'end');
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('✅ Colado via setRangeText');
                return;
            }
        } catch(e) {
            console.warn('Método 2 falhou:', e.message);
        }
        
        // Método 3: value direto + eventos
        try {
            if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
                campo.value = txt;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('✅ Colado via value direto');
                return;
            }
        } catch(e) {
            console.warn('Método 3 falhou:', e.message);
        }
        
        // Método 4: innerText para contenteditable
        try {
            if (campo.isContentEditable) {
                campo.innerText = txt;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Colado via innerText');
                return;
            }
        } catch(e) {
            console.warn('Método 4 falhou:', e.message);
        }
        
        // Método 5: document.execCommand (último recurso)
        try {
            campo.focus();
            campo.select();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, txt);
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('✅ Colado via execCommand');
        } catch(e) {
            console.error('❌ Todos os métodos falharam');
        }
    }

    async function gerar(tema, palavras, genero) {
        const min = Math.floor(palavras * 0.85);
        const prompt = `Escreva ${genero} sobre: "${tema}". ${min}-${palavras} palavras. Sem markdown.\nTITULO: [título]\nTEXTO: [redação]`;

        for (let i = 0; i < API_KEYS.length; i++) {
            const key = API_KEYS[keyIndex];
            if (!key || key.trim() === '') {
                keyIndex = (keyIndex + 1) % API_KEYS.length;
                continue;
            }

            try {
                const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: 'mistral-large-latest',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.8,
                        max_tokens: 4000
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const conteudo = data.choices?.[0]?.message?.content;
                    if (!conteudo) continue;
                    
                    const limpo = conteudo.replace(/\*\*|##|__/g, '');
                    
                    let tit = '', tex = '';
                    const m1 = limpo.match(/TITULO:\s*(.+)/i);
                    const m2 = limpo.match(/TEXTO:\s*([\s\S]+)/i);
                    
                    if (m1) tit = m1[1].trim();
                    if (m2) tex = m2[1].trim();
                    
                    if (!tit || !tex) {
                        const linhas = limpo.split('\n').filter(l => l.trim());
                        if (!tit && linhas.length > 0) tit = linhas[0].trim();
                        if (!tex) tex = linhas.slice(1).join('\n').trim();
                        if (!tex) tex = limpo;
                    }
                    
                    tit = tit.replace(/\*/g, '').trim();
                    tex = tex.replace(/\*/g, '').trim().replace(/\n{3,}/g, '\n\n');
                    if (tit.length > 150) tit = tit.substring(0, 150);
                    
                    const p = tex.split(/\s+/).filter(w => w.length > 0).length;
                    return { titulo: tit, texto: tex, palavras: p };
                }
            } catch(e) {}
            
            keyIndex = (keyIndex + 1) % API_KEYS.length;
        }
        return null;
    }

    async function iniciar() {
        const tema = pegarTema();
        if (!tema) return alert('❌ Tema não encontrado!');
        
        const genero = pegarGenero();
        const p = prompt('📝 Quantas palavras? (50-500)', '300');
        maxPalavras = parseInt(p) || 300;
        if (maxPalavras < 50) maxPalavras = 300;
        if (maxPalavras > 500) maxPalavras = 500;
        
        alert('🤖 KALIU gerando redação... Aguarde.');
        
        const res = await gerar(tema, maxPalavras, genero);
        if (!res) return alert('❌ Erro ao gerar!');
        
        titulo = res.titulo;
        texto = res.texto;
        
        console.log('📌', titulo);
        console.log('📄', res.palavras + ' palavras');
        
        // INSERE TÍTULO
        const inp = campoInput();
        if (inp) {
            colarInstantaneo(inp, titulo);
            
            // Espera um pouco e insere redação
            setTimeout(() => {
                const ta = campoTextarea();
                if (ta) {
                    colarInstantaneo(ta, texto);
                    
                    // Tenta salvar
                    setTimeout(() => {
                        const btns = document.querySelectorAll('button');
                        for (const b of btns) {
                            if (/salvar|save|enviar|publicar/i.test(b.textContent || '')) {
                                b.click();
                                alert('✅ KALIU concluído!');
                                return;
                            }
                        }
                        alert('✅ Redação inserida!');
                    }, 500);
                } else {
                    alert('✅ Título inserido!\n📄 Clique no campo de REDAÇÃO.');
                }
            }, 300);
        } else {
            alert('✅ Redação pronta!\n🎯 Clique no campo de TÍTULO.');
        }
    }

    window.kaliu = iniciar;
    console.log('⚡ KALIU DIGITADOR - MODO COLAGEM INSTANTÂNEA');
    iniciar();

})();
