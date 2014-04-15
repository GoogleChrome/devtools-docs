{{+bindTo:partials.standard_devtools_article}}

# Console API Reference

The Console API provides web applications with methods for writing information to the console, creating JavaScript profiles, and initiating a debugging session.



## console.assert(expression, object) ##

If the specified expression is `false`, the message is written to the console along with a stack trace. In the following example, the assert message is written to the console only when the `document` contains fewer than five child nodes:

    var list = document.querySelector('#myList');
    console.assert(list.childNodes.length < 10, "List item count is > 10");

![Example of console.assert()](console-files/assert-failed-list.png)


## console.clear() ##

Clears the console.

    console.clear();

Also see [Clearing the console](console.md#clearing-console-history).


## console.count(label) ##

Writes the the number of times that `count()` has been invoked at the same line and with the same label.

In the following example `count()` is invoked each time the `login()` function is invoked.

    function login(user) {
        console.count("Login called");
        // login() code...
    }

![Example of using console.count()](console-files/count.png)

In this example, `count()` is invoked with different labels, each of which is incremented separately.

    function login(user) {
        console.count("Login called for user '" +  user + "'");
        // login() code...
    }

![Example of using console.count() with different string](console-files/count-unique.png)


## console.debug(object [, object, ...]) ##

This method is identical to [`console.log()`](#consolelogobject-object).


## console.dir(object) ##

Prints a JavaScript representation of the specified object. If the object being logged is an HTML element, then the properties of its DOM representation are displayed, as shown below:

    console.dir(document.body);

![Example of using console.dir() with an HTML element()](console-files/consoledir-body.png)

You can also use the object formatter (`%O`) in a `console.log()` statement to print out an element's JavaScript properties:

    console.log("document body: %O", document.body);

![Using the object formatter on a DOM element](console-files/consolelog-object-formatter.png)

Calling `console.dir()` on a JavaScript object is equivalent to calling `console.log()` on the same object&mdash;they both print out the object's JavaScript properites in a tree format.

Compare this with the behavior of `console.log()`, which displays the element in an XML format as it would appear in the Elements panel:

    console.log(document.body);

![Using console.log() on an element](console-files/consolelog-body.png)


## console.dirxml(object) ##

Prints an XML representation of the specified object, as it would appear in the Elements panel. For HTML elements, calling this method is equivalent to calling `console.log()`.

    var list = document.querySelector("#myList");
    console.dirxml();

%O is a shortcut for dir
%o acts either as dir or dirxml depending on the object type (non-dom or dom)


## console.error(object [, object, ...])

Similar to [`console.log()`](#consolelog), `console.error()` and also includes a stack trace from where the method was called.

    function connectToServer() {
        var errorCode = 1;
        if (errorCode) {
            console.error("Error: %s (%i)", "Server is  not responding", 500);
        }
    }
    connectToServer();

![Example of console.error()](console-files/error-server-not-resp.png)


## console.group(object[, object, ...]) ##

Starts a new logging group with an optional title. All console output that occurs after calling this method and calling `console.groupEnd()` appears in the same visual group.

    console.group("Authenticating user '%s'", user);
    console.log("User authenticated");
    console.groupEnd();

![Console group example](console-files/log-group-simple.png)

You can also nest groups:

    // New group for authentication:
    console.group("Authenticating user '%s'", user);
    // later...
    console.log("User authenticated", user);
    // A nested group for authorization:
    console.group("Authorizing user '%s'", user);
    console.log("User authorized");
    console.groupEnd();
    console.groupEnd();

![Nested logging group examples](console-files/nestedgroup-api.png)


## console.groupCollapsed(object[, object, ...]) ##

Creates a new logging group that is initially collapsed instead of open, as with `console.group()`.

    console.groupCollapsed("Authenticating user '%s'", user);
    console.log("User authenticated");
    console.groupEnd();
    console.log("A group-less log trace.");

![Creating a collapsed group](console-files/groupcollapsed.png)


## console.groupEnd() ##

Closes the most recently created logging group that previously created with `console.group()` or `console.groupCollapsed()`. See [console.group()](#consolegroupobject-object) and [console.groupCollapsed()](#consolegroupcollapsedobject-object) for examples.


## console.info(object [, object, ...]) ##

This method is identical to [`console.log()`](#consolelogobject-object).


## console.log(object [, object, ...]) ##

Displays a message in the console. You pass one or more objects to this method, each of which are evaluated and concatenated into a space-delimited string. The first parameter you pass to `log()` may contain _format specifiers_, a string token composed of the percent sign (`%`) followed by a letter that indicates the formatting to be applied.

Dev Tools supports the following format specifiers:

Format Specifier|Description
----------------|------------
`%s`            |Formats the value as a string.
`%d` or `%i`   |Formats the value as an integer.
`%f`            |Formats the value as a floating point value.
`%o`            |Formats the value as an expandable DOM element (as in the Elements panel).
`%O`            |Formats the value as an expandable JavaScript object.
`%c`            |Formats the output string according to CSS styles you provide.

Basic example:

    console.log("App started");

An example that uses string (`%s`) and integer (`%d`) format specifiers to insert the values contained by the variables `userName` and `userPoints`:

    console.log("User %s has %d points", userName, userPoints);

![Console output styled with %c](console-files/log-format-specifier.png)

An example of using the element formatter (`%o`) and object formatter (`%O`) on the same DOM element:

    console.log("%o, %O", document.body, document.body);

![Console output styled with %c](console-files/log-object-element.png)

The following example uses the **`%c`** format specifier to colorize the output string:

    console.log("%cUser %s has %d points", "color:orange; background:blue; font-size: 16pt", userName, userPoints);

![Console output styled with %c](console-files/log-format-styling.png)


## console.profile([label]) ##

When the Chrome DevTools is open, calling this function starts a JavaScript CPU profile with an optional label.To complete the profile, call `console.profileEnd()`. Each profile is added to the Profiles tab.

In the following example a CPU profile is started at the entry to a function that is suspected to consume excessive CPU resources, and ended when the function exits.

    function processPixels() {
      console.profile("Processing pixels");
      // later, after processing pixels
      console.profileEnd();
    }


## console.profileEnd() ##

Stops the current JavaScript CPU profiling session, if one is in progress, and prints the report to the Profiles panel.

    console.profileEnd()

See [console.profile()](#consoleprofilelabel) for example use.


## console.time(label) ##

Starts a new timer with an associated label. When `console.timeEnd()` is called with the same label, the timer is stopped the elapsed time displayed in the Console. Timer values are accurate to the sub-millisecond.

    console.time("Array initialize");
    var array= new Array(1000000);
    for (var i = array.length - 1; i >= 0; i--) {
        array[i] = new Object();
    };
    console.timeEnd("Array initialize");

![Example of using console.time() and timeEnd()](console-files/time-duration.png)

Note: The string you pass to the `time()` and `timeEnd()` methods must match for the timer to finish as expected.


## console.timeEnd(label) ##

Stops the timer with the specified label and prints the elapsed time.

For example usage, see [console.time()](#consoletimelabel).


## console.timeStamp([label]) ##

This method adds an event to the Timeline during a recording session. This lets you visually correlate your code generated time stamp to other events, such as screen layout and paints, that are automatically added to the Timeline.

See [Marking the Timeline](console.md#marking-the-timeline) for an example of using `console.timeStamp()`.


## console.trace() ##

Prints a stack trace from the point where the method was called, including links to the specific lines in the JavaScript source. A counter indicates the number of times that `trace()` method was invoked at that point, as shown in the screen shot below.

![Example of a stack trace with counter](console-files/console-trace.png)


## console.warn(object [, object, ...]) ##

This method is like [`console.log()`](#consolelogobject-object) but also displays a yellow warning icon along with the logged message.

    console.warn("User limit reached! (%d)", userPoints);

![Example of console.warn()](console-files/log-warn.png)


## debugger ##

The global `debugger` function causes Chrome to stop program execution and start a debugging session at the line where it was called. It is equivalent to setting a "manual" breakpoint in the Sources tab of Chrome DevTools.

Note: The `debugger` command is not a method of the `console` object.

In the following example the JavaScript debugger is opened when an object's `brightness()` function is invoked:

    brightness : function() {
        debugger;
        var r = Math.floor(this.red*255);
        var g = Math.floor(this.green*255);
        var b = Math.floor(this.blue*255);
        return (r * 77 + g * 150 + b * 29) >> 8;
    }

![Example of using debugger command](console-files/debugger.png)

{{/partials.standard_devtools_article}}
