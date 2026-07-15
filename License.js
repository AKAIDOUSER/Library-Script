(function(){
    const FIREBASE_URL='https://scriptsed-default-rtdb.firebaseio.com/';
    const SITES={
        'pt.khanacademy.org':{
            nome:'Khan Academy',
            icone:'🎓'
        },
        'leiaparana.odilo.us':{
            nome:'Leia Paraná',
            icone:'📚'
        },
        'wayground.com':{
            nome:'Wayground',
            icone:'🌍'
        },
        'redacao.pr.gov.br':{
            nome:'Redação',
            icone:'📝'
        }
    };

    const hostname=window.location.hostname;
    const site=SITES[hostname];
    
    if(!site){
        alert('❌ SITE NÃO PERMITIDO!\n\nSite: '+hostname);
        return;
    }

    function extrairEmail(texto){
        const match=texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return match?match[0]:null;
    }

    function buscarEmailEmTodaPagina(){
        const walker=document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node){
                    if(node.textContent.includes('@escola.pr.gov.br')){
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
        return null;
    }

    let email=buscarEmailEmTodaPagina();

    if(!email){
        alert('❌ EMAIL NÃO ENCONTRADO!\n\nSite: '+site.nome+' '+site.icone+'\n\nFaça login no site primeiro.');
        return;
    }

    console.log('📧 Email encontrado:',email);

    fetch(`${FIREBASE_URL}Users.json?orderBy="email"&equalTo="${encodeURIComponent(email)}"`)
        .then(r=>{
            if(!r.ok)throw new Error('HTTP '+r.status);
            return r.json();
        })
        .then(data=>{
            if(data&&Object.keys(data).length>0){
                const userId=Object.keys(data)[0];
                const user=data[userId];
                
                if(user.active===false){
                    alert('❌ ACESSO NEGADO!\n\nEmail: '+email+'\nMotivo: Usuário inativo');
                    return;
                }
                
                if(user.pausedUntil&&user.pausedUntil>Date.now()){
                    const dataPausa=new Date(user.pausedUntil);
                    alert('⏸️ ACESSO PAUSADO!\n\nEmail: '+email+'\nLiberação: '+dataPausa.toLocaleDateString('pt-BR'));
                    return;
                }
                
                let expirado=false;
                let diasRestantes='';
                
                if(user.patent!=='Developer'&&user.patent!=='Admin'&&user.createdAt&&user.planDuration){
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
                
                if(expirado){
                    alert('❌ ASSINATURA EXPIRADA!\n\nEmail: '+email+'\nPlano: '+(user.patent||'Basic'));
                    return;
                }
                
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
                alert('❌ ACESSO NEGADO!\n\nEmail: '+email+'\n\nNão está na whitelist.');
            }
        })
        .catch(err=>{
            alert('⚠️ ERRO AO CONECTAR AO FIREBASE!\n\n'+err.message+'\n\nVerifique sua conexão.');
            console.error('❌ Erro:',err);
        });

})();
