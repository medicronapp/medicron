try{var t=localStorage.getItem("medicron.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}
try{if(matchMedia("(display-mode: standalone)").matches||navigator.standalone)location.replace("/?source=pwa")}catch(e){}
