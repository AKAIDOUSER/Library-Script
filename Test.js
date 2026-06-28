// Auto Digitador - Versão Simples (sem interface)
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

    // Função principal
    function startAutoTyper() {
        // Verifica se já está rodando
        if (isRunning) {
            const continuar = confirm('⚠️ Já existe uma digitação em andamento. Deseja parar e começar novamente?');
            if (continuar) {
                stopTyping();
            } else {
                return;
            }
        }

        // Pede para o usuário clicar no campo
        alert('📌 CLIQUE no campo de texto onde deseja digitar e depois pressione OK');

        // Aguarda o clique do usuário
        const clickHandler = function(e) {
            targetElement = e.target;
            
            // Verifica se é um campo de texto válido
            const isValid = targetElement.tagName === 'INPUT' || 
                           targetElement.tagName === 'TEXTAREA' || 
                           targetElement.isContentEditable;
            
            if (!isValid) {
                alert('❌ Por favor, clique em um campo de texto válido!');
                return;
            }

            // Remove o listener
            document.removeEventListener('click', clickHandler);
            
            // Pede o texto
            const texto = prompt('📝 Cole ou digite o texto que deseja auto digitar:');
            
            if (!texto || texto.trim() === '') {
                alert('❌ Nenhum texto foi inserido!');
                return;
            }

            // Pede a velocidade
            const velocidade = prompt('⚡ Escolha a velocidade de digitação:\n\n' +
                                    '1 - Muito Rápida (10ms)\n' +
                                    '2 - Rápida (30ms)\n' +
                                    '3 - Normal (50ms)\n' +
                                    '4 - Lenta (100ms)\n' +
                                    '5 - Muito Lenta (200ms)\n\n' +
                                    'Digite o número (1-5):', '3');

            // Configura a velocidade
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

            // Inicia a digitação
            fullText = texto;
            currentIndex = 0;
            isRunning = true;
            
            // Foca no elemento
            targetElement.focus();
            
            // Limpa o campo se tiver conteúdo
            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                targetElement.value = '';
            } else if (targetElement.isContentEditable) {
                targetElement.innerHTML = '';
            }

            // Mostra notificação de início
            showNotification('🚀 Iniciando digitação automática...', 'info');
            
            // Começa a digitar
            typeNextChar();
        };

        // Adiciona o listener para capturar o clique
        document.addEventListener('click', clickHandler);
        
        // Timeout para remover o listener se o usuário não clicar
        setTimeout(() => {
            document.removeEventListener('click', clickHandler);
        }, 30000);
    }

    // Função para digitar o próximo caractere
    function typeNextChar() {
        if (!isRunning || currentIndex >= fullText.length) {
            if (currentIndex >= fullText.length) {
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
        const remaining = fullText.length - currentIndex - 1;
        const progress = Math.round(((currentIndex) / fullText.length) * 100);

        // Atualiza a notificação a cada 10%
        if (progress % 10 === 0 || currentIndex === 0) {
            showNotification(`📊 Progresso: ${progress}% (${currentIndex}/${fullText.length} caracteres)`, 'progress');
        }

        // Insere o caractere no campo
        try {
            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                const currentValue = targetElement.value || '';
                const cursorPos = targetElement.selectionStart || 0;
                
                if (char === '\n') {
                    targetElement.value = currentValue.slice(0, cursorPos) + '\n' + currentValue.slice(cursorPos);
                } else {
                    targetElement.value = currentValue.slice(0, cursorPos) + char + currentValue.slice(cursorPos);
                }
                
                const newPos = cursorPos + 1;
                targetElement.setSelectionRange(newPos, newPos);
            } else if (targetElement.isContentEditable) {
                // Para elementos contenteditable
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(char);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (e) {
            showNotification('❌ Erro ao digitar caractere!', 'error');
            isRunning = false;
            return;
        }

        // Dispara eventos
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Calcula o delay
        let delay = config.delayBetweenChars;
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = config.delayBetweenWords;
        } else if ('.!?'.includes(char)) {
            delay = config.delayBetweenChars + 100;
        }

        // Adiciona pequena variação
        delay += Math.random() * 20 - 10;

        currentIndex++;

        // Agenda o próximo caractere
        currentTimeout = setTimeout(typeNextChar, Math.max(10, delay));
    }

    // Função para parar a digitação
    function stopTyping() {
        isRunning = false;
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        showNotification('⏹ Digitação interrompida pelo usuário', 'warning');
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

        // Tenta usar Notification API se disponível
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Auto Digitador', {
                body: message,
                icon: icons[type] || '🤖'
            });
        } else {
            // Fallback para alert
            console.log(`${icons[type] || '🤖'} ${message}`);
            
            // Mostra apenas os mais importantes como alert
            if (type === 'error' || type === 'success' || type === 'warning') {
                alert(message);
            }
        }
    }

    // Função para mostrar ajuda
    function showHelp() {
        alert(
            '🤖 AUTO DIGITADOR - Ajuda\n\n' +
            'Comandos disponíveis:\n' +
            '• Digite "iniciar" - Inicia o auto digitador\n' +
            '• Digite "parar" - Para a digitação\n' +
            '• Digite "ajuda" - Mostra esta mensagem\n\n' +
            'Como usar:\n' +
            '1. Digite "iniciar" no console\n' +
            '2. Clique no campo de texto\n' +
            '3. Cole o texto no prompt\n' +
            '4. Escolha a velocidade\n' +
            '5. Acompanhe o progresso nas notificações\n\n' +
            'Atalhos:\n' +
            '• Ctrl+Shift+I - Iniciar digitação\n' +
            '• Ctrl+Shift+P - Parar digitação'
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

    // Comandos via console
    window.autoTyper = {
        iniciar: startAutoTyper,
        start: startAutoTyper,
        parar: stopTyping,
        stop: stopTyping,
        ajuda: showHelp,
        help: showHelp
    };

    // Mensagem inicial
    console.log('🤖 Auto Digitador carregado!');
    console.log('📝 Comandos disponíveis:');
    console.log('  autoTyper.iniciar()  - Inicia a digitação');
    console.log('  autoTyper.parar()    - Para a digitação');
    console.log('  autoTyper.ajuda()    - Mostra ajuda');
    console.log('⌨️ Atalhos: Ctrl+Shift+I (iniciar) | Ctrl+Shift+P (parar)');

    // Mensagem de boas-vindas
    setTimeout(() => {
        const usar = confirm(
            '🤖 Auto Digitador carregado!\n\n' +
            'Deseja iniciar agora?\n' +
            '(Clique em "OK" para iniciar ou "Cancelar" para usar depois)'
        );
        if (usar) {
            startAutoTyper();
        }
    }, 1000);
})();
