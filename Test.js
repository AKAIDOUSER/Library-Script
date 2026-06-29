// ========================================
// BOOKMARKLET: Auto Digitador + Capturador
// ========================================
// Versão: 2.0
// Autor: Seu Nome
// Descrição: Captura elementos e digita automaticamente
// ========================================

(function() {
  'use strict';

  // ===============================
  // CONFIGURAÇÃO DOS ELEMENTOS
  // ===============================
  const CONFIG = {
    // Classes dos elementos (personalize aqui)
    elementos: {
      titulo: 'input.MuiInputBase-input.MuiOutlinedInput-input.css-xujrrk',
      redacao: 'textarea.MuiInputBase-input.MuiOutlinedInput-input.MuiInputBase-inputMultiline.css-1nu4rzx',
      salvar: 'button.MuiBox-root.css-1nuzzzk'
    },
    // Textos padrão
    textos: {
      titulo: 'Minha Redação - ' + new Date().toLocaleDateString(),
      redacao: 'Esta é uma redação de exemplo. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    },
    // Velocidade padrão (ms)
    velocidadePadrao: 40
  };

  // ===============================
  // FUNÇÕES AUXILIARES
  // ===============================

  // Encontrar elementos na página
  function encontrarElementos() {
    const el = CONFIG.elementos;
    return {
      titulo: document.querySelector(el.titulo),
      redacao: document.querySelector(el.redacao),
      salvar: document.querySelector(el.salvar)
    };
  }

  // Verificar se elementos existem
  function verificarElementos(elementos) {
    const resultado = {
      ok: true,
      mensagem: '🔍 VERIFICANDO ELEMENTOS:\n\n'
    };

    const campos = [
      { nome: 'Título', elemento: elementos.titulo },
      { nome: 'Redação', elemento: elementos.redacao },
      { nome: 'Botão Salvar', elemento: elementos.salvar }
    ];

    campos.forEach(campo => {
      if (campo.elemento) {
        resultado.mensagem += '✅ ' + campo.nome + ' encontrado\n';
      } else {
        resultado.mensagem += '❌ ' + campo.nome + ' NÃO encontrado\n';
        resultado.ok = false;
      }
    });

    resultado.mensagem += '\n' + (resultado.ok ? 
      '🎯 Todos os elementos prontos!' : 
      '⚠️ Alguns elementos faltando.'
    );

    return resultado;
  }

  // ===============================
  // FUNÇÃO DE DIGITAÇÃO
  // ===============================

  function digitarTexto(elemento, texto, velocidade, callback) {
    if (!elemento) {
      if (callback) callback(false);
      return;
    }

    const isInput = elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA';
    const isEditable = !!elemento.isContentEditable;
    
    let index = 0;
    let pausado = false;
    let timeoutId = null;
    let originalReadOnly = null;

    // Preparar campo
    if (isInput) {
      originalReadOnly = elemento.readOnly;
      elemento.readOnly = true;
      elemento.focus();
      const pos = elemento.value ? elemento.value.length : 0;
      elemento.setSelectionRange(pos, pos);
    }

    function getInterval() {
      if (velocidade === 'humana') {
        return Math.random() < 0.05 ? 
          500 + Math.random() * 1000 : 
          100 + Math.random() * 200;
      }
      return parseInt(velocidade, 10) || CONFIG.velocidadePadrao;
    }

    function inserirCaractere(char) {
      try {
        if (isInput) {
          const pos = elemento.selectionStart || elemento.value.length;
          const valor = elemento.value || '';
          elemento.value = valor.slice(0, pos) + char + valor.slice(pos);
          const newPos = pos + char.length;
          elemento.setSelectionRange(newPos, newPos);
        } else if (isEditable) {
          const sel = window.getSelection();
          const range = sel.rangeCount ? 
            sel.getRangeAt(0) : 
            document.createRange();
          
          if (!elemento.contains(range.commonAncestorContainer)) {
            range.selectNodeContents(elemento);
            range.collapse(false);
          }
          
          const textNode = document.createTextNode(char);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          elemento.innerText = (elemento.innerText || '') + char;
        }

        // Disparar eventos
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {
        // Fallback
        elemento.value = (elemento.value || '') + char;
      }
    }

    function digitar() {
      if (pausado) return;

      if (index < texto.length) {
        inserirCaractere(texto[index++]);
        timeoutId = setTimeout(digitar, getInterval());
      } else {
        // Finalizar
        if (isInput && originalReadOnly !== null) {
          elemento.readOnly = originalReadOnly;
        }
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
        if (callback) callback(true);
      }
    }

    // Iniciar
    timeoutId = setTimeout(digitar, 300);

    // Retornar controles
    return {
      pausar: () => { pausado = true; },
      continuar: () => { pausado = false; digitar(); },
      parar: () => {
        pausado = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (isInput && originalReadOnly !== null) {
          elemento.readOnly = originalReadOnly;
        }
      }
    };
  }

  // ===============================
  // FUNÇÃO PARA PEGAR TEXTO DO USUÁRIO
  // ===============================

  function perguntarTexto(mensagem, padrao) {
    return prompt(mensagem, padrao);
  }

  function perguntarVelocidade() {
    const vel = prompt(
      '⚡ Velocidade da digitação:\n\n' +
      '10  - Muito Rápido\n' +
      '20  - Rápido\n' +
      '40  - Normal (padrão)\n' +
      '60  - Devagar\n' +
      '100 - Muito Devagar\n' +
      'humana - Velocidade Humana\n\n' +
      'Digite o valor:',
      String(CONFIG.velocidadePadrao)
    );
    return vel || String(CONFIG.velocidadePadrao);
  }

  // ===============================
  // AÇÕES
  // ===============================

  function acaoDigitarTitulo(elementos, velocidade) {
    const texto = perguntarTexto('Digite o título:', CONFIG.textos.titulo);
    if (texto !== null) {
      elementos.titulo.value = '';
      elementos.titulo.focus();
      digitarTexto(elementos.titulo, texto, velocidade, () => {
        alert('✅ Título digitado com sucesso!');
      });
    }
  }

  function acaoDigitarRedacao(elementos, velocidade) {
    const texto = perguntarTexto('Digite a redação:', CONFIG.textos.redacao);
    if (texto !== null) {
      elementos.redacao.value = '';
      elementos.redacao.focus();
      digitarTexto(elementos.redacao, texto, velocidade, () => {
        alert('✅ Redação digitada com sucesso!');
      });
    }
  }

  function acaoDigitarTudo(elementos, velocidade) {
    const titulo = perguntarTexto('Digite o título:', CONFIG.textos.titulo);
    const redacao = perguntarTexto('Digite a redação:', CONFIG.textos.redacao);

    if (titulo !== null) {
      elementos.titulo.value = '';
      elementos.titulo.focus();
      digitarTexto(elementos.titulo, titulo, velocidade, () => {
        if (redacao !== null) {
          elementos.redacao.value = '';
          elementos.redacao.focus();
          digitarTexto(elementos.redacao, redacao, velocidade, () => {
            alert('✅ Título e redação digitados com sucesso!');
          });
        }
      });
    }
  }

  function acaoDigitarCampoEspecifico(elementos, velocidade) {
    const campo = prompt('Qual campo?\n1 - Título\n2 - Redação');
    const texto = perguntarTexto('Digite o texto:');
    
    if (texto !== null) {
      const alvo = campo === '1' ? elementos.titulo : elementos.redacao;
      if (alvo) {
        alvo.value = '';
        alvo.focus();
        digitarTexto(alvo, texto, velocidade, () => {
          alert('✅ Texto digitado com sucesso!');
        });
      }
    }
  }

  function acaoSalvar(elementos) {
    if (elementos.salvar) {
      elementos.salvar.click();
      alert('✅ Botão Salvar clicado!');
    } else {
      alert('❌ Botão Salvar não encontrado!');
    }
  }

  function acaoCompleta(elementos, velocidade) {
    elementos.titulo.value = '';
    elementos.titulo.focus();
    digitarTexto(elementos.titulo, CONFIG.textos.titulo, velocidade, () => {
      elementos.redacao.value = '';
      elementos.redacao.focus();
      digitarTexto(elementos.redacao, CONFIG.textos.redacao, velocidade, () => {
        setTimeout(() => {
          if (elementos.salvar) {
            elementos.salvar.click();
            alert('✅ Título, redação digitados e salvos com sucesso!');
          } else {
            alert('✅ Título e redação digitados! (Botão Salvar não encontrado)');
          }
        }, 500);
      });
    });
  }

  // ===============================
  // MENU PRINCIPAL
  // ===============================

  function mostrarMenu() {
    // Encontrar elementos
    const elementos = encontrarElementos();
    
    // Verificar elementos
    const verificacao = verificarElementos(elementos);
    alert(verificacao.mensagem);
    
    if (!verificacao.ok) {
      if (!confirm('⚠️ Alguns elementos não foram encontrados. Continuar mesmo assim?')) {
        return;
      }
    }

    // Perguntar velocidade
    const velocidade = perguntarVelocidade();

    // Mostrar menu
    const opcao = prompt(
      '📝 O que deseja fazer?\n\n' +
      '1  - Digitar apenas Título\n' +
      '2  - Digitar apenas Redação\n' +
      '3  - Digitar Título e Redação\n' +
      '4  - Digitar campo específico\n' +
      '5  - Apenas clicar em Salvar\n' +
      '6  - Digitar Título + Redação + Salvar\n' +
      '7  - Sair\n\n' +
      'Digite o número da opção:'
    );

    // Executar ação
    switch(opcao) {
      case '1':
        acaoDigitarTitulo(elementos, velocidade);
        break;
      case '2':
        acaoDigitarRedacao(elementos, velocidade);
        break;
      case '3':
        acaoDigitarTudo(elementos, velocidade);
        break;
      case '4':
        acaoDigitarCampoEspecifico(elementos, velocidade);
        break;
      case '5':
        acaoSalvar(elementos);
        break;
      case '6':
        acaoCompleta(elementos, velocidade);
        break;
      case '7':
        alert('👋 Saindo...');
        break;
      default:
        alert('❌ Opção inválida!');
    }
  }

  // ===============================
  // INICIAR
  // ===============================

  // Verificar se já está rodando
  if (window.__bookmarklet_auto_digitador) {
    if (!confirm('🔄 O bookmarklet já está rodando. Reiniciar?')) {
      return;
    }
  }

  window.__bookmarklet_auto_digitador = true;
  mostrarMenu();

  // Limpar flag quando terminar
  setTimeout(() => {
    window.__bookmarklet_auto_digitador = false;
  }, 5000);

})();
