// AUTO DIGITADOR - Versão para Redação Paraná
(function() {
    'use strict';

    let digitando = false;
    let timeoutId = null;
    let elementoAlvo = null;
    let textoCompleto = '';
    let indiceAtual = 0;
    let textoAnterior = '';

    // ============================================
    // FUNÇÃO DE DIGITAÇÃO COM EVENTOS COMPLETOS
    // ============================================
    function digitarProximo() {
        if (!digitando || indiceAtual >= textoCompleto.length) {
            if (indiceAtual >= textoCompleto.length) {
                alert('✅ Digitação concluída!');
                digitando = false;
            }
            return;
        }

        const char = textoCompleto[indiceAtual];
        const elemento = elementoAlvo;

        try {
            // ===== INSERE O CARACTERE =====
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                const start = elemento.selectionStart || 0;
                const currentValue = elemento.value || '';
                
                // Insere o caractere
                const novoValor = currentValue.substring(0, start) + char + currentValue.substring(start);
                elemento.value = novoValor;
                
                // Move o cursor
                const newPos = start + 1;
                elemento.setSelectionRange(newPos, newPos);
                
                // Força o scroll para acompanhar
                elemento.scrollTop = elemento.scrollHeight;
                
            } else if (elemento.isContentEditable) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const textNode = document.createTextNode(char);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            // ===== DISPARA EVENTOS EM ORDEM =====
            // 1. Keydown
            elemento.dispatchEvent(new KeyboardEvent('keydown', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));
            
            // 2. Keypress
            elemento.dispatchEvent(new KeyboardEvent('keypress', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));
            
            // 3. Input (MAIS IMPORTANTE)
            elemento.dispatchEvent(new Event('input', { 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));
            
            // 4. Change
            elemento.dispatchEvent(new Event('change', { 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));
            
            // 5. Keyup
            elemento.dispatchEvent(new KeyboardEvent('keyup', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));

            // ===== REACT: Força atualização =====
            if (elemento._reactInternalInstance || elemento.__reactInternalInstance) {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeSetter) {
                    nativeSetter.call(elemento, elemento.value);
                }
                // Dispara evento de mudança do React
                const ev = new Event('input', { bubbles: true });
                const nativeInputEv = new Event('input', { bubbles: true });
                elemento.dispatchEvent(nativeInputEv);
            }

            // ===== VUE: Força atualização =====
            if (elemento.__vue__ || elemento._vnode) {
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // ===== ANGULAR: Força atualização =====
            if (elemento.ngControl || elemento._ngZone) {
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
            }

        } catch (e) {
            console.error('Erro:', e);
            alert('❌ Erro ao digitar!');
            digitando = false;
            return;
        }

        indiceAtual++;

        // ===== DELAY MAIS REALISTA =====
        let delay = 50; // base
        
        // Variação para parecer humano
        if (char === ' ') {
            delay = 120 + Math.random() * 30;
        } else if ('.!?'.includes(char)) {
            delay = 150 + Math.random() * 50;
        } else if (char === ',' || char === ';') {
            delay = 80 + Math.random() * 20;
        } else if (char === '\n') {
            delay = 300 + Math.random() * 100;
        } else {
            delay = 40 + Math.random() * 40;
        }

        // A cada 10 caracteres, uma pausa mais longa
        if (indiceAtual % 10 === 0 && indiceAtual > 0) {
            delay += 80 + Math.random() * 40;
        }

        timeoutId = setTimeout(digitarProximo, Math.max(10, delay));
    }

    // ============================================
    // FUNÇÃO PARA DETECTAR SE O TEXTO FOI APAGADO
    // ============================================
    function monitorarCampo() {
        if (!elementoAlvo || !digitando) return;
        
        const valorAtual = elementoAlvo.value || '';
        const textoEsperado = textoCompleto.substring(0, indiceAtual);
        
        // Se o texto foi apagado, restaura
        if (valorAtual.length < textoEsperado.length && valorAtual.length > 0) {
            console.log('🔄 Texto apagado, restaurando...');
            elementoAlvo.value = textoEsperado;
            elementoAlvo.dispatchEvent(new Event('input', { bubbles: true }));
            elementoAlvo.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Se o campo foi limpo completamente
        if (valorAtual.length === 0 && indiceAtual > 0) {
            console.log('🔄 Campo limpo, restaurando...');
            elementoAlvo.value = textoEsperado;
            elementoAlvo.dispatchEvent(new Event('input', { bubbles: true }));
            elementoAlvo.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ============================================
    // FUNÇÃO PRINCIPAL
    // ============================================
    function iniciarDigitacao() {
        if (digitando) {
            if (!confirm('⚠️ Já está digitando. Reiniciar?')) {
                return;
            }
            pararDigitacao();
        }

        alert('📌 1️⃣ CLIQUE no campo de texto');

        const handlerClique = function(e) {
            const elemento = e.target;
            
            const valido = elemento.tagName === 'INPUT' || 
                          elemento.tagName === 'TEXTAREA' || 
                          elemento.isContentEditable;
            
            if (!valido) {
                alert('❌ Clique em um campo de texto!');
                return;
            }

            document.removeEventListener('click', handlerClique);

            const texto = prompt('📝 2️⃣ Cole ou digite o texto:');
            if (!texto || texto.trim() === '') {
                alert('❌ Texto vazio!');
                return;
            }

            elementoAlvo = elemento;
            textoCompleto = texto;
            indiceAtual = 0;
            digitando = true;

            // Limpa o campo
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                elemento.value = '';
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (elemento.isContentEditable) {
                elemento.innerHTML = '';
            }

            elemento.focus();
            
            // Força o cursor no início
            try {
                if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                    elemento.setSelectionRange(0, 0);
                }
            } catch(e) {}

            alert('🚀 Digitando... (não mexa no campo)');
            
            // Inicia o monitoramento
            const monitorInterval = setInterval(() => {
                if (!digitando) {
                    clearInterval(monitorInterval);
                    return;
                }
                monitorarCampo();
            }, 1000);

            // Armazena o interval para limpar depois
            window._monitorInterval = monitorInterval;

            // Começa a digitar
            setTimeout(digitarProximo, 500);
        };

        document.addEventListener('click', handlerClique);

        setTimeout(() => {
            document.removeEventListener('click', handlerClique);
        }, 30000);
    }

    function pararDigitacao() {
        digitando = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (window._monitorInterval) {
            clearInterval(window._monitorInterval);
            window._monitorInterval = null;
        }
        alert('⏹ Digitação interrompida!');
    }

    // ============================================
    // MÉTODO ALTERNATIVO - COM PAUSAS ESTRATÉGICAS
    // ============================================
    function digitarComPausas() {
        iniciarDigitacao();
    }

    // ============================================
    // ATALHOS
    // ============================================
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            iniciarDigitacao();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            pararDigitacao();
        }
    });

    window.autoTyper = {
        iniciar: iniciarDigitacao,
        parar: pararDigitacao,
        start: iniciarDigitacao,
        stop: pararDigitacao,
        pausado: false
    };

    console.log('🤖 Auto Digitador - Redação Paraná');
    console.log('📝 Comandos: autoTyper.iniciar() | autoTyper.parar()');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');
    console.log('⚠️ Não mexa no campo durante a digitação!');

    setTimeout(() => {
        if (confirm('🤖 Auto Digitador carregado!\n\n⚠️ Não mexa no campo durante a digitação!\n\nIniciar agora?')) {
            iniciarDigitacao();
        }
    }, 500);

})();
