# Chrome DevTool Docs Contribution Guide

The DevTools community welcomes any contributions or bug-fixes.
Before submitting a pull request, please open a new issue to let us know what you are working on.
This will allow others to provide feedback as well as coordinate contribution efforts.

## Which branch?

Submit all requests against the master branch unless instructed to do otherwise.

## Language Style

A few guidelines to follow when writing are:
* Avoid the use of "we" (and alike.)
* Active voice is preferred over passive voice.
* Try to have text content self-standing. Images should be used as an enhancement of the content instead of a requirement for understanding.
* Be as concise as possible.

## Repository Structure

<dl>
  <dt>docs</dt>
  <dd> Contains all the working files. Each document page has its own HTML file. If a page has files specific to its content, then a resources folder exists for that page.</dd>

  <dt> index.html</dt>
  <dd> Contains the project <a href="https://developer.chrome.com/devtools/index">overview</a> page.</dd>

  <dt> images</dt>
  <dd> Contains images for index.html and minor images used within the documents.</dd>

  <dt> docs/redirects.json</dt>
  <dd> Contains redirects from one location to another.</dd>
</dl>


## Tips

When making a big change to the documentation, please write your draft in a Google Doc and make it open for public commenting.
It is easier to provide feedback and to find errors in a doc rather than a web page.
Once someone has given a LGTM (looks good to me) response then you are safe to code up the change and submit a pull request.

Small changes can go in as a pull request directly.

## Images

* [contributing-images.md](contributing-images.md) details our policy for images and callout style.


## Tools

Spellchecker, built into just about every document editor.

[Hemingway](http://www.hemingwayapp.com/) will run an analysis on the given text and point out possible grammatical issues.
* Do not have any hard to read sentences.
* Have as few adverbs as possible.
* Use the simplest words.

For image compression the following tools are available
* [ImageOptim](https://imageoptim.com/) on a Mac.
* [PNGGauntlet](http://pnggauntlet.com/) on Windows
* [Trimage](http://trimage.org/) on Linux distrobutions

## Running the site

1. In the root of the project, start a [server](https://github.com/paulirish/dotfiles/blob/3fa2e7dc1f1ea5eaf7f6a2531b937ff8bd8833f9/.functions#L25-L32).
  * It's easier if your server can also do a directory listing.
1. Open [http://localhost:8000/docs/_preview.html](http://localhost:8000/docs/_preview.html)
1. You will see the boilerplate along with a directory listing ![image](https://cloud.githubusercontent.com/assets/39191/3017501/7e6985da-df7a-11e3-9a7c-51f964906839.png)
1. Click one of them.
1. It should bring you to a url like [http://localhost:8000/docs/_preview.html?settings.html](http://localhost:8000/docs/_preview.html?settings.html)
  * you can navigate to this directly if you like
  * it looks like this ![image](https://cloud.githubusercontent.com/assets/39191/3017506/831921a8-df7a-11e3-8faa-8dc957057248.png)
  * Things mostly work but is not exactly the same as viewing the production site.
    * In production the site is rendered via ["docserver"](https://code.google.com/p/chromium/codesearch#chromium/src/chrome/common/extensions/docs/server2/&q=file:docs/server2&sq=package:chromium). Markdown is parsed via the [python-markdown library](https://pythonhosted.org/Markdown/reference.html).
