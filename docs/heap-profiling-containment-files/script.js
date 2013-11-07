function createClosure(a, b, c)
{
  var d = a + b;
  return function() { return c + d; };
}

var closure = createClosure("a", "b", "c");
closure.a = "property a";
closure.d = "property d";

var consString = "aaa / " + document.URL + document.inputEncoding;

var top_in_page = "inside page";

function init()
{
  var iframe = document.createElement("iframe");
  iframe.setAttribute("src", "heap-profiling-containment-files/iframe.html");
  document.getElementById("iframe-host").appendChild(iframe);
}
