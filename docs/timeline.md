{{+bindTo:partials.standard_devtools_article canonical:strings.canonicalDevToolsTimeline}}
<p class="caution">
  <strong style="font-weight: normal; font-size: 110%; display:block;">The DevTools docs have moved!</strong>
  <a href="https://developers.google.com/web/tools/profile-performance/evaluate-performance/timeline-tool">Read the latest version</a> of this article and <a href="https://developers.google.com/web/tools/chrome-devtools">head over to the new home of Chrome DevTools</a> for the latest tutorials, docs and updates.
</p>

# Performance profiling with the Timeline #

The Timeline panel lets you record and analyze all the activity in your application as it runs. It's the best place to start investigating perceived performance issues in your application.


## Timeline panel overview ##

The Timeline has three primary sections: an overview section at the top, a records view, and a toolbar.

![](timeline-images/timeline_ui_annotated.png)

*  To start or stop a recording, press the Record toggle button (see
    [Making a recording](#making-a-recording)).
*  Press the Clear recording button to clear records from the Timeline.
*  The Glue async events mode lets you more easily correlate asynchronous events to their causes (see [About nested events](#about-nested-events)).
*  You can filter the records shown in the Timeline according to their type or duration (see [Filtering and searching records](#filtering-and-searching-records)).

During a recording, a record for each event that occurs is added to the Records view in a "waterfall" presentation. Records are categorized into one of four basic groups: Loading, Scripting, Rendering, and Painting. These records are color-coded as follows:

![](timeline-images/image01.png)

For example, the recording below is of an HTML page being loaded into Chrome. The first record (Send Request) is Chrome's HTTP request for the page, followed by a Receive Response record (for the corresponding HTTP response), some Receive Data records (for the actual page data), and then a Finish Loading record. For a complete list of events recorded by Timeline and their descriptions, see the [Timeline event reference](#timeline-event-reference).

 ![](timeline-images/image06.png)

When you hover over a Timeline record, a pop-up appears with details
about the associated event. For example, the screenshot below shows
details for a Finish Loading record associated with an image resource. The [Timeline event reference](#timeline-event-reference) explains the details available for each record type.

![](timeline-images/image12.png)

In addition to the detailed Records view, you can inspect recordings in one of three modes:

*  **Events mode** shows all recorded events by event category.
*  **Frames mode** shows your page's rendering performance.
*  **Memory mode** shows your page's memory usage over time.

### Events mode ###

The Events mode provides an overview of all events that were captured during the recording, organized by their type. At a glance, you can see where your application is spending the most time, and on what types of tasks. The length of each horizontal bar in this view corresponds to time that event took to complete.

![](timeline-images/events_mode.png)

When you select a range of time from the Events view (see [Zooming in on a Timeline section](#zooming-in-on-a-timeline-section)), the Records view is restricted to only show those records.

![](timeline-images/timeline_records.png)

### Frames mode ###

Frames mode provides insight into the rendering performance of your application. A "frame" represents the work the browser must do to render a single frame of content to the display&mdash;run JavaScript, handle events, update the DOM and change styles, layout and paint the page. The goal is for your app to run at 60 frames per second (FPS), which corresponds to the 60Hz refresh rate of most (but not all) video displays. Consequently, your application has approximately 16.6 ms (1000 ms / 60) to prepare for each frame.

Horizontal lines across the Frames view represent frame rate targets for 60 FPS and 30 FPS. The height of a frame corresponds to the time it took to render that frame. The colors filling each frame indicate the percentage of time taken on each type of kind of task.

The time to render a frame is displayed atop of the Records view. If you hover over the displayed time, additional information appears about the frame, including the time spent on each type of task, CPU time, and the calculated FPS.

![](timeline-images/frames_mode.png)

See [Timeline demo: Diagnosing and fixing forced synchronous layout](demos/too-much-layout/) for a demonstration of using Frames mode.

#### About clear or light-gray frames ####

You may notice regions of a frame that are light-gray or clear (hollow). These regions indicate, respectively:

* Activity that was not instrumented by DevTools
* Idle time between display refresh cycles.

The frames in the recording below show both un-instrumented activity and idle time.

![](timeline-images/clear-frames.png)

<p class="note">Want more details on the empty white space within the bars? Read <a href="https://plus.google.com/+NatDuca/posts/BvMgvdnBvaQ?e=-RedirectToSandbox">Chrome Engineer Nat Duca's explanation</a>, which describes how you can evaluate if you were bottlnecked by the GPU. </p>


#### About the green bars ###

Painting is a two-step process that includes: draw calls and rasterization.

 - **Draw calls**. This is a list of things you'd like to draw, and its derived from the CSS applied to your elements. Ultimately there is a list of draw calls not dissimilar to the Canvas element's: moveTo, lineTo, and fillRect. Although, they have different names in <a href="https://code.google.com/p/skia/">Skia</a>, Chrome's painting backend, it's a similar concept.
 - **Rasterization**. The process of stepping through those draw calls and filling out actual pixels into buffers that can be uploaded to the GPU for compositing.

So, with that background what is the difference between the solid green bars and empty green bars?

![](timeline-images/hollow-green-bars.png)

 - The **solid green bars** are the draw calls recorded by Chrome. This happens on the main thread alongside JavaScript, style calculations, and layout. The compositor thread gets passed a data structure grouping of draw calls.

 - The **empty green bars** are the rasterization. A worker thread spawned by the compositor is what handles these.

Both are paint, they just represent different sub-tasks of the job. If you're having performance issues you can look at what properties you're changing. Then, see if there is a compositor-only way to achieve the same ends. <a href="http://csstriggers.com/">CSS Triggers</a> can help with identifying a solution to this.

#### Viewing frame rate statistics ###

The average frame rate and its standard deviation represented are displayed along the bottom of the Timeline panel for the selected frame range. If you hover over the average frame rate, a pop-up appears with additional information about the frame selection:

* **Selected range** -- The selected time range, and the number of frames in the selection.
* **Minimum Time** -- The lowest time of the selected frames, and the corresponding frame rate in parentheses.
* **Average Time** -- The average time of the selected frames,  and the corresponding frame rate in parentheses.
* **Maximum Time** -- The maximum time for the selected range, and the corresponding frame rate in parentheses.
* **Standard Deviation** -- The amount of variability of the calculated Average Time.
* **Time by category** -- The amount of time spent on each type of process, color-coded by type.

![](timeline-images/average.png)

### Memory mode

The Memory view shows you a graph of memory used by your application
over time and maintains a counter of the number of documents, DOM
nodes, and event listeners that are held in memory (that is, that
haven’t been garbage collected).

![](timeline-images/image20.png)

Memory mode can't show you exactly what is causing a memory leak, but it can help you identify what events in your application may be leading to a memory leak. You can then use the [Heap Profiler](heap-profiling.html) to identify the specific code that is causing the leak.

### Making a recording ###

To make a recording, you start a recording session, interact with your application, and then stop recording. It helps to know in advance the kind of activity you want to record — for example, page loading, scrolling performance of a list of images, and so forth, and then stick to that script.

**To make a recording**:

<style>
    .inline-icon {
        vertical-align: "middle";
    }
</style>

<ol>
    <li>Open the page you want to record.</li>
    <li>Open the Timeline panel and start recording by doing one of the following:</li>
    <ul>
        <li>Click the round record button at the bottom of the Timeline panel. <img width="32px" style="vertical-align:middle" src="../images/recording-off.png"></img></li>
        <li>Press the keyboard shortcut Ctrl+E, or Cmd+E on Mac.
        </li>
    </ul>
    <p>The Record button turns red during a recording. <img src="../images/recording-on.png" style="vertical-align:middle" width="32px"></img> </p>
    <li>Perform any necessary user actions to record the desired behavior.</li>
    <li>Stop the recording by pressing the now red record button, or
    repeating the keyboard shortcut.</li>
</ol>

### Recording a page load ###

A common task is to record a page loading from the initial network request. Keyboard shortcuts are useful in this scenario, as they let you quickly start a recording, re-load the page, and stop the recording.

**To record a page load**:

1.  Open any [web page](http://www.jankfree.com) in a new tab or window.
2.  Open the Timeline and press Cmd+E (Mac) or Ctrl+E (Windows/Linux) to start recording.
3.  Quickly press Cmd+R or Ctrl+R to reload the browser page.
4.  Stop the recording when the page has finished loading (look for the red [event marker](#domcontentloaded-and-load-event-markers)).

Your recording should look something like the following. The first
record (Send Request) is Chrome's HTTP request for the page, followed by a Receive Response record for the corresponding HTTP response, followed by one or more Receive Data records, a Finish Loading record, and a Parse HTML record.

![](timeline-images/image06.png)

See the [Timeline event reference](#timeline-event-reference) for details on each record type.

### Tips for making recordings ###

Here are some tips for making recordings:

* **Keep recordings as short as possible**. Shorter recordings generally make analysis easier.
* **Avoid unnecessary actions**. Try to avoid actions (mouse clicks, network loads, and so forth) that are extraneous to the activity you want to record and analyze. For instance, if you want to record events that occur after you click a “Login” button, don’t also scroll the page, load an image and so forth.
*  **Disable the browser cache**. When recording network operations, it’s a good idea to disable the browser’s cache in the DevTools Settings panel.
* **Disable extensions**. Chrome extensions can add unrelated noise to Timeline recordings of your application. You can do one of the following:
    * Open a Chrome window in [incognito mode](http://support.google.com/chrome/bin/answer.py?hl=en&answer=95464)
    * Create a new [Chrome user profile](http://support.google.com/chrome/bin/answer.py?hl=en&answer=142059) for testing.

## Analyzing Timeline recordings ##

This section provides tips for analyzing Timeline recordings.

### Viewing details about a record ###

When you select a record in the Timeline, the Details pane displays additional information about the event.

![](timeline-images/frames_mode_event_selected.png)

Certain details are present in events of all types, such as Duration and CPU Time, while some only apply to certain event types. For information on what details each kind of record contains, see the [Timeline event reference](#timeline-event-reference).

When you select a Paint record, DevTools highlights the region of the screen that was updated with a blue semi-transparent rectangle, as shown below.

![](timeline-images/paint-hover.png)


### DOMContentLoaded and Load event markers ###

The Timeline annotates each recording with a blue and a red line that indicate, respectively, when the [DOMContentLoaded](http://docs.webplatform.org/wiki/dom/events/DOMContentLoaded) and [load](http://docs.webplatform.org/wiki/dom/events/load) events were dispatched by the browser. The DOMContentLoaded event is fired when all of the page’s DOM content has been loaded and parsed. The load event is fired once all of the document’s resources (images and CSS files, and so forth) have been fully loaded.

![](timeline-images/event_markers.png)

### Locating forced synchronous layouts

Layout is the process by which Chrome calculates the positions and sizes of all the elements on the page. Normally, Chrome performs layouts "lazily" in response to CSS or DOM updates from your application. This allows Chrome to batch style and layout changes rather than reacting to each on demand. However, an application can force Chrome to perform a layout immediately and synchronously by querying the value of certain layout-dependent element properties such as `element.offsetWidth`. These so called "forced synchronous layouts" can be a big performance bottleneck if repeated frequently or performed for large DOM tree.

The Timeline identifies when your application causes a forced asynchronous layout and marks such records with yellow warning icon (![](timeline-images/image25.png)). When you select the record, the details pane contains a stack trace of the offending code.

![](timeline-images/forced_layout.png)

If a record contains a [child record](#about-nested-events) that forced a layout, the parent record is marked with a slightly dimmed yellow icon. Expand the parent record to locate the child record that caused the forced layout.


<p class="note">See the <a href="demos/too-much-layout/index.html">Forced Synchronous Layout demo</a> for a demonstration
of detecting and fixing these kinds of performance issues.</p>


### About nested events ###

Events in Timeline recordings sometimes are nested visually beneath another event. You expand the "parent" event to view its nested "child" events. There are two reasons why the Timeline nests events:

*  Synchronous events that occurred during the processing of an event that occurred previously. Each event internally generates two atomic events, one for the start and one for the end, that are converted to a single "continuous" event. Any other events that occur between these two atomic events become children of the outer event.

The following screenshot shows an example of nested synchronous events. In this case, Chrome was parsing some HTML (the Parse HTML event) when it found several external resources that needed to be loaded. Those requests were made before Chrome has finished the parsing, so the Send Request events are displayed as children of the Parse HTML event.

![](timeline-images/sync_events.png)


#### Coloring of Timeline records with nested events

Timeline bars are color coded as follows:

*  The **first, darkest part** of the bar represents how long the parent event and all of its _synchronous_ children took.
*  The **next, slightly paler color** represents the CPU time that the event and all its _asynchronous_ children took.
*  The **palest bars** represent the time from the start of first asynchronous event to the end of last of its asynchronous children.

![](timeline-images/image16.png)

Selecting a parent record will display the following in the Details pane:

*  **Event type summary** in text and visualized in a pie chart.
*  **Used JS Heap size** at this point in the recording, and what this operation's effect was to the heap size.
*  **Other details** relevant to the event.

![](timeline-images/parent_record.png)

### Filtering and searching records ###

You can filter the records shown according to their type (only show loading events, for example), or only show records longer or equal to 1 millisecond or 15 milliseconds. You can also filter the view to show events that match a string.

![](timeline-images/filters.png)

While looking at all the events, you may want to hunt for one, but maintain context of what's around it. In this case, you can find without filtering. Press Ctrl+F (Window/Linux) or Cmd+F (Mac), while the Timeline has focus to show those that contain the search term.


### Zooming in on a Timeline section ###

To make analyzing records easier, you can “zoom in” on a section of the timeline overview, which reduces accordingly the time scale in the Records view.

![](timeline-images/image03.png)

To zoom in on a Timeline section, do one of the following:

* In the overview region, drag out a Timeline selection with your mouse.
* Adjust the gray sliders in the ruler area.

Here are some more tips for working with Timeline selections:

*  "Scrub" the recording with the current selection by dragging the area between the two slider bars. ![](timeline-images/image26.png)
*  Trackpad users:

    *  Swiping left or right with two fingers moves the current Timeline selection.
    *  Swiping up or down with two fingers expands or contracts the current Timeline selection, respectively.

*  Scrolling the mouse wheel up or down while hovering over a Timeline selection expands and contracts the selection, respectively.

### Saving and loading recordings ###

You can save a Timeline recording as a JSON file, and later open it in the Timeline.

**To save a Timeline recording:**

1.  Right+click or Ctrl+click (Mac only) inside the Timeline and select **Save Timeline Data…**, or press the Ctrl+S keyboard shorcut.
2. Pick a location to save the file and click Save.

**To open an existing Timeline recording file, do one of the following**:

1. Right-click or Ctrl+click inside the Timeline and select **Load Timeline Data...**, or press the Ctrl+O keyboard shortcut.
2. Locate the JSON file and click Open.

![](timeline-images/image14.png)

### User-produced Timeline events ###

Applications can add their own events to Timeline recordings. You can use the
[console.timeStamp()](console-api.md#consoletimestamplabel) method to add an atomic event to a recording, or the
[console.time()](console-api.md#consoletimelabel) and
[console.timeEnd()](console-api.md#consoletimeendlabel) methods
to mark a range of time that code was executing. For example, in the following recording the `console.timeStamp()` was used to display an "Adding result" event. See [Marking the Timeline](console.md#marking-the-timeline) in [Using the Console](console.md) for more information.


![](timeline-images/adding-result.png)


### View CPU time in recordings ###

You will see light gray bars appearing above the Timeline records, indicating when the CPU was busy. Hovering over a CPU bar highlights the Timeline region during which the CPU was active (as shown below). The length of a CPU bar is typically the sum of all the (highlighted) events below it in the Timeline. If these don't match, it may be due to one of the following:

* Other pages running on the same threads as the page being inspected (for example, two tabs open from the same site, with one site doing something in a `setTimeout()` call).
* Un-instrumented activity.

![](timeline-images/image24.png)

## Timeline event reference ##

<style>
    .property-table tr th:nth-child(1){
        width: 20%;
    }
    .property-table tr th:nth-child(2){
        width: 60%;
    }
</style>

This section lists and describes the individual types of records that are generated during a recording, organized by type, and their properties.

### Common event properties ###

Certain details are present in events of all types, while some only apply to certain event types. This section lists properties common to different event types. Properties specific to certain event types are listed in the references for those event types that follow.

Aggregated time
:   For events with <a href="#about-nested-events">nested events</a>, the time taken by each category of events.

Call Stack
:   For events with <a href="#about-nested-events">child events</a>, the time taken by each category of events.

CPU time
:   How much CPU time the recorded event took.

Details
:   Other details about the event.

Duration (at time-stamp)
:   How long it took the event with all of its children to complete; <em>timestamp</em> is the time at which the event occurred, relative to when the recording started.

Self time
:   How long the event took without any of its children.

Used Heap Size
:   Amount of memory being used by the application when the event was recorded, and the delta (+/-) change in used heap size since the last sampling.

### Loading events ###

This section lists events that belong to Loading category and their properties.

<table class="property-table">
    <tr>
        <th>Event</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>Parse HTML</td>
        <td>Chrome executed its HTML parsing algorithm.</td>
    </tr>
    <tr>
        <td>Finish Loading</td>
        <td>A network request completed.</td>
    </tr>
    <tr>
        <td>Receive Data</td>
        <td>Data for a request was received. There will be one or more Receive Data events.</td>
    </tr>
    <tr>
        <td>Receive Response</td>
        <td>The initial HTTP response from a request.</td>
    </tr>
    <tr>
        <td>Send Request</td>
        <td>A network request has been sent.</td>
    </tr>
</table>

#### Loading event properties ####

Resource
:   The URL of the requested resource.

Preview
:   Preview of the requested resource (images only).

Request Method
:   HTTP method used for the request (GET or POST, for example).

Status Code
:   HTTP response code

MIME Type
:   MIME type of the requested resource.

Encoded Data Length
:   Length of requested resource in bytes.

### Scripting events ###

This section lists events that belong to the Scripting category and their properties.

<table class="property-table">
    <tr>
        <th>Event</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>Animation Frame Fired</td>
        <td>A scheduled animation frame fired, and its callback handler invoked.</td>
    </tr>
    <tr>
        <td>Cancel Animation Frame</td>
        <td>A scheduled animation frame was canceled.</td>
    </tr>
    <tr>
        <td>GC Event</td>
        <td>Garbage collection occurred.</td>
    </tr>
    <tr>
        <td>DOMContentLoaded</td>
        <td>The <a href="http://docs.webplatform.org/wiki/dom/events/DOMContentLoaded">DOMContentLoaded</a> was fired by the browser. This event is fired when all of the page’s DOM content has been loaded and parsed.</td>
    </tr>
    <tr>
        <td>Evaluate Script</td>
        <td>A script was evaluated.</td>
    </tr>
    <tr>
        <td>Event</td>
        <td>A JavaScript event ("mousedown", or "key", for example).</td>
    </tr>
    <tr>
        <td>Function Call</td>
        <td>A top-level JavaScript function call was made (only appears when browser enters JavaScript engine).</td>
    </tr>
    <tr>
        <td>Install Timer</td>
        <td>A timer was created with <a href="http://docs.webplatform.org/wiki/dom/methods/setInterval">setInterval()</a> or <a href="http://docs.webplatform.org/wiki/dom/methods/setTimeout">setTimeout()</a>.</td>
    </tr>
    <tr>
        <td>Request Animation Frame</td>
        <td>A requestAnimationFrame() call scheduled a new frame</td>
    </tr>
    <tr>
        <td>Remove Timer</td>
        <td>A previously created timer was cleared.</td>
    </tr>
    <tr>
        <td>Time</td>
        <td>A script called <a href="console-api.md#consoletimelabel">console.time()</a></td>
    </tr>
    <tr>
        <td>Time End</td>
        <td>A script called
<a href="console-api.md#consoletimeendlabel">console.timeEnd()</a></td>
    </tr>
    <tr>
        <td>Timer Fired</td>
        <td>A timer fired that was scheduled with setInterval() or setTimeout().</td>
    </tr>
    <tr>
        <td>XHR Ready State Change</td>
        <td>The ready state of an XMLHTTPRequest changed.</td>
    </tr>
    <tr>
        <td>XHR Load</td>
        <td>An XMLHTTPRequest finished loading.</td>
    </tr>
</table>

#### Scripting event properties ####

Timer ID
:   The timer ID.

Timeout
:   The timeout specified by the timer.

Repeats
:   Boolean that specifies if the timer repeats.

Function Call
:   A function that was invoked.


### Rendering events ###

This section lists events that belong to Rendering category and their properties.

<table class="property-table">
    <tr>
        <th>Event</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>Invalidate layout</td>
        <td>The page layout was invalidated by a DOM change.</td>
    </tr>
    <tr>
        <td>Layout</td>
        <td>A page layout was executed.</td>
    </tr>
    <tr>
        <td>Recalculate style</td>
        <td>Chrome recalculated element styles.</td>
    </tr>
    <tr>
        <td>Scroll</td>
        <td>The content of nested view was scrolled.</td>
    </tr>
</table>

#### Rendering event properties ####

Layout invalidated
:   For Layout records, the stack trace of the code that caused the layout to be invalidated.

Nodes that need layout
:   For Layout records, the number of nodes that were marked as needing layout before the relayout started. These are normally those nodes that were invalidated by developer code, plus a path upward to relayout root.

Layout tree size
:   For Layout records, the total number of nodes under the relayout root (the node that Chrome starts the relayout).

Layout scope
:   Possible values are "Partial" (the re-layout boundary is a portion of the DOM) or "Whole document".

Elements affected
:   For Recalculate style records, the number of elements affected by a style recalculation.

Styles invalidated
:   For Recalculate style records, provides the stack trace of the code that caused the style invalidation.

### Painting events ###

This section lists events that belong to Painting category and their properties.

<table class="property-table">
    <tr>
        <th>Event</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>Composite Layers</td>
        <td>Chrome's rendering engine composited image layers.</td>
    </tr>
    <tr>
        <td>Image Decode</td>
        <td>An image resource was decoded.</td>
    </tr>
    <tr>
        <td>Image Resize</td>
        <td>An image was resized from its native dimensions.</td>
    </tr>
    <tr>
        <td>Paint</td>
        <td>Composited layers were painted to a region of the display. Hovering over a Paint record highlights the region of the display that was updated.</td>
    </tr>
</table>

#### Painting event properties ####

Location
:   For Paint events, the x and y coordinates of the paint rectangle.

Dimensions
:   For Paint events, the height and width of the painted region.

{{/partials.standard_devtools_article}}
