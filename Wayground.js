(function() {
    'use strict';

    // -----------------------------------------------------------------------------------
    // CONFIGURAÇÃO DE PROVEDORES DE API
    // -----------------------------------------------------------------------------------
    const PROVIDERS = {
        gemini: {
            name: 'Gemini',
            keys: ["CHAVE_GEMINI_1", "CHAVE_GEMINI_2", "CHAVE_GEMINI_3"],
            getEndpoint: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`,
            supportsImages: true,
            supportsVideo: false
        },
        deepseek: {
            name: 'DeepSeek',
            keys: ["SUA_CHAVE_OPENROUTER_1", "SUA_CHAVE_OPENROUTER_2", "SUA_CHAVE_OPENROUTER_3"],
            getEndpoint: () => 'https://openrouter.ai/api/v1/chat/completions',
            supportsImages: false,
            supportsVideo: false,
            modelName: "deepseek/deepseek-chat"
        },
        mistral: {
            name: 'Mistral',
            keys: ["SUA_CHAVE_MISTRAL_1", "SUA_CHAVE_MISTRAL_2", "SUA_CHAVE_MISTRAL_3"],
            getEndpoint: () => 'https://api.mistral.ai/v1/chat/completions',
            supportsImages: false,
            supportsVideo: false,
            modelName: "mistral-large-latest"
        }
    };

    // Estado do provedor atual
    let currentProvider = 'mistral'; // 'gemini', 'deepseek', ou 'mistral'
    let currentKeyIndex = 0;
    let lastAiResponse = '';

    // --- NOVA FUNÇÃO: Configurar API Key ---
    function configurarApiKey(providerName) {
        return new Promise((resolve) => {
            const provider = PROVIDERS[providerName];
            const oldModal = document.getElementById('api-key-config-modal');
            if (oldModal) oldModal.remove();

            const overlay = document.createElement('div');
            overlay.id = 'api-key-config-modal';
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: '2147483648',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(5px)'
            });

            const modal = document.createElement('div');
            Object.assign(modal.style, {
                background: 'rgba(26, 27, 30, 0.95)',
                padding: '30px', borderRadius: '16px', color: 'white',
                fontFamily: 'system-ui, sans-serif', maxWidth: '450px', width: '90%',
                textAlign: 'center', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            });

            const title = document.createElement('h3');
            title.innerText = `🔑 Configurar API ${provider.name}`;
            Object.assign(title.style, {
                margin: '0 0 10px 0', fontSize: '20px', fontWeight: '600'
            });

            const subtitle = document.createElement('p');
            subtitle.innerText = `Digite sua chave de API do ${provider.name} para usar este provedor.`;
            Object.assign(subtitle.style, {
                margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.7)'
            });

            // Input de chave API
            const inputGroup = document.createElement('div');
            Object.assign(inputGroup.style, {
                display: 'flex', flexDirection: 'column', gap: '10px',
                marginBottom: '20px'
            });

            const label = document.createElement('label');
            label.innerText = 'Chave API:';
            Object.assign(label.style, {
                fontSize: '13px', fontWeight: '500', textAlign: 'left',
                color: 'rgba(255, 255, 255, 0.8)'
            });

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Ex: ${provider.name === 'mistral' ? 'abc123...' : 'AIza...'}`;
            Object.assign(input.style, {
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: 'white', padding: '12px',
                fontSize: '14px', outline: 'none'
            });
            input.addEventListener('focus', () => {
                input.style.borderColor = '#8b5cf6';
                input.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.3)';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                input.style.boxShadow = 'none';
            });

            inputGroup.appendChild(label);
            inputGroup.appendChild(input);

            // Botões
            const buttonGroup = document.createElement('div');
            Object.assign(buttonGroup.style, {
                display: 'flex', gap: '10px', justifyContent: 'center'
            });

            const btnSalvar = document.createElement('button');
            btnSalvar.innerText = '💾 Salvar e Usar';
            Object.assign(btnSalvar.style, {
                background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: '8px', color: 'white',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                padding: '10px 24px', flex: '1',
                transition: 'all 0.2s ease'
            });
            btnSalvar.onmouseover = () => btnSalvar.style.opacity = '0.9';
            btnSalvar.onmouseout = () => btnSalvar.style.opacity = '1';

            const btnCancelar = document.createElement('button');
            btnCancelar.innerText = 'Cancelar';
            Object.assign(btnCancelar.style, {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                padding: '10px 20px',
                transition: 'all 0.2s ease'
            });
            btnCancelar.onmouseover = () => btnCancelar.style.background = 'rgba(255, 255, 255, 0.15)';
            btnCancelar.onmouseout = () => btnCancelar.style.background = 'rgba(255, 255, 255, 0.1)';

            buttonGroup.appendChild(btnSalvar);
            buttonGroup.appendChild(btnCancelar);

            // Fechar modal
            const closeModal = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            };

            btnCancelar.onclick = closeModal;

            btnSalvar.onclick = () => {
                const key = input.value.trim();
                if (key) {
                    // Salva a chave
                    provider.keys = [key];
                    currentKeyIndex = 0;
                    console.log(`✅ Chave API ${provider.name} configurada com sucesso!`);
                    
                    // Atualiza UI
                    const toggleBtn = document.getElementById('ai-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.innerText = `IA: ${provider.name}`;
                        toggleBtn.style.color = '#a78bfa';
                    }
                    
                    closeModal();
                    resolve(true);
                } else {
                    // Feedback visual para campo vazio
                    input.style.borderColor = '#ef4444';
                    input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
                    setTimeout(() => {
                        input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        input.style.boxShadow = 'none';
                    }, 2000);
                }
            };

            // Enter no input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') btnSalvar.click();
            });

            modal.appendChild(title);
            modal.appendChild(subtitle);
            modal.appendChild(inputGroup);
            modal.appendChild(buttonGroup);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => overlay.style.opacity = '1', 10);
            input.focus();
        });
    }

    // --- FUNÇÃO MODIFICADA: obterRespostaDaIA ---
    async function obterRespostaDaIA(quizData) {
        lastAiResponse = '';
        const viewResponseBtn = document.getElementById('view-raw-response-btn');
        if (viewResponseBtn) viewResponseBtn.style.display = 'none';

        // Verifica se há chave configurada para o provedor atual
        const provider = PROVIDERS[currentProvider];
        const hasValidKey = provider.keys.some(k => k && k.length > 10 && !k.includes('SUA_'));

        // Se não tiver chave, solicita configuração
        if (!hasValidKey) {
            const configured = await configurarApiKey(currentProvider);
            if (!configured) {
                throw new Error('Configuração de API cancelada pelo usuário.');
            }
        }

        // --- 1. Lógica de Prompt (mesma de antes) ---
        let promptDeInstrucao = "", formattedOptions = "";
        // ... (código existente de extração de prompt - mantido igual)

        switch (quizData.questionType) {
            case 'drag_and_drop_image':
                promptDeInstrucao = `Esta é uma questão de arrastar rótulos para áreas específicas de uma imagem...`;
                const draggablesImgOptions = quizData.draggableOptions.map(item => `- "${item.text}"`).join('\n');
                const dropZonesList = quizData.dropZones.map(item => `- "${item.id}"`).join('\n');
                formattedOptions = `Rótulos Disponíveis:\n${draggablesImgOptions}\n\nEspaços na Imagem:\n${dropZonesList}`;
                break;
            // ... (todos os outros casos existentes)
            default:
                break;
        }

        let textPrompt = `${promptDeInstrucao}\n\n---\nPERGUNTA: "${quizData.questionText}"\n---\n${formattedOptions}`;

        // --- 2. Processamento de Imagem ---
        let base64Image = null;
        if (quizData.questionImageUrl) {
            base64Image = await imageUrlToBase64(quizData.questionImageUrl);
        }

        // Verifica se o provedor atual suporta imagens
        if (!provider.supportsImages && (base64Image || quizData.questionType === 'match_image_to_text')) {
            console.warn(`${provider.name} não suporta imagens. Mostrando aviso...`);
            try {
                const acaoUsuario = await mostrarAvisoProvedorSemImagem(provider.name);
                if (acaoUsuario === 'trocar_provedor') {
                    // Alternar para Gemini que suporta imagens
                    const oldProvider = currentProvider;
                    currentProvider = 'gemini';
                    
                    // Verifica se o Gemini tem chave
                    const geminiProvider = PROVIDERS['gemini'];
                    const hasGeminiKey = geminiProvider.keys.some(k => k && k.length > 10 && !k.includes('SUA_'));
                    
                    if (!hasGeminiKey) {
                        await configurarApiKey('gemini');
                    }
                    
                    const toggleBtn = document.getElementById('ai-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.innerText = 'IA: Gemini';
                        toggleBtn.style.color = '#a78bfa';
                    }
                    
                    // Recursivamente chama a função com o novo provedor
                    return await obterRespostaDaIA(quizData);
                } else if (acaoUsuario === 'sem_imagem') {
                    console.log(`Usuário escolheu enviar para ${provider.name} sem a imagem.`);
                    base64Image = null;
                    if (quizData.questionType === 'match_image_to_text') {
                        quizData.questionType = 'match_order';
                        quizData.draggableItems = quizData.draggableItems.map(item => ({
                            text: item.id,
                            element: item.element
                        }));
                        // Atualiza o prompt
                        promptDeInstrucao = `Responda com os pares no formato EXATO: 'Texto do Local para Soltar -> ID da Imagem'...`;
                        const draggables = quizData.draggableItems.map(item => `- "${item.text}"`).join('\n');
                        const droppables = quizData.dropZones.map(item => `- "${item.text}"`).join('\n');
                        formattedOptions = `Itens para Arrastar (IDs):\n${draggables}\n\nLocais para Soltar:\n${droppables}`;
                        textPrompt = `${promptDeInstrucao}\n\n---\nPERGUNTA: "${quizData.questionText}"\n---\n${formattedOptions}`;
                    }
                }
            } catch (error) {
                console.error(error.message);
                throw error;
            }
        }

        // --- 3. Lógica de Fetch ---
        try {
            let aiResponseText = null;
            const providerConfig = PROVIDERS[currentProvider];
            
            console.log(`Usando Provedor: ${providerConfig.name}`);
            
            for (let i = 0; i < providerConfig.keys.length; i++) {
                const currentKey = providerConfig.keys[currentKeyIndex];
                
                if (!currentKey || currentKey.includes('SUA_') || currentKey.length < 10) {
                    console.warn(`Chave ${providerConfig.name} #${currentKeyIndex + 1} parece ser um placeholder. Pulando...`);
                    currentKeyIndex = (currentKeyIndex + 1) % providerConfig.keys.length;
                    continue;
                }

                let response;
                
                if (currentProvider === 'gemini') {
                    // Gemini específico
                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${currentKey}`;
                    let promptParts = [{ text: textPrompt }];
                    
                    if (base64Image) {
                        const [header, data] = base64Image.split(',');
                        let mimeType = header.match(/:(.*?);/)[1];
                        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) mimeType = 'image/jpeg';
                        promptParts.push({ inline_data: { mime_type: mimeType, data: data } });
                    }

                    response = await fetchWithTimeout(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: promptParts }] })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        aiResponseText = data.candidates[0].content.parts[0].text;
                        console.log(`✅ Sucesso com Chave ${providerConfig.name} #${currentKeyIndex + 1}`);
                        break;
                    }

                } else if (currentProvider === 'mistral' || currentProvider === 'deepseek') {
                    // Mistral e DeepSeek usam formato similar (OpenAI-like)
                    const isMistral = currentProvider === 'mistral';
                    const API_URL = isMistral 
                        ? 'https://api.mistral.ai/v1/chat/completions'
                        : 'https://openrouter.ai/api/v1/chat/completions';
                    
                    const modelName = isMistral ? 'mistral-large-latest' : providerConfig.modelName;
                    
                    const body = {
                        model: modelName,
                        messages: [{ role: 'user', content: textPrompt }],
                        max_tokens: 1024
                    };

                    const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentKey}`
                    };

                    if (!isMistral) {
                        headers['HTTP-Referer'] = 'https://github.com/mzzvxm';
                        headers['X-Title'] = 'Quizizz Bypass Script';
                    }

                    response = await fetchWithTimeout(API_URL, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(body)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        aiResponseText = data.choices[0].message.content;
                        console.log(`✅ Sucesso com Chave ${providerConfig.name} #${currentKeyIndex + 1}`);
                        break;
                    }
                }

                // Se chegou aqui, a chave falhou
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `Erro ${response.status}`;
                console.warn(`❌ Chave ${providerConfig.name} #${currentKeyIndex + 1} falhou: ${errorMessage}. Tentando próxima...`);
                lastAiResponse = `Falha na Chave ${providerConfig.name} #${currentKeyIndex + 1}: ${errorMessage}`;
                
                currentKeyIndex = (currentKeyIndex + 1) % providerConfig.keys.length;
            }

            if (!aiResponseText) {
                throw new Error(`Todas as chaves de API do ${providerConfig.name} falharam.`);
            }

            console.log("Resposta bruta da IA:", aiResponseText);
            lastAiResponse = aiResponseText;
            return aiResponseText;

        } catch (error) {
            console.error(`Falha ao obter resposta da IA (${currentProvider}):`, error.message);
            lastAiResponse = `Erro: ${error.message}`;
            throw error;
        }
    }

    // --- FUNÇÃO DE AVISO MODIFICADA ---
    function mostrarAvisoProvedorSemImagem(providerName) {
        return new Promise((resolve, reject) => {
            const oldModal = document.getElementById('provider-image-warning');
            if (oldModal) oldModal.remove();

            const overlay = document.createElement('div');
            overlay.id = 'provider-image-warning';
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: '2147483648',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.2s ease', opacity: '0'
            });

            const modalContainer = document.createElement('div');
            Object.assign(modalContainer.style, {
                background: 'rgba(26, 27, 30, 0.9)', backdropFilter: 'blur(10px)',
                padding: '24px', borderRadius: '16px', color: 'white',
                fontFamily: 'system-ui, sans-serif', maxWidth: '400px',
                textAlign: 'center', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            });

            const title = document.createElement('h3');
            title.innerText = `⚠️ ${providerName} Não Vê Imagens`;
            Object.assign(title.style, {
                margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600'
            });

            const message = document.createElement('p');
            message.innerText = `Esta pergunta contém imagens que o ${providerName} não pode processar. O que você deseja fazer?`;
            Object.assign(message.style, {
                margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.8)'
            });

            const buttonContainer = document.createElement('div');
            Object.assign(buttonContainer.style, {
                display: 'flex', flexDirection: 'column', gap: '10px'
            });

            const closeModal = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            };

            const btnTrocar = document.createElement('button');
            btnTrocar.innerText = '🔄 Trocar para Gemini (Recomendado)';
            Object.assign(btnTrocar.style, {
                background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', padding: '12px',
                transition: 'all 0.2s ease'
            });
            btnTrocar.onmouseover = () => btnTrocar.style.opacity = '0.9';
            btnTrocar.onmouseout = () => btnTrocar.style.opacity = '1';
            btnTrocar.onclick = () => {
                closeModal();
                resolve('trocar_provedor');
            };

            const btnSemImagem = document.createElement('button');
            btnSemImagem.innerText = 'Responder sem enviar Imagem';
            Object.assign(btnSemImagem.style, {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                padding: '12px', transition: 'all 0.2s ease'
            });
            btnSemImagem.onmouseover = () => btnSemImagem.style.background = 'rgba(255, 255, 255, 0.15)';
            btnSemImagem.onmouseout = () => btnSemImagem.style.background = 'rgba(255, 255, 255, 0.1)';
            btnSemImagem.onclick = () => {
                closeModal();
                resolve('sem_imagem');
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    closeModal();
                    reject(new Error('Ação cancelada.'));
                }
            };

            buttonContainer.appendChild(btnTrocar);
            buttonContainer.appendChild(btnSemImagem);
            modalContainer.appendChild(title);
            modalContainer.appendChild(message);
            modalContainer.appendChild(buttonContainer);
            overlay.appendChild(modalContainer);
            document.body.appendChild(overlay);

            setTimeout(() => overlay.style.opacity = '1', 10);
        });
    }

    // --- FUNÇÃO DE TOGGLE MODIFICADA ---
    function criarFloatingPanel() {
        if (document.getElementById('mzzvxm-floating-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'mzzvxm-floating-panel';
        Object.assign(panel.style, {
            position: 'fixed', bottom: '60px', right: '20px', zIndex: '2147483647',
            display: 'flex', flexDirection: 'column', alignItems: 'stretch',
            gap: '10px', padding: '12px', backgroundColor: 'rgba(26, 27, 30, 0.7)',
            backdropFilter: 'blur(8px)', webkitBackdropFilter: 'blur(8px)', borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            transform: 'translateY(20px)', opacity: '0',
            cursor: 'default'
        });

        // ... (criar elementos UI igual antes)

        // Botão de alternância de provedor MODIFICADO
        const aiToggleBtn = document.createElement('button');
        aiToggleBtn.id = 'ai-toggle-btn';
        aiToggleBtn.innerText = `IA: ${PROVIDERS[currentProvider].name}`;
        Object.assign(aiToggleBtn.style, {
            background: 'none', border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer',
            fontSize: '11px', padding: '4px 8px', borderRadius: '6px',
            transition: 'all 0.2s ease',
            marginBottom: '4px'
        });

        aiToggleBtn.addEventListener('click', async () => {
            // Ciclo entre provedores
            const providerNames = ['gemini', 'deepseek', 'mistral'];
            const currentIndex = providerNames.indexOf(currentProvider);
            const nextIndex = (currentIndex + 1) % providerNames.length;
            const nextProvider = providerNames[nextIndex];
            
            // Verifica se o próximo provedor tem chave configurada
            const nextProviderConfig = PROVIDERS[nextProvider];
            const hasKey = nextProviderConfig.keys.some(k => k && k.length > 10 && !k.includes('SUA_'));
            
            if (!hasKey) {
                const configured = await configurarApiKey(nextProvider);
                if (!configured) {
                    return; // Cancelado pelo usuário
                }
            }
            
            currentProvider = nextProvider;
            aiToggleBtn.innerText = `IA: ${PROVIDERS[currentProvider].name}`;
            aiToggleBtn.style.color = '#a78bfa';
            
            console.log(`Provedor alterado para: ${currentProvider} (${PROVIDERS[currentProvider].name})`);
        });

        // ... (resto do código UI)

        document.body.appendChild(panel);
        setTimeout(() => {
            panel.style.transform = 'translateY(0)';
            panel.style.opacity = '1';
        }, 100);
        console.log("Floating Panel v52.2 criado com sucesso!");
    }

    // --- FUNÇÕES EXISTENTES (mantidas) ---
    // ... (waitForElement, waitForElementToDisappear, extrairDadosDaQuestao, etc.)

    // --- START ---
    setTimeout(criarFloatingPanel, 2000);
    initQuizIdDetector();

})();
