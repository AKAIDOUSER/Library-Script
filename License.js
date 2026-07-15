// ============================================================
// SCRIPT DE VERIFICAÇÃO DE WHITELIST - SITES EDUCACIONAIS
// ============================================================
// Versão: 1.0
// Descrição: Verifica se o email do usuário logado está na whitelist do Firebase
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONFIGURAÇÃO DO FIREBASE
    // ============================================================
    const FIREBASE_URL = 'https://scriptsed-default-rtdb.firebaseio.com/';

    // ============================================================
    // CONFIGURAÇÃO DOS SITES PERMITIDOS
    // ============================================================
    const SITES = {
        'pt.khanacademy.org': {
            nome: 'Khan Academy',
            icone: '🎓',
            seletor: 'span._1x2j2rmo',
            fallback: '@escola.pr.gov.br'
        },
        'leiaparana.odilo.us': {
            nome: 'Leia Paraná',
            icone: '📚',
            seletor: 'div.profile',
            fallback: '@escola.pr.gov.br'
        },
        'wayground.com': {
            nome: 'Wayground',
            icone: '🌍',
            seletor: 'li.email.light-text-color',
            fallback: '@escola.pr.gov.br'
        },
        'redacao.pr.gov.br': {
            nome: 'Redação',
            icone: '📝',
            seletor: 'p.MuiTypography-root.MuiTypography-body1.css-1jws50b',
            fallback: '@escola.pr.gov.br'
        }
    };

    // ============================================================
    // FUNÇÃO PARA EXTRAIR EMAIL DO ELEMENTO
    // ============================================================
    function extrairEmail(texto) {
        // Procura por qualquer email no texto
        const match = texto.match(/\S+@\S+/);
        return match ? match[0] : null;
    }

    // ============================================================
    // FUNÇÃO PARA PEGAR O EMAIL DA PÁGINA
    // ============================================================
    function pegarEmail(hostname) {
        const site = SITES[hostname];
        if (!site) return null;

        console.log(`🔍 Procurando email em: ${site.nome}`);

        // 1. Tenta pegar pelo seletor principal
        let elemento = document.querySelector(site.seletor);
        if (elemento) {
            const texto = elemento.textContent.trim();
            const email = extrairEmail(texto);
            if (email) {
                console.log(`✅ Email encontrado pelo seletor: ${email}`);
                return email;
            }
        }

        // 2. Fallback: procura qualquer elemento com @escola.pr.gov.br
        console.log(`🔍 Seletor não encontrado, buscando por ${site.fallback}...`);
        const todosElementos = document.querySelectorAll('*');
        for (const el of todosElementos) {
            const texto = el.textContent.trim();
            if (texto.includes(site.fallback)) {
                const email = extrairEmail(texto);
                if (email) {
                    console.log(`✅ Email encontrado no fallback: ${email}`);
                    return email;
                }
            }
        }

        console.log('❌ Email não encontrado na página');
        return null;
    }

    // ============================================================
    // FUNÇÃO PARA VERIFICAR NO FIREBASE
    // ============================================================
    function verificarWhitelist(email) {
        const emailEncoded = encodeURIComponent(email);
        const url = `${FIREBASE_URL}Users.json?orderBy="email"&equalTo="${emailEncoded}"`;

        console.log(`📡 Consultando Firebase: ${url}`);

        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log('📦 Resposta do Firebase:', data);
                
                if (data && Object.keys(data).length > 0) {
                    // Pega o primeiro usuário encontrado
                    const userId = Object.keys(data)[0];
                    const user = data[userId];
                    return { encontrado: true, userId: userId, user: user };
                } else {
                    return { encontrado: false };
                }
            });
    }

    // ============================================================
    // FUNÇÃO PARA VERIFICAR VALIDADE DO USUÁRIO
    // ============================================================
    function verificarValidade(user) {
        // Admin nunca expira
        if (user.patent === 'Developer' || user.patent === 'Admin') {
            return { valido: true, mensagem: 'Administrador' };
        }

        // Verifica se está ativo
        if (user.active === false) {
            return { valido: false, mensagem: 'Usuário inativo' };
        }

        // Verifica pausa individual
        if (user.pausedUntil && user.pausedUntil > Date.now()) {
            const data = new Date(user.pausedUntil);
            return { 
                valido: false, 
                mensagem: `Pausado até ${data.toLocaleDateString('pt-BR')}` 
            };
        }

        // Verifica expiração
        if (user.createdAt && user.planDuration) {
            const durationMs = user.planDuration * 24 * 60 * 60 * 1000;
            let expiration = user.createdAt + durationMs;

            // Adiciona dias de pausa (se houver histórico)
            if (user.pauseHistory) {
                let totalPaused = 0;
                for (const pause of user.pauseHistory) {
                    const end = pause.end || Date.now();
                    totalPaused += (end - pause.start);
                }
                expiration += totalPaused;
            }

            if (expiration <= Date.now()) {
                return { 
                    valido: false, 
                    mensagem: `Assinatura expirada (${user.patent || 'Basic'})` 
                };
            }

            // Calcula dias restantes
            const diff = expiration - Date.now();
            const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
            return { 
                valido: true, 
                mensagem: `Dias restantes: ${daysLeft}`,
                daysLeft: daysLeft,
                expiration: expiration
            };
        }

        return { valido: true, mensagem: 'Acesso liberado' };
    }

    // ============================================================
    // FUNÇÃO PARA MOSTRAR RESULTADO
    // ============================================================
    function mostrarResultado(hostname, email, resultado, validade) {
        const site = SITES[hostname];
        const nomeSite = site ? site.nome : 'Desconhecido';
        const iconeSite = site ? site.icone : '🌐';

        let mensagem = '';
        let titulo = '';

        if (resultado.encontrado && validade.valido) {
            titulo = '✅ ACESSO LIBERADO!';
            mensagem = `👤 Email: ${email}\n` +
                       `📋 Plano: ${resultado.user.patent || 'Basic'}\n` +
                       `📅 ${validade.mensagem}\n` +
                       `🌐 Site: ${nomeSite} ${iconeSite}\n\n` +
                       `Bem-vindo(a)! 🎉`;
        } else if (resultado.encontrado && !validade.valido) {
            titulo = '❌ ACESSO NEGADO!';
            mensagem = `👤 Email: ${email}\n` +
                       `📋 Plano: ${resultado.user.patent || 'Basic'}\n` +
                       `⚠️ Motivo: ${validade.mensagem}\n` +
                       `🌐 Site: ${nomeSite} ${iconeSite}\n\n` +
                       `Entre em contato com o administrador.`;
        } else {
            titulo = '❌ ACESSO NEGADO!';
            mensagem = `👤 Email: ${email}\n` +
                       `⚠️ Email não encontrado na whitelist\n` +
                       `🌐 Site: ${nomeSite} ${iconeSite}\n\n` +
                       `Entre em contato com o administrador.`;
        }

        alert(`${titulo}\n\n${mensagem}`);
        console.log(`📊 Resultado: ${titulo}`);
        console.log(`📝 ${mensagem.replace(/\n/g, ' | ')}`);
    }

    // ============================================================
    // FUNÇÃO PARA VERIFICAR PAUSA GLOBAL
    // ============================================================
    function verificarPausaGlobal() {
        return fetch(`${FIREBASE_URL}Settings/globalPause/active.json`)
            .then(res => res.json())
            .then(data => {
                return data === true;
            })
            .catch(() => false);
    }

    // ============================================================
    // FUNÇÃO PRINCIPAL
    // ============================================================
    function main() {
        const hostname = window.location.hostname;
        const site = SITES[hostname];

        console.log('🚀 Iniciando verificação de whitelist...');
        console.log(`🌐 Site atual: ${hostname}`);

        // 1. Verifica se o site é permitido
        if (!site) {
            alert(`❌ SITE NÃO PERMITIDO!\n\nSite: ${hostname}\n\nEste site não está na lista de permissão.`);
            console.warn(`🚫 Site não permitido: ${hostname}`);
            return;
        }

        console.log(`✅ Site permitido: ${site.nome}`);

        // 2. Tenta pegar o email da página
        const email = pegarEmail(hostname);
        if (!email) {
            alert(`❌ EMAIL NÃO ENCONTRADO!\n\nSite: ${site.nome} ${site.icone}\n\nPor favor, faça login no site primeiro e tente novamente.`);
            console.warn('❌ Email não encontrado na página');
            return;
        }

        console.log(`📧 Email encontrado: ${email}`);

        // 3. Verifica pausa global
        verificarPausaGlobal()
            .then(pausado => {
                if (pausado) {
                    alert(`⏸️ SISTEMA PAUSADO!\n\nO acesso está temporariamente bloqueado para todos os usuários.\n\nTente novamente mais tarde.`);
                    console.warn('⏸️ Sistema pausado globalmente');
                    return;
                }

                // 4. Verifica no Firebase
                return verificarWhitelist(email)
                    .then(resultado => {
                        if (!resultado.encontrado) {
                            mostrarResultado(hostname, email, resultado, { valido: false });
                            return;
                        }

                        // 5. Verifica validade
                        const validade = verificarValidade(resultado.user);
                        mostrarResultado(hostname, email, resultado, validade);

                        // Se for válido, registra acesso (opcional)
                        if (validade.valido) {
                            console.log('✅ Acesso registrado com sucesso!');
                            // Aqui pode adicionar log no Firebase se quiser
                        }
                    });
            })
            .catch(err => {
                alert(`⚠️ ERRO AO VERIFICAR!\n\n${err.message}\n\nVerifique sua conexão com a internet.`);
                console.error('❌ Erro:', err);
            });
    }

    // ============================================================
    // EXECUTA O SCRIPT
    // ============================================================
    main();

})();
