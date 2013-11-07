function CollectionItem(s)
{
  this.s = s;
}

function Collection()
{
  this.items = [];
}

Collection.prototype = {
  add: function(item)
  {
    this.items.push(item);
  },

  item: function(index)
  {
    return this.items[index];
  }
}

function createCollection(count)
{
  var collection = new Collection();
  for (var i = 0; i < count; ++i)
    collection.add(new CollectionItem(i.toString()));
  return collection;
}

var holder1 = [createCollection(10000), createCollection(15000)];
var holder2 = [holder1[0]];
