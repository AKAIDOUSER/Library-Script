// Auto Digitador - Script para navegador
(function() {
    'use strict';

    // Configurações
    const config = {
        delayBetweenChars: 50,    // Milissegundos entre cada caractere
        delayBetweenWords: 200,   // Milissegundos entre palavras
        minDelay: 10,            // Delay mínimo
        maxDelay: 100            // Delay máximo para simular digitação humana
    };

    let isRunning = false;
    let currentTimeout = null;
    let selectedText = '';

    // Cria a interface do auto digitador
    function createUI() {
        const container = document.createElement('div');
        container.id = 'auto-typer-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f0f0f0;
            border: 2px solid #4CAF50;
            border-radius: 10px;
            padding: 15px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 300px;
        `;

        container.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong style="color: #333;">🤖 Auto Digitador</strong>
            </div>
            <textarea id="text-to-type" rows="3" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="Cole ou digite o texto aqui..."></textarea>
            <div style="margin-top: 10px;">
                <button id="start-typing" style="background: #4CAF50; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">▶ Digitar</button>
                <button id="stop-typing" style="background: #f44336; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 5px;">⏹ Parar</button>
                <button id="select-text" style="background: #2196F3; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 5px;">📋 Selecionar</button>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                <span id="status-text">Pronto para digitar</span>
            </div>
        `;

        document.body.appendChild(container);
        setupEventListeners();
    }

    // Configura os event listeners
    function setupEventListeners() {
        const startBtn = document.getElementById('start-typing');
        const stopBtn = document.getElementById('stop-typing');
        const selectBtn = document.getElementById('select-text');
        const textarea = document.getElementById('text-to-type');
        const statusText = document.getElementById('status-text');

        startBtn.addEventListener('click', () => {
            const text = textarea.value;
            if (!text.trim()) {
                statusText.textContent = '⚠️ Por favor, insira um texto para digitar';
                return;
            }
            startTyping(text);
        });

        stopBtn.addEventListener('click', stopTyping);

        selectBtn.addEventListener('click', () => {
            textarea.select();
            document.execCommand('copy');
            statusText.textContent = '📋 Texto copiado para a área de transferência!';
            setTimeout(() => {
                statusText.textContent = 'Pronto para digitar';
            }, 2000);
        });
    }

    // Função para digitar o texto
    function typeText(text, element) {
        if (!isRunning || !text) return;

        // Pega o próximo caractere
        const char = text[0];
        const remainingText = text.slice(1);

        // Digita o caractere
        const event = new KeyboardEvent('keydown', {
            key: char,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);

        // Adiciona o caractere ao campo
        const currentValue = element.value || '';
        const cursorPosition = element.selectionStart || 0;
        
        // Verifica se é um caractere especial
        if (char === '\n') {
            element.value = currentValue.slice(0, cursorPosition) + '\n' + currentValue.slice(cursorPosition);
        } else {
            element.value = currentValue.slice(0, cursorPosition) + char + currentValue.slice(cursorPosition);
        }
        
        // Atualiza a posição do cursor
        const newPosition = cursorPosition + 1;
        element.setSelectionRange(newPosition, newPosition);
        element.focus();

        // Dispara eventos de input e change
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Determina o delay para o próximo caractere
        let delay = config.delayBetweenChars;
        if (char === ' ' || char === '\n' || char === '\t') {
            delay = config.delayBetweenWords;
        } else if (char === '.' || char === ',' || char === '!' || char === '?') {
            delay = config.delayBetweenChars + 50;
        }

        // Adiciona um pouco de aleatoriedade para simular digitação humana
        delay += Math.random() * (config.maxDelay - config.minDelay);

        // Atualiza o status
        const statusText = document.getElementById('status-text');
        const totalChars = selectedText.length;
        const typedChars = totalChars - remainingText.length;
        const progress = Math.round((typedChars / totalChars) * 100);
        statusText.textContent = `⏳ Digitando... ${progress}%`;

        // Configura o próximo caractere
        if (remainingText.length > 0 && isRunning) {
            currentTimeout = setTimeout(() => {
                typeText(remainingText, element);
            }, delay);
        } else if (remainingText.length === 0) {
            statusText.textContent = '✅ Digitação completa!';
            isRunning = false;
        }
    }

    // Função para iniciar a digitação
    function startTyping(text) {
        // Para qualquer digitação em andamento
        stopTyping();

        // Encontra o elemento ativo (campo de texto onde o cursor está)
        const activeElement = document.activeElement;
        if (!activeElement || !['INPUT', 'TEXTAREA', 'contenteditable'].some(type => 
            activeElement.tagName === type || (activeElement.isContentEditable && type === 'contenteditable')
        )) {
            const statusText = document.getElementById('status-text');
            statusText.textContent = '⚠️ Clique primeiro no campo onde deseja digitar!';
            return;
        }

        isRunning = true;
        selectedText = text;
        document.getElementById('status-text').textContent = '⏳ Iniciando digitação...';

        // Pequeno delay antes de começar
        setTimeout(() => {
            if (isRunning) {
                typeText(text, activeElement);
            }
        }, 500);
    }

    // Função para parar a digitação
    function stopTyping() {
        isRunning = false;
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        document.getElementById('status-text').textContent = '⏹ Digitação interrompida';
    }

    // Inicializa a interface
    createUI();

    // Adiciona atalho de teclado para iniciar/parar (Ctrl+Shift+T para iniciar, Ctrl+Shift+S para parar)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            const text = document.getElementById('text-to-type').value;
            if (text.trim()) {
                startTyping(text);
            }
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            stopTyping();
        }
    });

    console.log('🤖 Auto Digitador carregado!');
    console.log('Atalhos: Ctrl+Shift+T = Iniciar | Ctrl+Shift+S = Parar');
})();
