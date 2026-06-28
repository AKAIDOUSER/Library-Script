// Auto Digitador - Versão com eventos completos
(function() {
    'use strict';

    let isRunning = false;
    let currentTimeout = null;
    let fullText = '';
    let currentIndex = 0;
    let targetElement = null;

    // Configurações padrão
    let config = {
        delayBetweenChars: 50,
        delayBetweenWords: 200
    };

    // Função para simular digitação real com eventos
    function simulateTyping(element, char) {
        // Cria eventos de teclado completos
        const events = [
            new KeyboardEvent('keydown', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true
            }),
            new KeyboardEvent('keypress', { 
                key: char, 
                bubbles: true, 
                cancelable: true,
                composed: true
            })
        ];

        // Dispara eventos de teclado
        events.forEach(event => {
            element.dispatchEvent(event);
        });

        // Insere o caractere
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            const start = element.selectionStart || 0;
            const end = element.selectionEnd || 0;
            const value = element.value || '';
            
            // Insere o caractere na posição do cursor
            element.value = value.substring(0, start) + char + value.substring(end);
            
            // Atualiza posição do cursor
            const newPos = start + 1;
            element.setSelectionRange(newPos, newPos);
            
        } else if (element.isContentEditable) {
            // Para contenteditable
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(char);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        // Dispara eventos de input e change (CRUCIAIS para frameworks)
        const inputEvent = new Event('input', { 
            bubbles: true, 
            cancelable: true,
            composed: true 
        });
        element.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', { 
            bubbles: true, 
            cancelable: true,
            composed: true 
        });
        element.dispatchEvent(changeEvent);

        // Para React/Vue, dispara evento específico
        if (element._reactInternalInstance || element.__reactInternalInstance) {
            // React
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 
                'value'
            )?.set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, element.value);
            }
        }

        // Dispara evento de composição para alguns frameworks
        const compositionEvent = new CompositionEvent('compositionupdate', {
            bubbles: true,
            cancelable: true,
            data: char
        });
        element.dispatchEvent(compositionEvent);
    }

    // Função principal
    function startAutoTyper() {
        if (isRunning) {
            const continuar = confirm('⚠️ Já existe uma digitação em andamento. Deseja parar e começar novamente?');
            if (continuar) {
                stopTyping();
            } else {
                return;
            }
        }

        alert('📌 CLIQUE no campo de texto onde deseja digitar e depois pressione OK');

        const clickHandler = function(e) {
            targetElement = e.target;
            
            const isValid = targetElement.tagName === 'INPUT' || 
                           targetElement.tagName === 'TEXTAREA' || 
                           targetElement.isContentEditable;
            
            if (!isValid) {
                alert('❌ Por favor, clique em um campo de texto válido!');
                return;
            }

            document.removeEventListener('click', clickHandler);
            
            const texto = prompt('📝 Cole ou digite o texto que deseja auto digitar:');
            
            if (!texto || texto.trim() === '') {
                alert('❌ Nenhum texto foi inserido!');
                return;
            }

            const velocidade = prompt('⚡ Escolha a velocidade de digitação:\n\n' +
                                    '1 - Muito Rápida (10ms)\n' +
                                    '2 - Rápida (30ms)\n' +
                                    '3 - Normal (50ms)\n' +
                                    '4 - Lenta (100ms)\n' +
                                    '5 - Muito Lenta (200ms)\n\n' +
                                    'Digite o número (1-5):', '3');

            const speedMap = {
                '1': { chars: 10, words: 40 },
                '2': { chars: 30, words: 120 },
                '3': { chars: 50, words: 200 },
                '4': { chars: 100, words: 400 },
                '5': { chars: 200, words: 800 }
            };

            const selectedSpeed = speedMap[velocidade] || speedMap['3'];
            config.delayBetweenChars = selectedSpeed.chars;
            config.delayBetweenWords = selectedSpeed.words;

            fullText = texto;
            currentIndex = 0;
            isRunning = true;
            
            targetElement.focus();
            
            // Limpa o campo
            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                targetElement.value = '';
                // Dispara eventos de limpeza
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                targetElement.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (targetElement.isContentEditable) {
                targetElement.innerHTML = '';
            }

            showNotification('🚀 Iniciando digitação automática...', 'info');
            typeNextChar();
        };

        document.addEventListener('click', clickHandler);
        
        setTimeout(() => {
            document.removeEventListener('click', clickHandler);
        }, 30000);
    }

    // Função para digitar o próximo caractere com eventos completos
    function typeNextChar() {
        if (!isRunning || currentIndex >= fullText.length) {
            if (currentIndex >= fullText.length) {
                // Dispara evento de finalização
                if (targetElement) {
                    targetElement.dispatchEvent(new Event('blur', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('focusout', { bubbles: true }));
                }
                showNotification('✅ Digitação concluída com sucesso!', 'success');
                isRunning = false;
            }
            return;
        }

        if (!targetElement) {
            showNotification('❌ Erro: Elemento alvo não encontrado!', 'error');
            isRunning = false;
            return;
        }

        const char = fullText[currentIndex];
        const progress = Math.round(((currentIndex) / fullText.length) * 100);

        if (progress % 10 === 0 || currentIndex === 0) {
            showNotification(`📊 Progresso: ${progress}% (${currentIndex}/${fullText.length})`, 'progress');
        }

        try {
            // Usa a função melhorada de simulação
            simulateTyping(targetElement, char);
        } catch (e) {
            console.error('Erro ao digitar:', e);
            showNotification('❌ Erro ao digitar caractere!', 'error');
            isRunning = false;
            return;
        }

        // Calcula o delay
        let delay = config.delayBetweenChars;
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = config.delayBetweenWords;
        } else if ('.!?'.includes(char)) {
            delay = config.delayBetweenChars + 100;
        }

        // Adiciona variação aleatória
        delay += Math.random() * 20 - 10;

        currentIndex++;

        currentTimeout = setTimeout(typeNextChar, Math.max(10, delay));
    }

    // Função para parar
    function stopTyping() {
        isRunning = false;
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        showNotification('⏹ Digitação interrompida', 'warning');
    }

    // Função para mostrar notificações
    function showNotification(message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            progress: '📊'
        };

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Auto Digitador', {
                body: message,
                icon: icons[type] || '🤖'
            });
        } else {
            console.log(`${icons[type] || '🤖'} ${message}`);
            if (type === 'error' || type === 'success' || type === 'warning') {
                alert(message);
            }
        }
    }

    // Função para detectar o framework do site
    function detectFramework() {
        const frameworks = [];
        if (window.React) frameworks.push('React');
        if (window.Vue) frameworks.push('Vue');
        if (window.angular) frameworks.push('Angular');
        if (window.jQuery) frameworks.push('jQuery');
        if (frameworks.length > 0) {
            console.log(`🔍 Frameworks detectados: ${frameworks.join(', ')}`);
        }
        return frameworks;
    }

    // Função de ajuda
    function showHelp() {
        alert(
            '🤖 AUTO DIGITADOR - Ajuda\n\n' +
            'Comandos:\n' +
            '• autoTyper.iniciar() - Inicia a digitação\n' +
            '• autoTyper.parar() - Para a digitação\n' +
            '• autoTyper.ajuda() - Mostra esta mensagem\n\n' +
            'Atalhos:\n' +
            '• Ctrl+Shift+I - Iniciar\n' +
            '• Ctrl+Shift+P - Parar\n\n' +
            '⚠️ Para sites com React/Vue/Angular:\n' +
            'O script agora dispara todos os eventos necessários\n' +
            'para que os frameworks detectem as mudanças!'
        );
    }

    // Configura atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            startAutoTyper();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            stopTyping();
        }
    });

    // Solicita permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Detecta frameworks ao carregar
    setTimeout(() => {
        detectFramework();
    }, 500);

    // Comandos via console
    window.autoTyper = {
        iniciar: startAutoTyper,
        start: startAutoTyper,
        parar: stopTyping,
        stop: stopTyping,
        ajuda: showHelp,
        help: showHelp,
        detectarFramework: detectFramework
    };

    console.log('🤖 Auto Digitador V2 carregado!');
    console.log('📝 Comandos: autoTyper.iniciar() | autoTyper.parar() | autoTyper.ajuda()');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');
    console.log('🔍 Detectando frameworks automaticamente...');

    // Mensagem de boas-vindas
    setTimeout(() => {
        const usar = confirm(
            '🤖 Auto Digitador V2 carregado!\n\n' +
            'Melhorias:\n' +
            '✅ Eventos completos de teclado (keydown, keypress)\n' +
            '✅ Suporte para React, Vue, Angular\n' +
            '✅ Eventos de input, change e composition\n' +
            '✅ Detecção automática de frameworks\n\n' +
            'Deseja iniciar agora?'
        );
        if (usar) {
            startAutoTyper();
        }
    }, 1000);
})();
