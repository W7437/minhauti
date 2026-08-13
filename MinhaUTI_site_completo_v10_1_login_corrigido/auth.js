(function(){
  const cfg=window.MINHAUTI_AUTH||{};
  const configured=Boolean(
    cfg.supabaseUrl && cfg.supabaseAnonKey &&
    !String(cfg.supabaseUrl).includes('COLE_AQUI') &&
    !String(cfg.supabaseAnonKey).includes('COLE_AQUI')
  );

  window.MinhaUTIAuth={configured,client:null,user:null};

  function loginUrl(){return cfg.loginPath||'/login.html'}
  function currentReturn(){return location.pathname+location.search+location.hash}
  function redirectLogin(){
    if(location.pathname.endsWith('/login.html')) return;
    location.replace(loginUrl()+'?return='+encodeURIComponent(currentReturn()));
  }
  function showSetupWarning(){
    const show=()=>{
      if(document.getElementById('minhautiAuthSetupWarning')) return;
      const el=document.createElement('div');
      el.id='minhautiAuthSetupWarning';
      el.className='auth-setup-warning';
      el.innerHTML='<b>Modo de teste:</b> o login ainda não está configurado. Preencha <code>auth-config.js</code> para ativar a proteção de acesso.';
      document.body.appendChild(el);
    };
    if(document.body) show(); else document.addEventListener('DOMContentLoaded',show,{once:true});
  }

  /* Sem credenciais: não bloqueia a interface. Isso permite testar a versão localmente
     e evita a tela branca antes da configuração do Supabase. */
  if(!configured){
    document.documentElement.dataset.authState='unconfigured';
    window.MinhaUTIAuth.ready=Promise.resolve(null);
    showSetupWarning();
    return;
  }

  document.documentElement.dataset.authState='checking';

  if(!window.supabase?.createClient){
    console.error('Supabase SDK não carregado.');
    document.documentElement.dataset.authState='sdk-error';
    window.MinhaUTIAuth.ready=Promise.resolve(null);
    return;
  }

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  window.MinhaUTIAuth.client=client;

  window.MinhaUTIAuth.ready=(async()=>{
    try{
      const {data,error}=await client.auth.getSession();
      if(error){console.error(error);redirectLogin();return null;}
      const session=data?.session||null;
      window.MinhaUTIAuth.user=session?.user||null;
      if(!session){redirectLogin();return null;}
      document.documentElement.dataset.authState='authenticated';
      document.dispatchEvent(new CustomEvent('minhauti:auth-ready',{detail:{user:session.user}}));
      return session;
    }catch(err){
      console.error('Falha ao verificar autenticação:',err);
      redirectLogin();
      return null;
    }
  })();

  client.auth.onAuthStateChange((event,session)=>{
    window.MinhaUTIAuth.user=session?.user||null;
    if(session) document.documentElement.dataset.authState='authenticated';
    if(event==='SIGNED_OUT') redirectLogin();
  });

  window.MinhaUTIAuth.signOut=async()=>{
    await client.auth.signOut();
    location.replace(loginUrl());
  };
})();
