const SUPABASE_URL="TU_SUPABASE_URL";
const SUPABASE_ANON_KEY="TU_SUPABASE_ANON_KEY";

const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const form=document.getElementById("loginForm");
const btn=document.getElementById("loginButton");
const msg=document.getElementById("loginMessage");
const pass=document.getElementById("passwordInput");
const toggle=document.getElementById("togglePassword");

toggle.addEventListener("click",()=>{
  const visible=pass.type==="text";
  pass.type=visible?"password":"text";
  toggle.textContent=visible?"Ver":"Ocultar";
});

form.addEventListener("submit",async e=>{
  e.preventDefault();

  const user=form.user.value.trim();
  const password=form.password.value.trim();

  msg.textContent="";
  msg.classList.remove("ok");
  form.classList.remove("shake");

  if(!user||!password){
    showError("Completa usuario y contraseña.");
    return;
  }

  setLoading(true);

  try{
    const {data,error}=await supabaseClient
      .from("cosmic_usuarios")
      .select("id,nombre,usuario,rol,activo")
      .eq("usuario",user)
      .eq("password",password)
      .eq("activo",true)
      .maybeSingle();

    if(error||!data) throw new Error("Credenciales incorrectas");

    localStorage.setItem("auth","true");
    localStorage.setItem("cosmic_user",JSON.stringify({
      id:data.id,
      nombre:data.nombre||data.usuario,
      usuario:data.usuario,
      rol:data.rol||"admin"
    }));

    msg.textContent="Acceso concedido. Entrando al panel...";
    msg.classList.add("ok");

    setTimeout(()=>{
      window.location.href="admin.html";
    },450);

  }catch(error){
    showError("Usuario o contraseña incorrectos.");
    setLoading(false);
  }
});

function setLoading(state){
  btn.disabled=state;
  btn.querySelector("span").textContent=state?"Validando acceso...":"Entrar al panel";
}

function showError(text){
  msg.textContent=text;
  msg.classList.remove("ok");
  form.classList.remove("shake");
  void form.offsetWidth;
  form.classList.add("shake");
}