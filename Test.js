// FUNÇÃO DE DIGITAÇÃO EXTRAÍDA DO SEU CÓDIGO
// (Versão limpa e funcional)

function digitarTexto(elemento, texto, velocidade = 50, mostrarProgresso = true) {
    let index = 0;
    let timeoutId = null;
    let isRunning = true;

    function typeNextChar() {
        if (!isRunning || index >= texto.length) {
            if (index >= texto.length) {
                // Dispara eventos de finalização
                elemento.dispatchEvent(new Event('blur', { bubbles: true }));
                elemento.dispatchEvent(new Event('focusout', { bubbles: true }));
                console.log('✅ Digitação concluída!');
            }
            return;
        }

        const char = texto[index];
        const total = texto.length;
        const progress = Math.round((index / total) * 100);

        // Mostra progresso a cada 10%
        if (mostrarProgresso && (progress % 10 === 0 || index === 0)) {
            console.log(`📊 Progresso: ${progress}% (${index}/${total})`);
        }

        try {
            // ===== INSERE O CARACTERE =====
            if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                const start = elemento.selectionStart || 0;
                const end = elemento.selectionEnd || 0;
                const value = elemento.value || '';
                
                elemento.value = value.substring(0, start) + char + value.substring(end);
                
                const newPos = start + 1;
                elemento.setSelectionRange(newPos, newPos);
                
            } else if (elemento.isContentEditable) {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    const textNode = document.createTextNode(char);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }

            // ===== DISPARA EVENTOS =====
            // Eventos de input/change (CRUCIAIS)
            elemento.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
            elemento.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
            
            // Eventos de teclado
            elemento.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true, composed: true }));
            elemento.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true, cancelable: true, composed: true }));
            elemento.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true, composed: true }));
            
            // Evento de composição (para alguns frameworks)
            elemento.dispatchEvent(new CompositionEvent('compositionupdate', {
                bubbles: true,
                cancelable: true,
                data: char
            }));

            // ===== PARA REACT =====
            if (elemento._reactInternalInstance || elemento.__reactInternalInstance) {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeSetter) {
                    nativeSetter.call(elemento, elemento.value);
                }
            }

        } catch (e) {
            console.error('❌ Erro ao digitar:', e);
            isRunning = false;
            return;
        }

        index++;

        // ===== CALCULA DELAY =====
        let delay = velocidade;
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = velocidade * 3;
        } else if ('.!?'.includes(char)) {
            delay = velocidade * 2;
        }
        // Adiciona variação aleatória
        delay += Math.random() * 20 - 10;

        timeoutId = setTimeout(typeNextChar, Math.max(10, delay));
    }

    // Inicia a digitação
    typeNextChar();

    // Retorna função para parar
    return function parar() {
        isRunning = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        console.log('⏹ Digitação interrompida');
    };
}

// ===== EXEMPLO DE USO =====
// Para usar, primeiro selecione o campo e depois chame a função:

// 1. Clique em um campo de texto
// 2. Execute no console:
/*
const campo = document.activeElement;
const parar = digitarTexto(campo, 'Seu texto aqui', 50, true);

// Para parar:
// parar();
*/

// ===== VERSÃO COM INTERFACE SIMPLES =====
function autoDigitar() {
    alert('📌 Clique no campo de texto e depois pressione OK');
    
    const clickHandler = function(e) {
        const elemento = e.target;
        
        const isValid = elemento.tagName === 'INPUT' || 
                       elemento.tagName === 'TEXTAREA' || 
                       elemento.isContentEditable;
        
        if (!isValid) {
            alert('❌ Clique em um campo de texto válido!');
            return;
        }
        
        document.removeEventListener('click', clickHandler);
        
        const texto = prompt('📝 Cole o texto para digitar:');
        if (!texto || texto.trim() === '') {
            alert('❌ Texto vazio!');
            return;
        }
        
        // Limpa o campo
        if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
            elemento.value = '';
            elemento.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (elemento.isContentEditable) {
            elemento.innerHTML = '';
        }
        
        elemento.focus();
        
        alert('🚀 Digitando...');
        digitarTexto(elemento, texto, 50, true);
    };
    
    document.addEventListener('click', clickHandler);
    
    setTimeout(() => {
        document.removeEventListener('click', clickHandler);
    }, 30000);
}

// Comandos
window.digitarTexto = digitarTexto;
window.autoDigitar = autoDigitar;

console.log('🤖 Função de digitação extraída!');
console.log('📝 Como usar:');
console.log('  1. autoDigitar() - Interface simples');
console.log('  2. digitarTexto(elemento, texto, velocidade) - Direto');
console.log('  3. Atalho: Ctrl+Shift+D para iniciar');
console.log('  4. Atalho: Ctrl+Shift+S para parar');

// Atalhos
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        autoDigitar();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        // Para a digitação atual (precisa de uma variável global)
        if (window._pararDigitacao) {
            window._pararDigitacao();
        }
    }
});
