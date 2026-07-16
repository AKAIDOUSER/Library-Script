(function(){
    const FIREBASE_URL='https://scriptsed-default-rtdb.firebaseio.com/';
    const API_KEY='AIzaSyBte51pb6Oyg1d_mUmi0N2LgBhCPRoQ3uk';
    
    const SITES={
        'pt.khanacademy.org':{nome:'Khan Academy',icone:'🎓'},
        'leiaparana.odilo.us':{nome:'Leia Paraná',icone:'📚'},
        'wayground.com':{nome:'Wayground',icone:'🌍'},
        'redacao.pr.gov.br':{nome:'Redação',icone:'📝'}
    };

    const hostname=window.location.hostname;
    const site=SITES[hostname];
    
    if(!site){
        alert('❌ SITE NÃO PERMITIDO!\n\nSite: '+hostname);
        return;
    }

    // ============================================
    // BUSCA EMAIL EM TODA A PÁGINA (QUALQUER LUGAR)
    // ============================================
    function extrairEmail(texto){
        const match=texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return match?match[0]:null;
    }

    function buscarEmailEmTodaPagina(){
        // 1. Procura em todos os elementos visíveis
        const elementos=document.querySelectorAll('*');
        for(const el of elementos){
            // Pega o texto do elemento e de seus filhos
            const texto=el.textContent||'';
            if(texto.includes('@')){
                const email=extrairEmail(texto);
                if(email) return email;
            }
        }
        
        // 2. Fallback: TreeWalker mais profundo
        try{
            const walker=document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node){
                        if(node.textContent.includes('@')){
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            let node;
            while(node=walker.nextNode()){
                const email=extrairEmail(node.textContent);
                if(email) return email;
            }
        }catch(e){}
        
        return null;
    }

    let email=buscarEmailEmTodaPagina();

    if(!email){
        alert('❌ EMAIL NÃO ENCONTRADO!\n\nSite: '+site.nome+' '+site.icone+'\n\n'+
              '1. Faça login no site\n'+
              '2. Clique no seu perfil\n'+
              '3. Tente novamente');
        return;
    }

    console.log('📧 Email encontrado:',email);

    // ============================================
    // CONSULTA FIREBASE COM AUTENTICAÇÃO
    // ============================================
    // Usando REST API com auth
    const url=`${FIREBASE_URL}Users.json?orderBy="email"&equalTo="${encodeURIComponent(email)}"`;
    
    // Tenta com auth
    const urlComAuth=`${url}&auth=${API_KEY}`;
    console.log('📡 Consultando Firebase...');

    fetch(urlComAuth)
        .then(r=>{
            if(r.status===401){
                // Se der 401, tenta sem auth (regras públicas)
                console.log('🔑 Tentando sem autenticação...');
                return fetch(url);
            }
            return r;
        })
        .then(r=>{
            if(!r.ok)throw new Error('HTTP '+r.status+' - Não foi possível acessar o banco');
            return r.json();
        })
        .then(data=>{
            console.log('📦 Resposta do Firebase:',data);
            
            if(data && Object.keys(data).length>0){
                const userId=Object.keys(data)[0];
                const user=data[userId];
                
                // Verificações de acesso
                if(user.active===false){
                    alert('❌ ACESSO NEGADO!\n\nEmail: '+email+'\nMotivo: Usuário inativo');
                    return;
                }
                
                if(user.pausedUntil && user.pausedUntil>Date.now()){
                    const dataPausa=new Date(user.pausedUntil);
                    alert('⏸️ ACESSO PAUSADO!\n\nEmail: '+email+'\nLiberação: '+dataPausa.toLocaleDateString('pt-BR'));
                    return;
                }
                
                let expirado=false;
                let diasRestantes='';
                
                if(user.patent!=='Developer' && user.patent!=='Admin'){
                    if(user.createdAt && user.planDuration){
                        const durationMs=user.planDuration*24*60*60*1000;
                        let expiration=user.createdAt+durationMs;
                        
                        if(user.pauseHistory){
                            let totalPaused=0;
                            for(const pause of user.pauseHistory){
                                const end=pause.end||Date.now();
                                totalPaused+=(end-pause.start);
                            }
                            expiration+=totalPaused;
                        }
                        
                        if(expiration<=Date.now()){
                            expirado=true;
                        }else{
                            const diff=expiration-Date.now();
                            diasRestantes='Dias restantes: '+Math.ceil(diff/(24*60*60*1000));
                        }
                    }
                }
                
                if(expirado){
                    alert('❌ ASSINATURA EXPIRADA!\n\nEmail: '+email+'\nPlano: '+(user.patent||'Basic'));
                    return;
                }
                
                // ✅ ACESSO LIBERADO
                const patent=user.patent||'Basic';
                const nome=user.name||email;
                let mensagem='✅ ACESSO LIBERADO!\n\n';
                mensagem+='👤 Usuário: '+nome+'\n';
                mensagem+='📋 Plano: '+patent+'\n';
                if(diasRestantes) mensagem+='📅 '+diasRestantes+'\n';
                mensagem+='🌐 Site: '+site.nome+' '+site.icone+'\n\n';
                mensagem+='Bem-vindo(a)! 🎉';
                alert(mensagem);
                
            }else{
                alert('❌ ACESSO NEGADO!\n\nEmail: '+email+'\n\nEste email não está cadastrado na whitelist.');
            }
        })
        .catch(err=>{
            alert('⚠️ ERRO AO CONECTAR AO FIREBASE!\n\n'+
                  err.message+'\n\n'+
                  'Verifique:\n'+
                  '1. Regras de segurança do Firebase\n'+
                  '2. API Key correta\n'+
                  '3. Conexão com a internet');
            console.error('❌ Erro detalhado:',err);
        });

})();
