// AUTO DIGITADOR - Com função de digitação do código  
(function() {
    'use strict';

    let digitando = false;
    let timeoutId = null;
    let elementoAlvo = null;
    let textoCompleto = '';
    let indiceAtual = 0;

    // ============================================
    // FUNÇÃO DE DIGITAÇÃO EXTRAÍDA DO CÓDIGO OFUSCADO
    // ============================================
    function digitarProximo() {
        if (!digitando || indiceAtual >= textoCompleto.length) {
            if (indiceAtual >= textoCompleto.length) {
                alert('✅ Digitação concluída!');
                digitando = false;
                // Dispara eventos de finalização
                if (elementoAlvo) {
                    try {
                        elementoAlvo.dispatchEvent(new Event('blur', { bubbles: true }));
                        elementoAlvo.dispatchEvent(new Event('focusout', { bubbles: true }));
                    } catch(e) {}
                }
            }
            return;
        }

        const char = textoCompleto[indiceAtual];
        const elemento = elementoAlvo;

        try {
            // ===== MÉTODO DO CÓDIGO OFUSCADO =====
            // Verifica se o elemento tem a propriedade 'value' (INPUT/TEXTAREA)
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                // Pega a posição atual do cursor
                const start = elemento.selectionStart || 0;
                const end = elemento.selectionEnd || 0;
                const currentValue = elemento.value || '';
                
                // Insere o caractere na posição correta
                if (char === '\n') {
                    elemento.value = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
                } else {
                    elemento.value = currentValue.substring(0, start) + char + currentValue.substring(end);
                }
                
                // Atualiza a posição do cursor
                const newPos = start + 1;
                elemento.setSelectionRange(newPos, newPos);
                
            } else if (elemento.isContentEditable) {
                // Para elementos contenteditable
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

            // ===== DISPARA EVENTOS (IGUAL AO CÓDIGO OFUSCADO) =====
            // Evento keydown
            elemento.dispatchEvent(new KeyboardEvent('keydown', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));
            
            // Evento keypress
            elemento.dispatchEvent(new KeyboardEvent('keypress', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));

            // Evento input (CRUCIAL)
            elemento.dispatchEvent(new Event('input', { 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));

            // Evento change
            elemento.dispatchEvent(new Event('change', { 
                bubbles: true, 
                cancelable: true,
                composed: true 
            }));

            // Evento de composição (para alguns frameworks)
            elemento.dispatchEvent(new CompositionEvent('compositionupdate', {
                bubbles: true,
                cancelable: true,
                data: char
            }));

            // ===== PARA REACT (do código ofuscado) =====
            if (elemento._reactInternalInstance || elemento.__reactInternalInstance) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 
                    'value'
                )?.set;
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(elemento, elemento.value);
                }
            }

        } catch (e) {
            console.error('Erro ao digitar:', e);
            alert('❌ Erro ao digitar caractere!');
            digitando = false;
            return;
        }

        indiceAtual++;

        // ===== CALCULA DELAY (do código ofuscado) =====
        let delay = 50; // velocidade padrão
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = 200; // pausa maior para espaços
        } else if ('.!?'.includes(char)) {
            delay = 100; // pausa para pontuação
        }
        // Adiciona variação aleatória (como no código ofuscado)
        delay += Math.random() * 20 - 10;

        // Agenda o próximo caractere
        timeoutId = setTimeout(digitarProximo, Math.max(10, delay));
    }

    // ============================================
    // INTERFACE SIMPLES
    // ============================================
    function iniciarDigitacao() {
        if (digitando) {
            if (!confirm('⚠️ Já está digitando. Reiniciar?')) {
                return;
            }
            pararDigitacao();
        }

        alert('📌 CLIQUE no campo de texto onde deseja digitar');

        const handlerClique = function(e) {
            const elemento = e.target;
            
            const valido = elemento.tagName === 'INPUT' || 
                          elemento.tagName === 'TEXTAREA' || 
                          elemento.isContentEditable;
            
            if (!valido) {
                alert('❌ Clique em um campo de texto válido!');
                return;
            }

            document.removeEventListener('click', handlerClique);

            const texto = prompt('📝 Cole o texto para digitar:');
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
            
            alert('🚀 Digitando... Acompanhe no campo!');
            
            // Pequeno delay antes de começar
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
        alert('⏹ Digitação interrompida!');
    }

    // ============================================
    // ATALHOS E COMANDOS
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
        stop: pararDigitacao
    };

    console.log('🤖 Auto Digitador - Com função do código original');
    console.log('📝 Comandos: autoTyper.iniciar() | autoTyper.parar()');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');
    console.log('✅ Usando o método de digitação que funciona!');

    setTimeout(() => {
        if (confirm('🤖 Auto Digitador carregado!\n\nDeseja iniciar agora?')) {
            iniciarDigitacao();
        }
    }, 500);

})();
