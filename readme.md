# The Chrome DevTools documentation

This is the source of the official [DevTools documentation](http://developers.google.com/chrome-developer-tools/).



## Contributing

We regularly update the docs and welcome any contributions or bug-fixes.

Before submitting a pull request, please open a [new issue](https://github.com/GoogleChrome/devtools-docs/issues/new) to let us know you're working on.

This will allow us to provide feedback and coordinate contribution efforts.

FYI The extension docs live in the chromium repo: `chromium/src/chrome/common/extensions/docs`

### Orientation

<dl>
  <dt> ./docs </dt>
  <dd> Contains all the working files. </dd>

  <dt> ./index.html </dt>
  <dd> Contains the project <a href="https://developers.google.com/chrome-developer-tools/">overview</a> page. </dd>

  <dt> ./images </dt>
  <dd> Contains images for index.html. </dd>

  <dt> ./_book.yaml </dt>
  <dd> Contains the titles and paths of individual docs. </dd>

  <dt> ./_redirect.yaml </dt>
  <dd> Contains redirects from one location to another. </dd>

</dl>

### Additional DevTools docs

Covered in the [DevTools Content Inventory](https://github.com/GoogleChrome/devtools-docs/wiki/Content-Inventory)

### Running the site

1. In the root of the project, start a [server] (https://github.com/paulirish/dotfiles/blob/3fa2e7dc1f1ea5eaf7f6a2531b937ff8bd8833f9/.functions#L25-L32).
  * It's easier if your server can also do a directory listing.
1. Open [http://localhost:8000/docs/_preview.html](http://localhost:8000/docs/_preview.html)
1. You will see the boilerplate along with a directory listing
![image](https://f.cloud.github.com/assets/39191/700223/d42cb838-dd3d-11e2-8bf3-af57e883cd80.png)
1. Click one of them.
1. It should bring you to a url like [http://localhost:8000/docs/_preview.html?settings.html](http://localhost:8000/docs/_preview.html?settings.html)
  * you can navigate to this directly if you like
  * it looks like this ![image](https://f.cloud.github.com/assets/39191/700211/6b936d08-dd3d-11e2-8d4b-19db48d65c56.png)
* Things mostly work.

### Deployment

Paul or Addy does the work of pushing this stuff live.

* check last commit in google3 via `git log`, get the SHA
* pull in latest from GH
* g4 add/edit changed things
  * look for changed items by `find . -type f -perm 0640`
  * compare URL from last commit to master: `github.com/GoogleChrome/devtools-docs/compare/<SHA>...master`, Files Changed, Show Diff Stats
* check git status and p4 status
* g4 change, imgsquish, g4 mail
* commit any changed images back to GH

#### Troublshooting
* Make sure you've created CLs with any imported GH changes. 
* `devsite publish` all relevant files.

## License

Except as otherwise noted, the content of the DevTools documentation is licensed under the [Creative Commons Attribution 3.0 License](http://creativecommons.org/licenses/by/3.0/), and code samples are licensed under the [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).
