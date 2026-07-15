// KALIU DIGITADOR - VERSÃO COMPACTA FINAL
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
    ['paste', 'copy', 'cut', 'keydown', 'keyup', 'keypress'].forEach(event => {
        document.addEventListener(event, forceEnable, true);
    });

    const API_KEYS = ["HJn0dgzp04QzEZkLnMc45lYYQWiIR6QM", "", ""];
    let keyIndex = 0;
    let timeout = null;
    let clickHandler = null;
    let esperando = false;
    let modo = 'titulo';
    let titulo = '';
    let texto = '';
    let maxPalavras = 300;

    // Encontra campos
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

    // Extrai tema
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

    // Extrai gênero
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

    // Remove restrições do campo
    function liberarCampo(el) {
        try {
            el.readOnly = false;
            el.disabled = false;
            el.removeAttribute('readonly');
            el.removeAttribute('disabled');
            
            // Remove handlers que bloqueiam
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
            
            return clone;
        } catch(e) {
            return el;
        }
    }

    // Gera redação
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

    // Digita em lotes de palavras
    function digitarLotes(el, txt) {
        if (timeout) clearTimeout(timeout);
        
        // Libera o campo antes de começar
        const campo = liberarCampo(el);
        
        try {
            campo.focus();
            if (campo.value) {
                campo.setSelectionRange(campo.value.length, campo.value.length);
            }
        } catch(e) {}
        
        const palavras = txt.split(/(\s+)/);
        let i = 0;
        
        function lote() {
            if (i < palavras.length) {
                const pedaco = palavras.slice(i, i + 3).join('');
                i += 3;
                
                try {
                    if (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA') {
                        const pos = campo.selectionStart || campo.value.length;
                        campo.setRangeText(pedaco, pos, pos, 'end');
                    } else if (campo.isContentEditable) {
                        document.execCommand('insertText', false, pedaco);
                    }
                    campo.dispatchEvent(new Event('input', { bubbles: true }));
                } catch(e) {
                    // Fallback: tenta inserir diretamente
                    try {
                        campo.value = (campo.value || '') + pedaco;
                        campo.dispatchEvent(new Event('input', { bubbles: true }));
                    } catch(e2) {}
                }
                
                timeout = setTimeout(lote, 10);
            } else {
                timeout = null;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.dispatchEvent(new Event('change', { bubbles: true }));
                continuar();
            }
        }
        
        timeout = setTimeout(lote, 10);
    }

    function continuar() {
        if (modo === 'titulo') {
            modo = 'redacao';
            const ta = campoTextarea();
            if (ta) {
                setTimeout(() => digitarLotes(ta, texto), 300);
            } else {
                esperando = true;
                alert('✅ Título inserido!\n📄 Clique no campo de REDAÇÃO.');
            }
        } else {
            setTimeout(() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (/salvar|save|enviar|publicar/i.test(b.textContent || '')) {
                        b.click();
                        return;
                    }
                }
                alert('✅ Concluído!');
            }, 500);
        }
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
        
        const inp = campoInput();
        if (inp) {
            modo = 'titulo';
            digitarLotes(inp, titulo);
        } else {
            alert('✅ Pronto! Clique no campo de TÍTULO.');
            modo = 'titulo';
            esperando = true;
            
            if (!clickHandler) {
                clickHandler = function(e) {
                    if (!esperando) return;
                    e.preventDefault();
                    e.stopPropagation();
                    esperando = false;
                    digitarLotes(e.target, modo === 'titulo' ? titulo : texto);
                };
                document.addEventListener('click', clickHandler, true);
            }
        }
    }

    window.kaliu = iniciar;
    console.log('⚡ KALIU DIGITADOR CARREGADO!');
    iniciar();

})();
