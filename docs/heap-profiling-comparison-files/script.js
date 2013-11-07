function Item(x)
{
  this.x = x;
}

Item.prototype = {
  clone: function()
  {
    return new Item(this.x);
  }
};

function action()
{
  for (var i = 0; i < data.length - 1; ++i) {
    line = new Array(data[i].length);
    for (var j = 0, l = data[i].length; j < l; ++j)
      line[j] = data[i][j].clone();
    for (var j = 0, l = data[i].length; j < l; ++j) {
      data[i][j] = data[i + 1][j].clone();
      data[i + 1][j] = line[j].clone();
    }
  }
}

var data = new Array(10);
for (var i = 0; i < data.length; ++i) {
  data[i] = new Array(1000);
  for (var j = 0, l = data[i].length; j < l; ++j)
    data[i][j] = new Item(i * l + j);
}
