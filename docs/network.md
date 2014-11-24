{{+bindTo:partials.standard_devtools_article}}

# Evaluating network performance

The Network panel records information about each network operation in your application, including detailed timing data, HTTP request and response headers, cookies, WebSocket data, and more. The Network panel helps you answer questions about the network performance of your web application, such as:

* Which resource had the slowest time to first byte?
* Which resources took the longest time to load (duration)?
* Who initiated a particular network request?
* How much time was spent in the various network phases for a particular resource?



## About the Resource Timing API

The Network panel uses the [Resource Timing API](http://www.w3.org/TR/resource-timing), a JavaScript API that provides detailed network timing data for each loaded resource. For example, the API can tell you precisely when the HTTP request for an image started, and when the image's final byte was received. The following illustration shows the network timing data points that the Resource Timing API provides.

<img src="network-files/resource-timing-overview.png" alt="Resource timing overview"/>

The API is available to any web page, not just DevTools. In Chrome, it's exposed as methods on the global `window.performance` object. The `performance.getEntries()` method returns an array of "resource timing objects", one for each requested resource on the page.

Try this: open the JavaScript console on the current page, enter the following at the prompt, and hit Return:

    window.performance.getEntries()[0]

This evaluates the first element in the array of resource timing objects and displays its properties in the console, as shown below.

<img src="network-files/getentries.png" alt="Performance resource timing"/>

Each timestamp is in microseconds, following the [High Resolution
Time](http://www.w3.org/TR/hr-time/#sec-high-resolution-time) specification. This API is [available in
Chrome](http://updates.html5rocks.com/2012/08/When-milliseconds-are-not-enough-performance-now) as the `window.performance.now()` method.



## Network panel overview

The Network panel automatically records all network activity while DevTools is open. The first time you open the panel it may be empty. Reload the page to start recording, or simply wait for network activity to occur in your application.

<img src="network-files/network-overview.png" alt="Network overview"/>

Each requested resource is added as a row to the Network table, which contains the columns listed below. Note the following about the Network table:

* Not all columns listed below are visible by default; you can easily [show or hide columns](#adding-and-removing-table-columns).
* Some columns contain a primary field and a secondary field (**Time** and **Latency**, for example). When viewing the Network table with [large resource rows](#changing-resource-row-sizes) both fields are shown; when using small resource rows only the primary field is shown.
* You can [sort](#sorting-and-filtering) the table by a column's value by clicking the column header. The [the Timeline column](#timeline-view) behaves a bit differently: clicking its column header displays a menu of additional sort fields. See [Waterfall view](#timeline-view) and [Sorting and filtering](#sorting-and-filtering) for more information.

<table>
<thead>
<tr>
<th width="20%">Field</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Name</strong> and <strong>Path</strong></td>
<td>The name and URL path of the resource, respectively.</td>
</tr>
<tr>
<td><strong>Method</strong></td>
<td>The HTTP method used for the request (GET or POST, for example).</td>
</tr>
<tr>
<td><strong>Status</strong> and <strong>Text</strong></td>
<td>The HTTP status code and text message, respectively.</td>
</tr>
<tr>
<td><strong>Domain</strong></td>
<td>The domain of the resource request.</td>
</tr>
<tr>
<td><strong>Type</strong></td>
<td>The MIME type of the requested resource.</td>
</tr>
<tr>
<td><strong>Initiator</strong></td>
<td>The object or process that initiated the request. It can have one of the following values:
  <dl>
    <dt>Parser</dt>
    <dd>Chrome's HTML parser initiated the request.</dd>
    <dt>Redirect</dt>
    <dd>A HTTP redirect initiated the request.</dd>
    <dt>Script</dt>
    <dd>A script initiated the request.</dd>
    <dt>Other</dt>
    <dd>Some other process or action initiated the request, such as the user navigating to a page via a link, or by entering a URL in the address bar.</dd>
  </dl>
</td>
</tr>
<tr>
<td><strong>Cookies</strong></td>
<td>The number of cookies transferred in the request. These correspond to the cookies shown in the <a href="#cookies">Cookies tab</a> when viewing details for a given resource.</td>
</tr>
<tr>
<td><strong>Set-Cookies</strong></td>
<td>The number of cookies set in the HTTP request.</td>
</tr>
<tr>
<td><strong>Size</strong> and <strong>Content</strong></td>
<td>Size is the combined size of the response headers (usually a few hundred bytes) plus the response body, as delivered by the server.
Content is the size of the resource's decoded content.
If the resource was loaded from the browser's cache rather than over the network, this field will contain the text (from cache).</td>
</tr>
<tr>
<td><strong>Time</strong> and <strong>Latency</strong></td>
<td>Time is total duration, from the start of the request to the receipt of the final byte in the response.
Latency is the time to load the first byte in the response.</td>
</tr>
<tr>
<td><strong>Timeline</strong></td>
<td>The Timeline column displays a <a href="#timeline-view">visual waterfall</a> of all network requests. Clicking the header of this column reveals a menu of additional sorting fields. See <a href="#timeline-view">Waterfall view</a> and <a href="#sorting-and-filtering">Sorting and filtering</a> for more information</td>
</tr>
</tbody>
</table>

### Preserving the network log upon navigation

By default, the current network record log is discarded when you navigate to another page, or reload the current page. To preserve the recording log in these scenarios, click the black **Preserve log upon navigation** button <img src="../images/recording-off.png" alt="Don't preserve log on navigation"/> at the bottom of the Network panel; new records are appended to the bottom of the table. Click the same button again (now red <img src="../images/recording-on.png" alt="Preserve resources on navigation"/>) to disable log preservation.

### Sorting and filtering ###

By default, resources in the Network table are sorted by the start time of each request (the network "waterfall"). You can sort the table by another column value by clicking the column header. Click the header again to change the sort order (ascending or descending).

<img src="network-files/sorting.png" alt="Sort by"/>

The Timeline column is unique from the others in that, when clicked, it displays a menu of additional sort fields.

<img src="network-files/timeline-column.png" alt="Timeline column"/>

The menu contains the following sorting options:

* **Timeline** — Sorts by the start time of each network request. This is the default sort, and is the same as sorting by the Start Time option).
* **Start Time** — Sorts by the start time of each network request (same as sorting by the Timeline option).
* **Response Time** — Sorts by each request's response time.
* **End Time** — Sorts by the time when each request completed.
* **Duration** — Sorts by the total time of each request.
* **Latency** — Sorts by the time between the start of the request and the beginning of the response (also known as the "time to first byte").

To filter the Network table to only show certain types of resources, click one of the content types along the bottom of the panel: **Documents**, **Stylesheets**, **Images**, **Scripts**, **XHR**, **Fonts**, **WebSockets**, and **Other**. In the following screenshot only CSS resources are shown. To view all content types, click the **All** filter button.

<img src="network-files/filter-type.png" alt="Filter type"/>


<h4 id="advanced-filtering">Advanced filtering</h4>

In addition to resource type filtering, you can narrow down resources by filter queries. For example, to find **all resources** which have a status code of `200`, you can enter the query `StatusCode:200` in the filter input field.

<img src="network-files/network-advanced-filter.png" alt="Advanced filtering in the Network Panel"/>

Take note of the following behaviour:
* A filter query includes a **type** (`StatusCode`) and **value** (`200`).
* A filter query is case insensitive, so you can type uppercase or lowercase.
* The filter type gives you autocomplete suggestions. Use the arrows keys to form a selection and press <span class="kbd">Tab</span> to select it.
* The filter value has autocomplete which shows you values **present** in the current network recording.
* Quickly preview the results of your query, use the <span class="kbd">Up</span> / <span class="kbd">Down</span> arrow keys to cycle through the autocomplete suggestions. The results appear immediately even you do not press enter or tab to complete the selection.
* To negate a filter query, prepend the query with a dash (`-`), for example `-StatusCode:200`.

The following list contains the current available filter types.

<dl>
  <dt><strong>Domain</strong></dt>
  <dd>The <strong>domain</strong> portion from the URL of the resource. E.g. `www.google-analytics.com`.</dd>

  <dt><strong>HasResponseHeader</strong></dt>
  <dd>Checks the resource has a response header, regardless of the value. E.g. `Access-Control-Allow-Origin`.</dd>

  <dt><strong>Is</strong></dt>
  <dd>Shows requests running at the current point in time. Current available value: `running`</dd>

  <dt><strong>Method</strong></dt>
  <dd>The HTTP method used. E.g. `GET`.</dd>

  <dt><strong>MimeType</strong></dt>
  <dd>Also known as `Content-type` - the identifier for the type of resource. E.g. `text/html`.</dd>

  <dt><strong>Scheme</strong></dt>
  <dd>The scheme portion in a URL. E.g. `https`.</dd>

  <dt><strong>SetCookieName</strong></dt>
  <dd>The name of the cookie as set by the server. E.g. `loggedIn` (assuming a cookie like `loggedIn=true`).</dd>

  <dt><strong>SetCookieValue</strong></dt>
  <dd>The value of the cookie set by the server. E.g. `true` (assuming a cookie like `loggedIn=true`).</dd>

  <dt><strong>StatusCode</strong></dt>
  <dd>The status code in the HTTP response. E.g. `200`.</dd>
</dl>

To use a query shown in the above list, construct it in the format of: `<Filter Type>:<Description>`. You will almost always want to use the autocomplete suggestions which ensures your query is valid.

### Adding and removing table columns

You can change the default set of columns displayed by the Network table. To show or hide a column, Right+click or Control+click (Mac only) in the table header and select or deselect column names from the list.

<img src="network-files/add-remove-columns.png" alt="Add or remove columns"/>

### Changing resource row sizes

You can view the Network table with large resource rows (the default), or small resource rows. Click the blue **Use small resource rows** toggle button <img src="../images/small-resource-rows.png" alt="Small resource rows"/> at the bottom of the panel to view small rows. Click the same button (now gray <img src="../images/large-resource-rows.png" alt="Large resource rows"/>) to view large resource rows again. Large rows enable some columns to display two text fields: a primary field and a secondary field (Time and Latency, for instance). When viewing small rows only the primary field is displayed.

In the following screenshot, the Network table is viewed with small resource rows and just the Timeline column.

<img src="network-files/small-rows.png" alt="Resized resource rows">

### Waterfall view

The waterfall view in the Network panel graphs the time it took to load each resource, from the start of the HTTP request to the receipt of the final byte of the response. Each resource loading time is represented as a bar, color-coded according to the resource type. The length of the lighter-shaded part of each bar represents the request's latency, while the length of the darker-shaded part represents the time spent receiving the response data.

<img src="network-files/network-timeline.png" alt="Network timeline view">

When you hover your mouse over a row (but not over an actual bar) the request's latency and receipt time are displayed above the corresponding bar's light- and dark-shaded areas, respectively, as shown below.

<img src="network-files/timeline-view-1.png" alt="Timeline view"/>

If you hover your mouse over the bar itself, the complete timing data for the resource is presented in a tooltip. This is the same information that's presented in the [Timing details tab](#resource-network-timing) for a given resource.

<img src="network-files/timeline-view-hover.png" alt="Timeline view on hover"/>

The waterfall indicates when the the [`DOMContentLoaded`](http://docs.webplatform.org/wiki/dom/events/DOMContentLoaded)
and [`load`](http://docs.webplatform.org/wiki/dom/events/load) events were fired with blue and red vertical lines, respectively. The `DOMContentLoaded` event is fired when the main document had been loaded and parsed. The `load` event is fired when all of the page's resources have been downloaded.

<img src="network-files/dom-lines.png" alt="DOM event lines"/>

Waterfall bars are color-coded as follows:

<style>

#colortable {
  width: 50%;
  border: none;
}

#colortable td {
  border: none;
}

.doc { background: rgba(47, 102, 236, 0.6); width: 10%;}
.css { background: rgba(157, 231, 119, 0.6);width: 10%;}
.images { background: rgba(164, 60, 255, 0.6);width: 10%;}
.scripts { background: rgba(255, 121, 0, 0.6);width: 10%;}
.xhr { background: rgba(231, 231, 10, 0.6);width: 10%;}
.fonts { background: rgba(255, 82, 62,0.6);width: 10%;}
.other { background: rgba(187, 187, 188, 0.6);width: 10%;}
</style>

<!-- TODO: Fix formatting of cells -->
<table id="colortable">
<tr>
<td class="doc"></td>
<td>Documents</td>
</tr>
<tr>
<td class="css"></td>
<td>Stylesheets</td>
</tr>
<tr>
<td class="images"></td>
<td>Images</td>
</tr>
<tr>
<td class="scripts"></td>
<td>Scripts</td>
</tr>
<tr>
<td class="xhr"></td>
<td>XHR</td>
</tr>
<tr>
<td class="fonts"></td>
<td>Fonts</td>
</tr>
<tr>
<td class="other"></td>
<td>Other</td>
</tr>
</table>

### Saving and copying network information ##

<span class="kbd">Right-clicking</span> or <span class="kbd">Ctrl</span> + <span class="kbd">Click</span> (Mac only) within the Network table a context menu appears with several actions. Some of these actions apply to the resource row under the mouse click (like [copying HTTP request headers](#copying_requests_as_curl_commands)), while others apply to the entire network recording (such as [saving a Network recording as a HAR file](#saving_network_data)).

<img src="network-files/right-click.png" alt="Right-click on Network"/>

The following menu actions apply to the selected resource:

* **Open Link in New Tab** — Opens the resource in a new tab. You can also double-click the resource name in the Network table.
* **Copy Link Address** — Copies the resource URL to the system clipboard.
* **Copy Request Headers** — Copies the HTTP request headers to the system clipboard.
* **Copy Response Headers** — Copies the HTTP response headers to the system clipboard.
* **Copy as cURL** — Copies the network request as a
  [cURL](http://curl.haxx.se/) command string to the system clipboard. See [Copying requests as cURL commands](#copying-requests-as-curl-commands).
* **Replay XHR** — If the associated request is an XMLHTTPRequest, re-sends the original XHR.

#### Copying requests as cURL commands

[cURL](http://curl.haxx.se/) is a command line tool for making HTTP transactions. The Network panel's **Copy as cURL** command recreates an HTTP request (including HTTP headers, SSL certificates, and query string parameters) and copies it as a cURL command string to the clipboard. You can then paste the string into a terminal window (on a system with cURL) to execute the same request.

Below is an example cURL command line string taken from a XHR request on the Google News home page.

    curl 'http://news.google.com/news/xhrd=us' -H 'Accept-Encoding: gzip,deflate,:sdch' -H 'Host: news.google.com' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1510.0 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://news.google.com/nwshp?hl=en&tab=wn' -H 'Cookie: NID=67=eruHSUtoIQA-HldQn7U7G5meGuvZOcY32ixQktdgU1qSz7StUDIjC_Knit2xEcWRa-e8CuvmADminmn6h2_IRpk9rWgWMdRj4np3-DM_ssgfeshItriiKsiEXJVfra4n; PREF=ID=a38f960566524d92:U=af866b8c07132db6:FF=0:TM=1369068317:LM=1369068321:S=vVkfXySFmOcAom1K' -H 'Connection: keep-alive' --compressed

#### Saving network data

You can save the data from a network recording as a HAR ([HTTP Archive](http://www.softwareishard.com/blog/har-12-spec/)) file, or copy the records as a HAR data structure to your clipboard. A HAR file contains a JSON data structure that describes the network "waterfall". Several [third-party](http://ericduran.github.io/chromeHAR/) [tools](https://code.google.com/p/harviewer/) can reconstruct the network waterfall from the data in the HAR file.

**To save a recording:**

1. Right+click or Control+click on the Network table.
2. In the context menu that appears, choose one of the following actions:
    * **Copy All as HAR** — Copies the network recording to the system clipboard in the HAR format.
    * **Save as HAR with Content** — Saves all network data to a HAR file along with each page resource. Binary resources, including images, are encoded as Base64-encoded text.

For more information, [Web Performance Power Tool: HTTP Archive (HAR)](http://www.igvita.com/2012/08/28/web-performance-power-tool-http-archive-har/).



## Network resource details #

When you click a resource name in the Network table a tabbed window appears that contains the following additional details:

* [HTTP request and response headers](#http-headers)
* [Resource preview](#resource-previews)
* [HTTP response](#http-response)
* [Cookie names and values](#cookies)
* [WebSocket messages](#websocket-frames)
* [Resource network timing](#resource-network-timing)

### HTTP headers

The Headers tab displays the resource's request URL, HTTP method, and response status code. Additionally, it lists the HTTP response and request headers and their values, and any query string parameters. You can view HTTP headers parsed and formatted, or in their source form by clicking the **View parsed**/**View source** toggle button, respectively, located next to each header's section. You can also view parameter values in their decoded or URL encoded forms by clicking the **View decoded**/**View URL encoded** toggle button next to each query string section.

<img src="network-files/network-headers.png" alt="Network headers"/>

You can also [copy request and response headers](#saving-network-data) to your clipboard.

### Resource previews

The Preview tab displays a preview of the resource, when available. Previews are currently displayed for image and JSON resources, as shown below.

<img src="network-files/resource-preview-json.png" alt="Resource JSON preview"/>

<img src="network-files/network-image-preview.png" alt="Resource image preview"/>

You can view the resource's unformatted response on the [Response
tab](#http-response).

### HTTP response

The Response tab contains the resource's unformatted content. Below is a screenshot of a JSON data structure that was returned as the response for a request.

<img src="network-files/response.png" alt="Resource response preview"/>

You can also [view formatted previews](#resource-previews) of some resource types, including JSON data structures and images.

### Cookies

The Cookies tab displays a table of all the cookies transmitted in the
resource's HTTP request and response headers. You can also clear all cookies.

<img src="network-files/cookies.png" alt="Resource cookies"/>

The Cookies table contain the following columns:

<!-- TODO: Fix formatting of cells -->
<table>
<tr>
<th width="20%">Property</th>
<th>Description</th>
</tr>
<tbody>
<tr>
<td><strong>Name</strong></td>
<td>The cookie's name.</td>
</tr>
<tr>
<td><strong>Value</strong></td>
<td>The cookie's value.</td>
</tr>
<tr>
<td><strong>Domain</strong></td>
<td>The cookie's domain.</td>
</tr>
<tr>
<td><strong>Path</strong></td>
<td>The cookie's URL path.</td>
</tr>
<tr>
<td><strong>Expires / Max-Age</strong></td>
<td>The value of the cookie's expires or max-age properties.</td>
</tr>
<tr>
<td><strong>Size</strong></td>
<td>The size of the cookie in bytes.</td>
</tr>
<tr>
<td><strong>HTTP</strong></td>
<td>This indicates that the cookie should only be set by the browser in the HTTP request, and cannot be accessed with JavaScript. </td>
</tr>
<tr>
<td><strong>Secure</strong></td>
<td>The presence of this attribute indicates that the cookie should only be transmitted over a secure connection.</td>
</tr>
</tbody>
</table>

### WebSocket frames

The Frames tab shows messages sent or received over a WebSocket connection. This tab is only visible when the selected resource initiated a WebSocket connection. The table contains the following columns:

<table>
<tr>
<th width="20%">Name</th>
<th>Description</th>
</tr>
<tr>
<td>Data</td>
<td>The message payload. If the message is plain text, it's displayed here. For binary opcodes, this field displays the opcode's name and code. The following opcodes are supported:
  <dl>
    <dt>Continuation Frame</dt>
    <dt>Binary Frame</dt>
    <dt>Connection Close Frame</dt>
    <dt>Ping Frame</dt>
    <dt>Pong Frame</dt>
  </dl>
</tr>
<tr>
<td>Length</td>
<td>The length of the message payload in bytes.</td>
</tr>
<tr>
<td>Time</td>
<td>The time stamp when the message was created.</td>
</tr>
</table>

Messages are color-coded according to their type. Outgoing text messages are color-coded light-green; incoming text messages are white:

<p><img src="network-files/websocket-text2.png" alt="Websocket text"/> </p>

WebSocket opcodes are light-yellow:

<p><img src="network-files/frames-opcode.png" alt="Websocket opcodes"/> </p>

Errors are light-red.

**Notes about current implementation:**

* To refresh the Frames table after new messages arrive, click the resource name on the left.
* Only the last 100 WebSocket messages are preserved by the Frames table.

### Resource network timing

The Timing tab graphs the time spent on the various network phases involved loading the resource. This is the same data displayed when you hover over a resource bar in the [waterfall view](#timeline-view).

<img src="network-files/timing.png" alt="Resource network timing graph"/>

<style>
dt:before {
  content: "\00a0\00a0\00a0";
  margin-right: 5px;
}
dt.stalled:before, dt.proxy-negotiation:before {
  background-color: #cdcdcd;
}
dt.dns-lookup:before {
  background-color: #1f7c83;
}
dt.initial-connection:before, dt.ssl:before {
  background-color: #e58226;
}
dt.request-sent:before, dt.ttfb:before {
  background-color: #5fdd5f;
}
dt.content-download:before {
  background-color: #4189d7;
}
</style>

<dl>
  <dt class="stalled"><strong>Stalled/Blocking</strong></dt>
  <dd>
    Time the request spent waiting before it could be sent.
    This time is inclusive of any time spent in proxy negotiation.
    Additionally, this time will include when the browser is waiting for an already established connection to become available for re-use, obeying Chrome's <a href="https://code.google.com/p/chromium/issues/detail?id=12066">maximum six</a> <abbr title="Transmission Control Protocol">TCP</abbr> connection per origin rule.
  </dd>

  <dt class="proxy-negotiation"><strong>Proxy Negotiation</strong></dt>
  <dd>Time spent negotiating with a proxy server connection.</dd>

  <dt class="dns-lookup"><strong><abbr title="Domain Name System">DNS</abbr> Lookup</strong></dt>
  <dd>
    Time spent performing the <abbr title="Domain Name System">DNS</abbr> lookup.
    Every new domain on a page requires a full roundtrip to do the <abbr title="Domain Name System">DNS</abbr> lookup.
  </dd>

  <dt class="initial-connection"><strong>Initial Connection / Connecting</strong></dt>
  <dd>Time it took to establish a connection, including <abbr title="Transmission Control Protocol">TCP</abbr> handshakes/retries and negotiating a <abbr title="Secure Sockets Layer">SSL</abbr>.</dd>

  <dt class="ssl"><strong><abbr title="Secure Sockets Layer">SSL</abbr></strong></dt>
  <dd>Time spent completing a <abbr title="Secure Sockets Layer">SSL</abbr> handshake.</dd>

  <dt class="request-sent"><strong>Request Sent / Sending</strong></dt>
  <dd>
    Time spent issuing the network request.
    Typically a fraction of a millisecond.
  </dd>

  <dt class="ttfb"><strong>Waiting (<abbr title="Time To First Byte">TTFB</abbr>)</strong></dt>
  <dd>
    Time spent waiting for the initial response, also known as the Time To First Byte.
    This time captures the latency of a round trip to the server in addition to the time spent waiting for the server to deliver the response.
  </dd>

  <dt class="content-download"><strong>Content Download / Downloading</strong></dt>
  <dd>Time spent receiving the response data.</dd>
</dl>


## Additional resources

To learn more optimizing the network performance of your application, see the following resources:

* Use [PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights) to identify performance best practices that can be applied to your site, and [PageSpeed optimization tools](https://developers.google.com/speed/pagespeed/optimization) to automate the process of applying those best practices.
* [High Performance Networking in Google
  Chrome](http://www.igvita.com/posa/high-performance-networking-in-google-chrome/) discusses Chrome network internals and how you can take advantage of them to make your site faster.
* [How gzip compression works](https://developers.google.com/speed/articles/gzip) provides a high level overview gzip compression and why it's a good idea.
* [Web Performance Best Practices](https://developers.google.com/speed/docs/best-practices/rules_intro) provides additional tips for optimizing the network performance of your web page or application.

{{/partials.standard_devtools_article}}
