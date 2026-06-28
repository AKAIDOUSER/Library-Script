// AUTO DIGITADOR - Versão Mais Simples Ainda
(function() {
    'use strict';

    let digitando = false;
    let timeoutId = null;
    let elementoAlvo = null;
    let textoCompleto = '';
    let indiceAtual = 0;

    // Velocidade fixa - boa para a maioria dos casos
    const VELOCIDADE = 50; // milissegundos entre caracteres

    // Função que digita um caractere por vez
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
            // Para INPUT e TEXTAREA
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                const posicao = elemento.selectionStart || 0;
                const valorAtual = elemento.value || '';
                
                elemento.value = valorAtual.substring(0, posicao) + char + valorAtual.substring(posicao);
                elemento.setSelectionRange(posicao + 1, posicao + 1);
                
            } else if (elemento.isContentEditable) {
                // Para conteúdo editável
                const selecao = window.getSelection();
                if (selecao && selecao.rangeCount > 0) {
                    const range = selecao.getRangeAt(0);
                    const node = document.createTextNode(char);
                    range.insertNode(node);
                    range.setStartAfter(node);
                    range.collapse(true);
                    selecao.removeAllRanges();
                    selecao.addRange(range);
                }
            }

            // Dispara eventos para sites modernos
            elemento.dispatchEvent(new Event('input', { bubbles: true }));
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));

            // Para React
            if (elemento._reactInternalInstance || elemento.__reactInternalInstance) {
                const setter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (setter) {
                    setter.call(elemento, elemento.value);
                }
            }

        } catch (e) {
            alert('❌ Erro ao digitar: ' + e.message);
            digitando = false;
            return;
        }

        indiceAtual++;

        // Delay com variação para parecer humano
        let delay = VELOCIDADE;
        if (char === ' ' || char === '\n') {
            delay = VELOCIDADE * 3;
        } else if ('.!?'.includes(char)) {
            delay = VELOCIDADE * 2;
        }
        delay += Math.random() * 15;

        timeoutId = setTimeout(digitarProximo, Math.max(10, delay));
    }

    // Função principal
    function iniciarDigitacao() {
        if (digitando) {
            if (!confirm('⚠️ Já está digitando. Reiniciar?')) {
                return;
            }
            pararDigitacao();
        }

        // PASSO 1: Instrução
        alert('📌 CLIQUE no campo de texto onde deseja digitar');

        // PASSO 2: Aguarda o clique
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

            // PASSO 3: Pede o texto
            const texto = prompt('📝 Cole o texto para digitar:');
            if (!texto || texto.trim() === '') {
                alert('❌ Texto vazio!');
                return;
            }

            // Configura e começa
            elementoAlvo = elemento;
            textoCompleto = texto;
            indiceAtual = 0;
            digitando = true;

            // Limpa o campo
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                elemento.value = '';
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (elemento.isContentEditable) {
                elemento.innerHTML = '';
            }

            elemento.focus();
            
            alert('🚀 Digitando...');
            setTimeout(digitarProximo, 300);
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
        alert('⏹ Parado!');
    }

    // Atalhos
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

    // Comandos
    window.autoTyper = {
        iniciar: iniciarDigitacao,
        parar: pararDigitacao
    };

    console.log('🤖 Auto Digitador carregado!');
    console.log('📝 Use: autoTyper.iniciar() ou autoTyper.parar()');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');

    setTimeout(() => {
        if (confirm('🤖 Auto Digitador carregado!\n\nIniciar agora?')) {
            iniciarDigitacao();
        }
    }, 500);

})();
