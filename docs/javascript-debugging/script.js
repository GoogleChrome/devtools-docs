window.addEventListener("load", onLoad, true);

function onLoad() {
  document.addEventListener("mouseout", mouseOut, true);
}

function mouseOut(event) {
  console.log("Mouse Out!");
}

