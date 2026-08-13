(function(){
  const cfg=window.MINHAUTI_AUTH||{};
  const configured=cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('COLE_AQUI') && !cfg.supabaseAnonKey.includes('COLE_AQUI');
  window.MinhaUTIAuth={configured,client:null,user:null};
  function loginUrl(){return cfg.loginPath||'/login.html'}
  function currentReturn(){return location.pathname+location.search+location.hash}
  function redirectLogin(){
    if(location.pathname.endsWith('/login.html')) return;
    location.replace(loginUrl()+'?return='+encodeURIComponent(currentReturn()));
  }
  if(!configured){
    document.documentElement.dataset.authState='unconfigured';
    window.MinhaUTIAuth.ready=Promise.resolve(null);
    return;
  }
  if(!window.supabase?.createClient){
    console.error('Supabase SDK não carregado.');
    window.MinhaUTIAuth.ready=Promise.resolve(null);
    return;
  }
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.MinhaUTIAuth.client=client;
  window.MinhaUTIAuth.ready=(async()=>{
    const {data,error}=await client.auth.getSession();
    if(error){console.error(error);redirectLogin();return null;}
    const session=data?.session||null;
    window.MinhaUTIAuth.user=session?.user||null;
    if(!session){redirectLogin();return null;}
    document.documentElement.dataset.authState='authenticated';
    document.dispatchEvent(new CustomEvent('minhauti:auth-ready',{detail:{user:session.user}}));
    return session;
  })();
  client.auth.onAuthStateChange((event,session)=>{
    window.MinhaUTIAuth.user=session?.user||null;
    if(event==='SIGNED_OUT') redirectLogin();
  });
  window.MinhaUTIAuth.signOut=async()=>{await client.auth.signOut();location.replace(loginUrl())};
})();
