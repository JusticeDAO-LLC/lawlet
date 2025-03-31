(() => {
  // loader.js
  var appModule = "main";
  window.document.documentElement.style.opacity = "0";
  document.addEventListener("DOMContentLoaded", function() {
    document.body.innerHTML = "";
    window.document.documentElement.style.opacity = "";
    var tag = document.createElement("script");
    tag.type = "module";
    tag.src = `/app/${appModule}.js`;
    document.body.appendChild(tag);
  });
})();
