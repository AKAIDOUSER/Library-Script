// AUTO DIGITADOR - Versão Limpa e Melhorada
(function() {
    'use strict';

    // Estado do sistema
    const state = {
        isRunning: false,
        timeoutId: null,
        targetElement: null,
        fullText: '',
        currentIndex: 0,
        speed: 50, // ms entre caracteres
        showProgress: true,
        showControls: true
    };

    // Configurações de velocidade
    const SPEEDS = {
        1: { chars: 10, label: 'Muito Rápida (10ms)' },
        2: { chars: 30, label: 'Rápida (30ms)' },
        3: { chars: 50, label: 'Normal (50ms)' },
        4: { chars: 100, label: 'Lenta (100ms)' },
        5: { chars: 200, label: 'Muito Lenta (200ms)' }
    };

    // ============ FUNÇÃO PRINCIPAL DE DIGITAÇÃO ============
    function typeNextChar() {
        if (!state.isRunning || state.currentIndex >= state.fullText.length) {
            if (state.currentIndex >= state.fullText.length) {
                showNotification('✅ Digitação concluída!', 'success');
                state.isRunning = false;
                // Dispara eventos de finalização
                if (state.targetElement) {
                    state.targetElement.dispatchEvent(new Event('blur', { bubbles: true }));
                    state.targetElement.dispatchEvent(new Event('focusout', { bubbles: true }));
                }
            }
            return;
        }

        if (!state.targetElement) {
            showNotification('❌ Erro: Elemento alvo não encontrado!', 'error');
            state.isRunning = false;
            return;
        }

        const char = state.fullText[state.currentIndex];
        const total = state.fullText.length;
        const progress = Math.round((state.currentIndex / total) * 100);

        // Mostra progresso a cada 10%
        if (state.showProgress && (progress % 10 === 0 || state.currentIndex === 0)) {
            showNotification(`📊 Progresso: ${progress}% (${state.currentIndex}/${total})`, 'progress');
        }

        // ===== INSERE O CARACTERE COM TODOS OS EVENTOS =====
        try {
            const element = state.targetElement;
            const tagName = element.tagName;

            // 1. DISPARA EVENTOS DE TECLADO
            const keyEvents = [
                new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true, composed: true }),
                new KeyboardEvent('keypress', { key: char, bubbles: true, cancelable: true, composed: true })
            ];
            keyEvents.forEach(ev => element.dispatchEvent(ev));

            // 2. INSERE O CARACTERE
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                const start = element.selectionStart || 0;
                const end = element.selectionEnd || 0;
                const value = element.value || '';
                
                // Insere na posição do cursor
                element.value = value.substring(0, start) + char + value.substring(end);
                
                // Atualiza posição do cursor
                const newPos = start + 1;
                element.setSelectionRange(newPos, newPos);
                
            } else if (element.isContentEditable) {
                // Para contenteditable
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

            // 3. DISPARA EVENTOS DE INPUT E CHANGE (CRUCIAIS!)
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
            
            // 4. PARA REACT - setter nativo do value
            if (element._reactInternalInstance || element.__reactInternalInstance) {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeSetter) {
                    nativeSetter.call(element, element.value);
                }
            }
            
            // 5. PARA VUE/ANGULAR - evento de composição
            element.dispatchEvent(new CompositionEvent('compositionupdate', {
                bubbles: true,
                cancelable: true,
                data: char
            }));

        } catch (e) {
            console.error('Erro ao digitar:', e);
            showNotification('❌ Erro ao digitar caractere!', 'error');
            state.isRunning = false;
            return;
        }

        // ===== CALCULA PRÓXIMO DELAY =====
        let delay = state.speed;
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = state.speed * 4; // pausa maior para espaços
        } else if ('.!?'.includes(char)) {
            delay = state.speed * 3; // pausa para pontuação
        }
        // Adiciona variação para simular digitação humana
        delay += Math.random() * 20 - 10;

        state.currentIndex++;

        // Agenda próximo caractere
        state.timeoutId = setTimeout(typeNextChar, Math.max(10, delay));
    }

    // ============ INICIA A DIGITAÇÃO ============
    function startTyping() {
        // Verifica se já está rodando
        if (state.isRunning) {
            if (!confirm('⚠️ Já existe uma digitação em andamento. Deseja reiniciar?')) {
                return;
            }
            stopTyping();
        }

        // 1. Aguarda o clique do usuário no campo
        alert('📌 CLIQUE no campo de texto onde deseja digitar e depois pressione OK');

        const clickHandler = function(e) {
            const element = e.target;
            
            // Verifica se é um campo de texto válido
            const isValid = element.tagName === 'INPUT' || 
                           element.tagName === 'TEXTAREA' || 
                           element.isContentEditable;
            
            if (!isValid) {
                alert('❌ Por favor, clique em um campo de texto válido!');
                return;
            }

            // Remove o listener para não capturar outros cliques
            document.removeEventListener('click', clickHandler);

            // 2. Pede o texto
            const text = prompt('📝 Cole ou digite o texto para auto digitar:');
            if (!text || text.trim() === '') {
                alert('❌ Nenhum texto foi inserido!');
                return;
            }

            // 3. Pede a velocidade
            const speedOptions = Object.entries(SPEEDS)
                .map(([key, val]) => `${key} - ${val.label}`)
                .join('\n');
            
            const speedChoice = prompt(
                `⚡ Escolha a velocidade:\n\n${speedOptions}\n\nDigite o número (1-5):`,
                '3'
            );

            const selectedSpeed = SPEEDS[speedChoice] || SPEEDS[3];
            state.speed = selectedSpeed.chars;

            // 4. Pergunta se quer mostrar progresso
            state.showProgress = confirm('📊 Mostrar notificações de progresso?');

            // 5. Configura e inicia
            state.targetElement = element;
            state.fullText = text;
            state.currentIndex = 0;
            state.isRunning = true;

            // Limpa o campo
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = '';
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (element.isContentEditable) {
                element.innerHTML = '';
            }

            // Foca no elemento
            element.focus();
            element.click();

            showNotification('🚀 Iniciando digitação automática...', 'info');
            
            // Pequeno delay antes de começar
            setTimeout(typeNextChar, 500);
        };

        // Adiciona o listener
        document.addEventListener('click', clickHandler);
        
        // Remove automaticamente após 30 segundos se não houver clique
        setTimeout(() => {
            document.removeEventListener('click', clickHandler);
        }, 30000);
    }

    // ============ PARA A DIGITAÇÃO ============
    function stopTyping() {
        state.isRunning = false;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        showNotification('⏹ Digitação interrompida', 'warning');
    }

    // ============ NOTIFICAÇÕES ============
    function showNotification(message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            progress: '📊'
        };

        // Tenta usar Notification API do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Auto Digitador', {
                body: message,
                icon: icons[type] || '🤖'
            });
        } else {
            console.log(`${icons[type] || '🤖'} ${message}`);
            // Mostra apenas erros e avisos como alert
            if (type === 'error' || type === 'success' || type === 'warning') {
                alert(message);
            }
        }
    }

    // ============ COMANDOS PÚBLICOS ============
    const commands = {
        iniciar: startTyping,
        start: startTyping,
        parar: stopTyping,
        stop: stopTyping,
        ajuda: function() {
            alert(
                '🤖 AUTO DIGITADOR - Ajuda\n\n' +
                'Comandos no console:\n' +
                '• autoTyper.iniciar() - Inicia a digitação\n' +
                '• autoTyper.parar() - Para a digitação\n' +
                '• autoTyper.ajuda() - Mostra esta ajuda\n\n' +
                'Atalhos do teclado:\n' +
                '• Ctrl+Shift+I - Iniciar digitação\n' +
                '• Ctrl+Shift+P - Parar digitação\n\n' +
                'Funciona com:\n' +
                '✅ Campos INPUT e TEXTAREA\n' +
                '✅ Elementos contenteditable\n' +
                '✅ React, Vue, Angular e outros frameworks\n' +
                '✅ Simula digitação real com todos os eventos\n' +
                '✅ Notificações de progresso'
            );
        }
    };

    // ============ ATALHOS DE TECLADO ============
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            startTyping();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            stopTyping();
        }
    });

    // ============ INICIALIZAÇÃO ============
    // Solicita permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Expõe comandos globalmente
    window.autoTyper = commands;

    console.log('🤖 Auto Digitador V3 carregado!');
    console.log('📝 Comandos: autoTyper.iniciar() | autoTyper.parar() | autoTyper.ajuda()');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');
    console.log('✅ Suporte a React, Vue, Angular e todos os frameworks!');

    // Pergunta se quer iniciar
    setTimeout(() => {
        if (confirm('🤖 Auto Digitador carregado!\n\nDeseja iniciar agora?')) {
            startTyping();
        }
    }, 1000);

})();
